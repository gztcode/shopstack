// Package main 启动支付服务。
//
// 支付服务负责：创建支付单、接收支付回调、发起退款与支付统计，
// 并通过事件把支付结果通知给订单服务。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/payment"
)

func main() {
	err := bootstrap.Run("payment-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&payment.Payment{},
			&payment.PaymentRefund{},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := payment.NewService(payment.NewRepo(app.DB), app.Registry, app.Providers, app.MQ)
			paymentv1.RegisterPaymentServiceServer(srv, payment.NewHandler(service))

			logger.L().Info("支付服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("支付服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
