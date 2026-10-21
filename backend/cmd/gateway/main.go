// Package main 启动 ShopStack API 网关。
//
// 网关是整个平台唯一的对外入口，负责：
//   - 路由转发：REST/JSON → gRPC → 各微服务
//   - 统一鉴权：校验 JWT 并把身份透传给下游服务
//   - 统一响应：把结果包装成 {code, message, data, trace_id} 信封
//   - 限流与跨域
package main

import (
	"context"
	"flag"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/config"
	"github.com/shopstack/platform/backend/internal/gateway"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

func main() {
	configPath := flag.String("config", "", "配置文件路径（YAML）")
	flag.Parse()

	cfg, err := config.LoadDefault("gateway")
	if err != nil {
		shoplogger.L().Error("加载配置失败", zap.Error(err))
		os.Exit(1)
	}
	if *configPath != "" {
		cfg, err = config.Load(*configPath)
		if err != nil {
			shoplogger.L().Error("加载配置失败", zap.Error(err))
			os.Exit(1)
		}
	}
	cfg.ServiceName = "api-gateway"

	if err := shoplogger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.Filename); err != nil {
		shoplogger.L().Error("初始化日志失败", zap.Error(err))
		os.Exit(1)
	}
	defer shoplogger.Sync()

	manager := auth.NewManager(
		cfg.JWT.Secret, cfg.JWT.AdminSecret,
		cfg.JWT.AccessExpire, cfg.JWT.RefreshExpire,
		cfg.JWT.AdminAccessExp, cfg.JWT.AdminRefreshExp,
	)

	registry := client.NewRegistry(cfg)
	defer registry.Close()

	gw, err := gateway.New(cfg, registry, manager)
	if err != nil {
		shoplogger.L().Error("初始化网关失败", zap.Error(err))
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              cfg.Server.HTTPAddr,
		Handler:           gw.Handler(manager),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		shoplogger.L().Info("API 网关启动",
			zap.String("地址", cfg.Server.HTTPAddr),
			zap.String("环境", cfg.Env))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		shoplogger.L().Error("网关运行异常", zap.Error(err))
		os.Exit(1)
	case <-quit:
		shoplogger.L().Info("收到退出信号，网关开始优雅停机")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		shoplogger.L().Error("网关停机超时", zap.Error(err))
	}
	shoplogger.L().Info("网关已停止")
}
