// Package main 启动库存服务。
//
// 库存服务负责：库存查询、预占、释放、扣减、调整与库存流水，
// 并通过事件订阅订单生命周期自动维护库存。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/inventory"
	"github.com/shopstack/platform/backend/internal/logger"
)

func main() {
	err := bootstrap.Run("inventory-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&inventory.Inventory{},
			&inventory.InventoryLog{},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := inventory.NewService(inventory.NewRepo(app.DB), app.MQ)
			inventory.SetGlobalService(service)

			inventoryv1.RegisterInventoryServiceServer(srv, inventory.NewHandler(service))

			logger.L().Info("库存服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("库存服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
