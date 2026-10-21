// Package main 启动通知服务。
//
// 通知服务负责：站内通知、短信验证码与操作审计日志查询。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/notification"
)

func main() {
	holder := &notification.ServiceHolder{}

	err := bootstrap.Run("notification-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&notification.Notification{},
			&notification.SmsRecord{},
			&notification.AuditLog{},
		},
		Consumers: notification.Consumers("shopstack", holder),
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			service := notification.NewService(notification.NewRepo(app.DB), app.Providers, app.Cache)
			holder.Set(service)
			handler := notification.NewHandler(service)

			notificationv1.RegisterNotificationServiceServer(srv, handler)

			logger.L().Info("通知服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("通知服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
