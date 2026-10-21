// Package main 启动物流服务。
//
// 物流服务负责：发货单、物流轨迹与运费模板。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/logistics"
)

func main() {
	holder := &logistics.ServiceHolder{}

	err := bootstrap.Run("logistics-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&logistics.Shipment{},
			&logistics.ShipmentTrack{},
			&logistics.LogisticTemplate{},
		},
		Consumers: logistics.Consumers("shopstack", holder),
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := logistics.NewService(logistics.NewRepo(app.DB))
			holder.Set(service)
			handler := logistics.NewHandler(service)

			logisticsv1.RegisterLogisticsServiceServer(srv, handler)

			logger.L().Info("物流服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("物流服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
