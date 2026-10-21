package marketing

import (
	"context"

	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
)

// ServiceHolder 持有服务实例，供事件回调在服务就绪后获取。
//
// bootstrap 会先建立消息订阅再执行 Setup，因此事件回调可能早于服务实例创建，
// 这里用持有者传递实例，避免使用全局变量。
type ServiceHolder struct {
	svc *Service
}

// Set 注册服务实例。
func (h *ServiceHolder) Set(s *Service) { h.svc = s }

// Get 返回服务实例，服务未就绪时返回 nil。
func (h *ServiceHolder) Get() *Service { return h.svc }

// Consumers 返回营销服务订阅的事件。
func Consumers(queueName string, holder *ServiceHolder) []mq.Consumer {
	return []mq.Consumer{
		{
			Queue:      queueName + ".marketing." + mq.EventOrderPaid,
			RoutingKey: mq.EventOrderPaid,
			Handler: func(ctx context.Context, event *mq.Event) error {
				service := holder.Get()
				if service == nil {
					return errs.New(errs.CodeUnavailable, "营销服务尚未就绪")
				}
				return handleOrderPaid(ctx, event, service)
			},
		},
	}
}

// handleOrderPaid 处理支付成功事件：核销用户优惠券。
func handleOrderPaid(ctx context.Context, event *mq.Event, service *Service) error {
	orderID := payloadInt64(event, "order_id")
	userID := payloadInt64(event, "user_id")
	if userID == 0 {
		return nil
	}

	couponID := payloadInt64(event, "coupon_id")
	if couponID > 0 {
		if err := service.repo.MarkUserCouponUsed(ctx, uint64(userID), uint64(couponID), uint64(orderID)); err != nil {
			return err
		}
		logger.L().Info("已核销用户优惠券",
			zap.Int64("用户ID", userID), zap.Int64("订单ID", orderID), zap.Int64("优惠券ID", couponID))
		return nil
	}

	// 事件未携带优惠券 ID 时，核销该用户全部未使用的优惠券
	list, _, err := service.repo.ListUserCoupons(ctx, uint64(userID), UserCouponStatusUnused, 1, 100)
	if err != nil {
		return err
	}
	for i := range list {
		if err := service.repo.MarkUserCouponUsed(ctx, list[i].UserID, list[i].CouponID, uint64(orderID)); err != nil {
			return err
		}
	}
	if len(list) > 0 {
		logger.L().Info("已核销用户优惠券",
			zap.Int64("用户ID", userID), zap.Int64("订单ID", orderID), zap.Int("数量", len(list)))
	}
	return nil
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
