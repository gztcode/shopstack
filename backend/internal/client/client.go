// Package client 提供 gRPC 客户端连接池与服务发现能力。
//
// 服务发现支持两种模式：
//   - 静态模式（默认）：直接从配置读取目标服务地址，零外部依赖，开箱即用。
//   - Nacos 模式：配置 nacos.enabled=true 后，服务实例注册到 Nacos 并动态发现。
package client

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/config"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/registry"
)

// Registry 管理到各微服务的 gRPC 连接。
type Registry struct {
	cfg   *config.Config
	mu    sync.RWMutex
	conns map[string]*grpc.ClientConn
	nacos *registry.NacosClient
}

// NewRegistry 创建注册中心。Nacos 初始化失败时降级为静态模式，不阻塞启动。
func NewRegistry(cfg *config.Config) *Registry {
	r := &Registry{cfg: cfg, conns: map[string]*grpc.ClientConn{}}
	if cfg.Nacos.Enabled {
		r.nacos = registry.NewNacosClient(registry.Options{
			ServerAddr: cfg.Nacos.ServerAddr,
			Namespace:  cfg.Nacos.Namespace,
			Group:      cfg.Nacos.Group,
			Username:   cfg.Nacos.Username,
			Password:   cfg.Nacos.Password,
		})
		shoplogger.L().Info("Nacos 服务发现已启用",
			zap.String("地址", cfg.Nacos.ServerAddr),
			zap.String("命名空间", cfg.Nacos.Namespace))
	}
	return r
}

// Conn 返回目标服务的 gRPC 连接（带缓存）。
func (r *Registry) Conn(ctx context.Context, serviceName string) (*grpc.ClientConn, error) {
	r.mu.RLock()
	conn, ok := r.conns[serviceName]
	r.mu.RUnlock()
	if ok {
		return conn, nil
	}

	target, err := r.resolve(ctx, serviceName)
	if err != nil {
		return nil, err
	}

	newConn, err := grpc.NewClient(target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithChainUnaryInterceptor(identityInterceptor()),
		grpc.WithChainStreamInterceptor(identityStreamInterceptor()),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(16*1024*1024),
			grpc.MaxCallSendMsgSize(16*1024*1024),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("连接服务 %s (%s) 失败: %w", serviceName, target, err)
	}

	r.mu.Lock()
	if existing, ok := r.conns[serviceName]; ok {
		r.mu.Unlock()
		_ = newConn.Close()
		return existing, nil
	}
	r.conns[serviceName] = newConn
	r.mu.Unlock()

	shoplogger.L().Info("已建立服务连接",
		zap.String("服务", serviceName), zap.String("地址", target))
	return newConn, nil
}

// resolve 解析服务地址。Nacos 模式下优先使用注册中心实例。
func (r *Registry) resolve(ctx context.Context, serviceName string) (string, error) {
	if r.nacos != nil {
		instances, err := r.nacos.SelectInstances(ctx, serviceName, true)
		if err == nil && len(instances) > 0 {
			return instances[0].Addr(), nil
		}
		if err != nil {
			shoplogger.L().Warn("Nacos 服务发现失败，回退静态地址",
				zap.String("服务", serviceName), zap.Error(err))
		}
	}
	addr := r.cfg.ServiceAddr(serviceName)
	if addr == "" {
		return "", fmt.Errorf("未找到服务 %s 的地址配置", serviceName)
	}
	return addr, nil
}

// RegisterInstance 将当前实例注册到 Nacos。
func (r *Registry) RegisterInstance(ctx context.Context, serviceName, ip string, port int) error {
	if r.nacos == nil {
		return nil
	}
	err := r.nacos.Register(ctx, serviceName, ip, port, map[string]string{
		"version": "1.0.0",
		"env":     r.cfg.Env,
	})
	if err != nil {
		registry.LogRegisterError(serviceName, err)
		return err
	}
	shoplogger.L().Info("实例已注册到 Nacos",
		zap.String("服务", serviceName),
		zap.String("地址", fmt.Sprintf("%s:%d", ip, port)))
	return nil
}

// DeregisterInstance 从 Nacos 注销当前实例。
func (r *Registry) DeregisterInstance(ctx context.Context, serviceName, ip string, port int) {
	if r.nacos == nil {
		return
	}
	if err := r.nacos.Deregister(ctx, serviceName, ip, port); err != nil {
		shoplogger.L().Warn("注销实例失败", zap.String("服务", serviceName), zap.Error(err))
	}
}

// Close 关闭所有连接。
func (r *Registry) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for name, conn := range r.conns {
		_ = conn.Close()
		delete(r.conns, name)
	}
}

// identityInterceptor 把当前请求的身份信息透传给下游服务。
func identityInterceptor() grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		return invoker(identityContext(ctx), method, req, reply, cc, opts...)
	}
}

func identityStreamInterceptor() grpc.StreamClientInterceptor {
	return func(ctx context.Context, desc *grpc.StreamDesc, cc *grpc.ClientConn, method string, streamer grpc.Streamer, opts ...grpc.CallOption) (grpc.ClientStream, error) {
		return streamer(identityContext(ctx), desc, cc, method, opts...)
	}
}

func identityContext(ctx context.Context) context.Context {
	md, ok := metadata.FromOutgoingContext(ctx)
	if !ok {
		md = metadata.MD{}
	} else {
		md = md.Copy()
	}

	if uid := auth.UserIDFromContext(ctx); uid > 0 {
		md.Set(auth.MetadataUserID, strconv.FormatInt(uid, 10))
	}
	if name := auth.UsernameFromContext(ctx); name != "" {
		md.Set(auth.MetadataUsername, name)
	}
	if subject := auth.SubjectFromContext(ctx); subject != "" {
		md.Set(auth.MetadataSubject, subject)
	}
	if perms := auth.PermissionsFromContext(ctx); len(perms) > 0 {
		md.Set(auth.MetadataPermissions, strings.Join(perms, ","))
	}
	if reqID := auth.RequestIDFromContext(ctx); reqID != "" {
		md.Set(auth.MetadataRequestID, reqID)
	}
	return metadata.NewOutgoingContext(ctx, md)
}

// WithTimeout 为调用附加超时。
func WithTimeout(ctx context.Context, d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, d)
}
