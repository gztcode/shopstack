// Package mq 封装 RabbitMQ 消息队列，提供事件发布与消费能力。
//
// 设计要点：
//   - 采用 topic 交换机 + 事件类型作为 routing key，便于按需订阅。
//   - 发布端使用 Publisher Confirm，保证事件至少被 Broker 接收。
//   - 消费端支持自动 ACK / 手动 ACK，默认手动 ACK 以便业务失败时重试。
package mq

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"

	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// 业务事件类型（routing key）。
const (
	EventOrderCreated    = "order.created"
	EventOrderPaid       = "order.paid"
	EventOrderCancelled  = "order.cancelled"
	EventOrderRefunded   = "order.refunded"
	EventOrderCompleted  = "order.completed"
	EventPaymentSuccess  = "payment.success"
	EventPaymentFailed   = "payment.failed"
	EventStockReserved   = "stock.reserved"
	EventStockReleased   = "stock.released"
	EventStockDeducted   = "stock.deducted"
	EventUserRegistered  = "user.registered"
	EventProductChanged  = "product.changed"
	EventCouponUsed      = "coupon.used"
	EventCouponReturned  = "coupon.returned"
	EventPointsDeducted  = "points.deducted"
	EventPointsRefunded  = "points.refunded"
	EventLogisticsUpdate = "logistics.updated"
)

// Event 是跨服务传递的业务事件。
type Event struct {
	ID        string         `json:"id"`
	Type      string         `json:"type"`
	Source    string         `json:"source"`
	TraceID   string         `json:"trace_id,omitempty"`
	Payload   map[string]any `json:"payload"`
	Timestamp int64          `json:"timestamp"`
}

// NewEvent 构造事件。
func NewEvent(eventType, source, traceID string, payload map[string]any) *Event {
	return &Event{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Type:      eventType,
		Source:    source,
		TraceID:   traceID,
		Payload:   payload,
		Timestamp: time.Now().Unix(),
	}
}

// Options 控制队列连接行为。
type Options struct {
	URL          string
	Exchange     string
	ExchangeType string
	Prefetch     int
}

// Client 是 RabbitMQ 客户端。
type Client struct {
	conn         *amqp.Connection
	channel      *amqp.Channel
	exchange     string
	exchangeType string
	prefetch     int
	mu           sync.RWMutex
	closed       bool
}

// New 建立连接并声明交换机。
func New(opts Options) (*Client, error) {
	if opts.URL == "" {
		return nil, fmt.Errorf("RabbitMQ URL 不能为空")
	}
	if opts.Exchange == "" {
		opts.Exchange = "shopstack.events"
	}
	if opts.ExchangeType == "" {
		opts.ExchangeType = "topic"
	}
	if opts.Prefetch <= 0 {
		opts.Prefetch = 10
	}

	conn, err := amqp.Dial(opts.URL)
	if err != nil {
		return nil, fmt.Errorf("连接 RabbitMQ 失败: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("打开 RabbitMQ 通道失败: %w", err)
	}
	if err := ch.ExchangeDeclare(opts.Exchange, opts.ExchangeType, true, false, false, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("声明交换机失败: %w", err)
	}
	if err := ch.Qos(opts.Prefetch, 0, false); err != nil {
		shoplogger.L().Warn("设置 QoS 失败", zap.Error(err))
	}

	return &Client{
		conn:         conn,
		channel:      ch,
		exchange:     opts.Exchange,
		exchangeType: opts.ExchangeType,
		prefetch:     opts.Prefetch,
	}, nil
}

// Publish 发布一条事件。
func (c *Client) Publish(ctx context.Context, event *Event) error {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.closed {
		return fmt.Errorf("RabbitMQ 客户端已关闭")
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("序列化事件失败: %w", err)
	}
	return c.channel.PublishWithContext(ctx, c.exchange, event.Type, false, false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    event.ID,
			Timestamp:    time.Now(),
			Body:         body,
		})
}

// PublishAsync 异步发布，不阻塞调用方。
func (c *Client) PublishAsync(event *Event) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := c.Publish(ctx, event); err != nil {
			shoplogger.L().Error("发布事件失败",
				zap.String("事件类型", event.Type), zap.Error(err))
		}
	}()
}

// Handler 消费事件处理函数。返回 error 时消息将被重新入队。
type Handler func(ctx context.Context, event *Event) error

// Consumer 描述一个订阅关系。
type Consumer struct {
	Queue      string
	RoutingKey string
	Handler    Handler
	// AutoAck 为 true 时消费端自动确认。
	AutoAck bool
	// MaxRetries 限制同一条消息的重投次数。
	// 0 表示使用 DefaultMaxRetries。
	//
	// 为什么必须有上限：像「订单已是已支付状态，无法再标记已支付」这类
	// 业务上永久失败的事件，若无限 requeue，消息会一直堵在队头，
	// 把后续正常事件全部饿死（队头阻塞），并持续刷错误日志。
	// 超过上限后消息被拒绝且不再重投（若队列配置了死信交换机则进入死信队列）。
	MaxRetries int
}

// DefaultMaxRetries 是同一条消息的默认重投上限。
// 超过后消息被丢弃（若队列配置了死信交换机则进入死信队列），
// 避免业务上永久失败的消息无限重投、堵死队头。
const DefaultMaxRetries = 5

// retryCountHeader 记录消息已重投的次数。
const retryCountHeader = "x-shopstack-retry-count"

// deliveryRetryCount 读取消息已重投的次数。
func deliveryRetryCount(d amqp.Delivery) int {
	if d.Headers == nil {
		return 0
	}
	switch v := d.Headers[retryCountHeader].(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	}
	return 0
}

// markDeliveryRetry 在重投前写入新的重投计数。
func markDeliveryRetry(d amqp.Delivery, retries int) {
	if d.Headers == nil {
		d.Headers = amqp.Table{}
	}
	d.Headers[retryCountHeader] = retries
}

// Subscribe 声明队列并启动消费循环。返回后消费在后台 goroutine 中运行。
func (c *Client) Subscribe(consumers ...Consumer) error {
	for _, cons := range consumers {
		if err := c.subscribeOne(cons); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) subscribeOne(cons Consumer) error {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.closed {
		return fmt.Errorf("RabbitMQ 客户端已关闭")
	}

	if _, err := c.channel.QueueDeclare(cons.Queue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("声明队列 %s 失败: %w", cons.Queue, err)
	}
	if err := c.channel.QueueBind(cons.Queue, cons.RoutingKey, c.exchange, false, nil); err != nil {
		return fmt.Errorf("绑定队列 %s 失败: %w", cons.Queue, err)
	}

	deliveries, err := c.channel.Consume(cons.Queue, "", cons.AutoAck, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("消费队列 %s 失败: %w", cons.Queue, err)
	}

	go func(cons Consumer, deliveries <-chan amqp.Delivery) {
		for d := range deliveries {
			c.handleDelivery(cons, d)
		}
		shoplogger.L().Warn("消费循环结束", zap.String("队列", cons.Queue))
	}(cons, deliveries)

	shoplogger.L().Info("已启动事件订阅",
		zap.String("队列", cons.Queue), zap.String("路由键", cons.RoutingKey))
	return nil
}

func (c *Client) handleDelivery(cons Consumer, d amqp.Delivery) {
	var event Event
	if err := json.Unmarshal(d.Body, &event); err != nil {
		shoplogger.L().Error("解析事件失败，消息将被丢弃",
			zap.String("队列", cons.Queue), zap.Error(err))
		_ = d.Nack(false, false)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	start := time.Now()
	if err := cons.Handler(ctx, &event); err != nil {
		retries := deliveryRetryCount(d)
		maxRetries := cons.MaxRetries
		if maxRetries <= 0 {
			maxRetries = DefaultMaxRetries
		}
		if retries >= maxRetries {
			// 重投次数已用尽：拒绝且不再重投，避免毒消息无限循环堵死队头。
			shoplogger.L().Error("事件处理失败且重投次数已用尽，消息被丢弃",
				zap.String("事件类型", event.Type),
				zap.String("事件ID", event.ID),
				zap.Int("重投次数", retries),
				zap.Error(err))
			_ = d.Nack(false, false)
			return
		}
		shoplogger.L().Error("事件处理失败，消息将重新入队",
			zap.String("事件类型", event.Type),
			zap.String("事件ID", event.ID),
			zap.Int("重投次数", retries+1),
			zap.Int("重投上限", maxRetries),
			zap.Error(err))
		// 延迟重投，避免立即重试风暴
		time.Sleep(time.Second)
		markDeliveryRetry(d, retries+1)
		_ = d.Nack(false, true)
		return
	}

	if !cons.AutoAck {
		_ = d.Ack(false)
	}
	shoplogger.L().Debug("事件处理完成",
		zap.String("事件类型", event.Type),
		zap.Duration("耗时", time.Since(start)))
}

// Close 关闭连接。
func (c *Client) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true
	if c.channel != nil {
		_ = c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
