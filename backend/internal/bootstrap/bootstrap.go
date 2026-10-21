// Package bootstrap 提供微服务统一的启动流程。
//
// 每个服务的 main.go 只需要描述自己的「组装」逻辑，
// 基础设施（配置、日志、数据库、缓存、消息队列、服务发现、JWT）由本包统一装配，
// 保证所有服务的启动行为、可观测性与优雅停机语义一致。
package bootstrap

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/cache"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/config"
	"github.com/shopstack/platform/backend/internal/database"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
	"github.com/shopstack/platform/backend/internal/server"
	"github.com/shopstack/platform/backend/internal/thirdparty"
)

// App 保存服务运行期依赖。
type App struct {
	Config    *config.Config
	DB        *gorm.DB
	Cache     *cache.Client
	MQ        *mq.Client
	Registry  *client.Registry
	Auth      *auth.Manager
	Providers *thirdparty.Providers
}

// Options 描述服务的个性化装配方式。
type Options struct {
	// AutoMigrate 为 true 时按给定模型自动建表（开发环境便利，生产建议用 SQL 迁移）。
	AutoMigrate bool
	// Models 需要自动迁移的模型。
	Models []any
	// Consumers 声明该服务订阅的事件。
	Consumers []mq.Consumer
	// Setup 在基础设施就绪后执行，用于注册 gRPC 服务与初始化业务对象。
	Setup func(ctx context.Context, app *App, srv *grpc.Server) error
	// AllowMissingMiddleware 允许 Redis / RabbitMQ 暂时不可用（降级运行）。
	AllowMissingMiddleware bool
}

// Run 启动服务并阻塞直到收到退出信号。
func Run(serviceName string, opts Options) error {
	cfg, err := config.LoadDefault(serviceName)
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}
	cfg.ServiceName = serviceName

	if err := logger.Init(cfg.Log.Level, cfg.Log.Format, cfg.Log.Output, cfg.Log.Filename); err != nil {
		return fmt.Errorf("初始化日志失败: %w", err)
	}
	defer logger.Sync()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	app := &App{Config: cfg}
	app.Auth = auth.NewManager(
		cfg.JWT.Secret, cfg.JWT.AdminSecret,
		cfg.JWT.AccessExpire, cfg.JWT.RefreshExpire,
		cfg.JWT.AdminAccessExp, cfg.JWT.AdminRefreshExp,
	)
	app.Providers = thirdparty.NewProviders(cfg)
	app.Registry = client.NewRegistry(cfg)
	defer app.Registry.Close()

	// 数据库
	db, err := database.New(cfg.MySQL.DSN(), database.Options{
		MaxIdle:     cfg.MySQL.MaxIdle,
		MaxOpen:     cfg.MySQL.MaxOpen,
		MaxLifetime: time.Hour,
		LogLevel:    cfg.Log.Level,
		AutoMigrate: opts.AutoMigrate,
		Models:      opts.Models,
	})
	if err != nil {
		return fmt.Errorf("初始化数据库失败: %w", err)
	}
	app.DB = db
	defer func() { _ = database.Close(db) }()

	// Redis
	if redisClient, rErr := cache.New(cache.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
		PoolSize: cfg.Redis.PoolSize,
	}); rErr != nil {
		if !opts.AllowMissingMiddleware {
			return fmt.Errorf("初始化 Redis 失败: %w", rErr)
		}
		logger.L().Warn("Redis 不可用，服务以降级模式运行", zap.Error(rErr))
	} else {
		app.Cache = redisClient
		defer func() { _ = redisClient.Close() }()
	}

	// RabbitMQ
	if mqClient, mErr := mq.New(mq.Options{
		URL:          cfg.RabbitMQ.URL,
		Exchange:     cfg.RabbitMQ.Exchange,
		ExchangeType: cfg.RabbitMQ.ExchangeType,
		Prefetch:     cfg.RabbitMQ.Prefetch,
	}); mErr != nil {
		if !opts.AllowMissingMiddleware {
			return fmt.Errorf("初始化 RabbitMQ 失败: %w", mErr)
		}
		logger.L().Warn("RabbitMQ 不可用，事件订阅将被跳过", zap.Error(mErr))
	} else {
		app.MQ = mqClient
		defer func() { _ = mqClient.Close() }()

		if len(opts.Consumers) > 0 {
			if sErr := mqClient.Subscribe(opts.Consumers...); sErr != nil {
				logger.L().Warn("订阅事件失败", zap.Error(sErr))
			}
		}
	}

	// gRPC 服务
	grpcServer := server.NewGRPCServer(server.Options{
		ServiceName: serviceName,
		Timeout:     time.Duration(cfg.Server.Timeout) * time.Second,
	})

	if opts.Setup != nil {
		if sErr := opts.Setup(ctx, app, grpcServer); sErr != nil {
			return fmt.Errorf("服务初始化失败: %w", sErr)
		}
	}

	// 注册到 Nacos
	if cfg.Nacos.Enabled {
		go registerToNacos(ctx, app, serviceName)
	}

	return server.Run(ctx, grpcServer, cfg.Server.GRPCAddr, serviceName)
}

// registerToNacos 把当前实例注册到注册中心，并监听退出信号注销。
func registerToNacos(ctx context.Context, app *App, serviceName string) {
	ip := app.Config.Nacos.RegisterIP
	port := app.Config.Nacos.RegisterPort
	if port == 0 {
		port = portFromAddr(app.Config.Server.GRPCAddr)
	}

	if err := app.Registry.RegisterInstance(ctx, serviceName, ip, port); err != nil {
		logger.L().Warn("注册到 Nacos 失败，将使用静态地址寻址", zap.Error(err))
		return
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	app.Registry.DeregisterInstance(shutdownCtx, serviceName, ip, port)
}

func portFromAddr(addr string) int {
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			port := 0
			for _, c := range addr[i+1:] {
				if c < '0' || c > '9' {
					return 0
				}
				port = port*10 + int(c-'0')
			}
			return port
		}
	}
	return 0
}
