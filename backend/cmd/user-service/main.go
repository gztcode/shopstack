// Package main 启动用户服务。
//
// 用户服务负责：用户注册登录、微信登录、收货地址、收藏，
// 以及后台管理员账号、角色权限与经营看板的用户侧统计。
package main

import (
	"context"
	"os"

	"go.uber.org/zap"
	"google.golang.org/grpc"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/bootstrap"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/user"
)

func main() {
	err := bootstrap.Run("user-service", bootstrap.Options{
		AutoMigrate:            true,
		AllowMissingMiddleware: true,
		Models: []any{
			&user.User{},
			&user.UserAddress{},
			&user.UserFavorite{},
			&user.Admin{},
			&user.Role{},
			&user.Permission{},
			&user.AdminRole{},
			&user.RolePermission{},
			&user.PointsLog{},
			&user.Invoice{},
		},
		Setup: func(ctx context.Context, app *bootstrap.App, srv *grpc.Server) error {
			repo := user.NewRepo(app.DB)
			service := user.NewService(repo, app.Auth, app.Providers, app.Registry)
			userv1.RegisterUserServiceServer(srv, user.NewUserHandler(service))
			userv1.RegisterAdminServiceServer(srv, user.NewAdminHandler(service))

			logger.L().Info("用户服务初始化完成")
			return nil
		},
	})
	if err != nil {
		logger.L().Error("用户服务启动失败", zap.Error(err))
		os.Exit(1)
	}
}
