// Package main 启动购物车服务。
//
// 购物车服务负责：加购、改数量、选中状态、删除与清空，
// 并在展示时聚合商品服务的实时价格与库存。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/cart"
	"github.com/shopstack/platform/backend/internal/logger"
)

func main() {
	err := bootstrap.Run("cart-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&cart.CartItem{},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := cart.NewService(cart.NewRepo(app.DB), app.Registry)
			cartv1.RegisterCartServiceServer(srv, cart.NewHandler(service))

			logger.L().Info("购物车服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("购物车服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
