package logistics

import (
	"context"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

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

// Consumers 返回物流服务订阅的事件。
func Consumers(queueName string, holder *ServiceHolder) []mq.Consumer {
	return []mq.Consumer{
		{
			Queue:      queueName + ".logistics." + mq.EventOrderCancelled,
			RoutingKey: mq.EventOrderCancelled,
			Handler: func(ctx context.Context, event *mq.Event) error {
				service := holder.Get()
				if service == nil {
					return errs.New(errs.CodeUnavailable, "物流服务尚未就绪")
				}
				return handleOrderCancelled(ctx, event, service)
			},
		},
	}
}

// handleOrderCancelled 处理订单取消事件：已发货的订单记为物流异常。
func handleOrderCancelled(ctx context.Context, event *mq.Event, service *Service) error {
	orderID := payloadInt64(event, "order_id")
	if orderID == 0 {
		return nil
	}

	shipment, err := service.repo.FindShipmentByOrderID(ctx, uint64(orderID))
	if err != nil {
		return err
	}
	if shipment == nil {
		return nil
	}
	if shipment.Status != ShipmentStatusShipped {
		// 未发货的订单取消不需要记录物流异常
		return nil
	}

	now := time.Now()
	err = service.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Shipment{}).Where("id = ?", shipment.ID).
			Update("status", ShipmentStatusException).Error; err != nil {
			return err
		}
		sort, err := service.repo.NextTrackSort(ctx, shipment.ID)
		if err != nil {
			return err
		}
		return tx.Create(&ShipmentTrack{
			ShipmentID:  shipment.ID,
			TrackingNo:  shipment.TrackingNo,
			Location:    "中转站",
			Description: "订单已取消，物流异常",
			OccurredAt:  now,
			Sort:        sort,
		}).Error
	})
	if err != nil {
		return err
	}

	logger.L().Warn("订单取消，发货单记为异常",
		zap.Int64("订单ID", orderID), zap.Int64("发货单ID", int64(shipment.ID)))
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
