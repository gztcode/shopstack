// Package main 启动商品服务。
//
// 商品服务负责：商品（SPU/SKU）维护、分类树、轮播位与用户评价。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/product"
)

func main() {
	err := bootstrap.Run("product-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&product.Category{},
			&product.Product{},
			&product.ProductSku{},
			&product.ProductImage{},
			&product.ProductAttribute{},
			&product.Banner{},
			&product.Review{},
			&product.Material{},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := product.NewService(product.NewRepo(app.DB), app.MQ)
			handler := product.NewHandler(service)

			productv1.RegisterProductServiceServer(srv, handler)
			productv1.RegisterCategoryServiceServer(srv, handler)
			productv1.RegisterReviewServiceServer(srv, handler)

			logger.L().Info("商品服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("商品服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
