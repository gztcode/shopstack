package order

import (
	"context"
	"strconv"

	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
)

// globalService 供事件回调使用的服务实例。
var globalService *Service

// SetGlobalService 注册事件回调使用的服务实例。
func SetGlobalService(s *Service) { globalService = s }

// HandlePaymentSuccess 处理支付成功事件：把订单标记为已支付。
//
// 支付服务在收到支付回调后发布该事件，订单服务据此完成状态流转，
// 并进一步发布 order.paid 事件驱动库存扣减与用户通知。
func HandlePaymentSuccess(ctx context.Context, event *mq.Event) error {
	if globalService == nil {
		return nil
	}

	orderID := eventInt64(event, "order_id")
	if orderID == 0 {
		orderNo, _ := event.Payload["order_no"].(string)
		if orderNo == "" {
			return nil
		}
		repo := globalService.repo
		order, err := repo.FindOrderByNo(ctx, orderNo)
		if err != nil {
			logger.L().Warn("按订单号定位订单失败", zap.String("订单号", orderNo), zap.Error(err))
			return nil
		}
		orderID = int64(order.ID)
	}

	transactionID, _ := event.Payload["transaction_id"].(string)
	if err := globalService.MarkPaid(ctx, orderID, transactionID); err != nil {
		logger.L().Error("标记订单已支付失败", zap.Int64("订单ID", orderID), zap.Error(err))
		return err
	}
	return nil
}

func eventInt64(event *mq.Event, key string) int64 {
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
	case string:
		n, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			return n
		}
	}
	return 0
}
