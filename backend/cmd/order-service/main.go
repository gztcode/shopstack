// Package main 启动订单服务。
//
// 订单服务负责：下单、订单查询、状态流转、售后退款与经营统计，
// 并通过事件驱动库存、优惠券与通知等下游能力。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	orderv1 "github.com/shopstack/platform/gen/go/order/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
	"github.com/shopstack/platform/backend/internal/order"
)

func main() {
	err := bootstrap.Run("order-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&order.Order{},
			&order.OrderItem{},
			&order.OrderStatusLog{},
			&order.Refund{},
		},
		Consumers: []mq.Consumer{
			{
				Queue:      "shopstack.order",
				RoutingKey: mq.EventPaymentSuccess,
				Handler:    order.HandlePaymentSuccess,
			},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := order.NewService(order.NewRepo(app.DB), app.Registry, app.MQ)
			order.SetGlobalService(service)

			orderv1.RegisterOrderServiceServer(srv, order.NewHandler(service))

			logger.L().Info("订单服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("订单服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
