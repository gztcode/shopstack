package notification

import (
	"context"
	"fmt"

	"go.uber.org/zap"

	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
)

// ServiceHolder 持有服务实例，供事件回调在服务就绪后获取。
type ServiceHolder struct {
	svc *Service
}

// Set 注册服务实例。
func (h *ServiceHolder) Set(s *Service) { h.svc = s }

// Get 返回服务实例，服务未就绪时返回 nil。
func (h *ServiceHolder) Get() *Service { return h.svc }

// Consumers 返回通知服务订阅的事件。
//
// 每类事件使用独立队列：同一队列上的多个消费者会轮询消费消息，
// 无法保证消息按 routing key 投递给对应的事件处理器。
func Consumers(queueName string, holder *ServiceHolder) []mq.Consumer {
	handle := func(fn func(ctx context.Context, event *mq.Event, service *Service) error) mq.Handler {
		return func(ctx context.Context, event *mq.Event) error {
			service := holder.Get()
			if service == nil {
				return errs.New(errs.CodeUnavailable, "通知服务尚未就绪")
			}
			return fn(ctx, event, service)
		}
	}

	return []mq.Consumer{
		{
			Queue:      eventQueue(queueName, mq.EventOrderCreated),
			RoutingKey: mq.EventOrderCreated,
			Handler:    handle(handleOrderCreated),
		},
		{
			Queue:      eventQueue(queueName, mq.EventOrderPaid),
			RoutingKey: mq.EventOrderPaid,
			Handler:    handle(handleOrderPaid),
		},
		{
			Queue:      eventQueue(queueName, mq.EventOrderCancelled),
			RoutingKey: mq.EventOrderCancelled,
			Handler:    handle(handleOrderCancelled),
		},
		{
			Queue:      eventQueue(queueName, mq.EventLogisticsUpdate),
			RoutingKey: mq.EventLogisticsUpdate,
			Handler:    handle(handleLogisticsUpdate),
		},
		{
			Queue:      eventQueue(queueName, mq.EventUserRegistered),
			RoutingKey: mq.EventUserRegistered,
			Handler:    handle(handleUserRegistered),
		},
	}
}

// eventQueue 按事件类型生成独立队列名。
func eventQueue(queueName, routingKey string) string {
	return queueName + ".notification." + routingKey
}

// handleOrderCreated 处理订单创建事件：发送下单成功通知。
func handleOrderCreated(ctx context.Context, event *mq.Event, service *Service) error {
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}
	orderID := payloadInt64(event, "order_id")
	orderNo := payloadString(event, "order_no")
	if orderNo == "" {
		orderNo = fmt.Sprintf("#%d", orderID)
	}
	_, err := service.Send(ctx, notificationRequest(
		NotificationTypeOrder, userID, "订单创建成功",
		fmt.Sprintf("您的订单 %s 已创建成功，请尽快完成支付。", orderNo), orderID))
	return err
}

// handleOrderPaid 处理支付成功事件：发送支付成功通知。
func handleOrderPaid(ctx context.Context, event *mq.Event, service *Service) error {
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}
	orderID := payloadInt64(event, "order_id")
	orderNo := payloadString(event, "order_no")
	if orderNo == "" {
		orderNo = fmt.Sprintf("#%d", orderID)
	}
	_, err := service.Send(ctx, notificationRequest(
		NotificationTypeOrder, userID, "支付成功",
		fmt.Sprintf("您的订单 %s 已支付成功，商家将尽快为您发货。", orderNo), orderID))
	return err
}

// handleOrderCancelled 处理订单取消事件：发送订单取消通知。
func handleOrderCancelled(ctx context.Context, event *mq.Event, service *Service) error {
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}
	orderID := payloadInt64(event, "order_id")
	orderNo := payloadString(event, "order_no")
	if orderNo == "" {
		orderNo = fmt.Sprintf("#%d", orderID)
	}
	reason := payloadString(event, "reason")
	content := fmt.Sprintf("您的订单 %s 已取消。", orderNo)
	if reason != "" {
		content = fmt.Sprintf("您的订单 %s 已取消，原因：%s。", orderNo, reason)
	}
	_, err := service.Send(ctx, notificationRequest(
		NotificationTypeOrder, userID, "订单已取消", content, orderID))
	return err
}

// handleLogisticsUpdate 处理物流更新事件：发送物流通知。
func handleLogisticsUpdate(ctx context.Context, event *mq.Event, service *Service) error {
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}
	orderID := payloadInt64(event, "order_id")
	description := payloadString(event, "description")
	if description == "" {
		description = "您的包裹物流状态已更新。"
	}
	title := payloadString(event, "title")
	if title == "" {
		title = "物流更新"
	}
	_, err := service.Send(ctx, notificationRequest(
		NotificationTypeLogistics, userID, title, description, orderID))
	return err
}

// handleUserRegistered 处理用户注册事件：校验注册验证码并发送欢迎通知。
func handleUserRegistered(ctx context.Context, event *mq.Event, service *Service) error {
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}

	// 注册事件携带短信验证码时，先完成验证码校验
	if code := payloadString(event, "sms_code"); code != "" {
		phone := payloadString(event, "phone")
		ok, msg := service.VerifySmsCode(phone, "register", code)
		if !ok {
			logger.L().Warn("注册短信验证码校验失败",
				zap.Int64("用户ID", userID), zap.String("原因", msg))
		} else {
			logger.L().Info("注册短信验证码校验通过", zap.Int64("用户ID", userID))
		}
	}

	_, err := service.Send(ctx, notificationRequest(
		NotificationTypeSystem, userID, "欢迎加入",
		"欢迎加入 ShopStack，商城新人优惠券已发放，快去查看吧。", 0))
	return err
}

// notificationRequest 构造站内通知请求。
func notificationRequest(nt int8, userID int64, title, content string, bizID int64) *notificationv1.SendNotificationRequest {
	return &notificationv1.SendNotificationRequest{
		UserId:  userID,
		Type:    int32(nt),
		Title:   title,
		Content: content,
		BizId:   bizID,
	}
}

// payloadInt64 读取事件负载中的整型字段。
func payloadInt64(event *mq.Event, key string) int64 {
	if event == nil || event.Payload == nil {
		return 0
	}
	switch v := event.Payload[key].(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	}
	return 0
}

// payloadString 读取事件负载中的字符串字段。
func payloadString(event *mq.Event, key string) string {
	if event == nil || event.Payload == nil {
		return ""
	}
	switch v := event.Payload[key].(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%.0f", v)
	case int64:
		return fmt.Sprintf("%d", v)
	}
	return ""
}
