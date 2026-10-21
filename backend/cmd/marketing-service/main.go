// Package main 启动营销服务。
//
// 营销服务负责：优惠券、促销活动、结算试算（运费 / 优惠券 / 积分抵扣）。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/marketing"
)

func main() {
	holder := &marketing.ServiceHolder{}

	err := bootstrap.Run("marketing-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&marketing.Coupon{},
			&marketing.UserCoupon{},
			&marketing.Promotion{},
		},
		Consumers: marketing.Consumers("shopstack", holder),
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := marketing.NewService(marketing.NewRepo(app.DB))
			holder.Set(service)
			handler := marketing.NewHandler(service)

			marketingv1.RegisterMarketingServiceServer(srv, handler)

			logger.L().Info("营销服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("营销服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
