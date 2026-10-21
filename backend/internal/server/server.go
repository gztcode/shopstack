// Package server 提供 gRPC 微服务统一的启动与拦截器能力。
package server

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/shopstack/platform/backend/internal/auth"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// Options 控制 gRPC 服务端行为。
type Options struct {
	ServiceName string
	Timeout     time.Duration
	// UnaryInterceptors 追加的自定义拦截器。
	UnaryInterceptors []grpc.UnaryServerInterceptor
	// StreamInterceptors 追加的自定义流拦截器。
	StreamInterceptors []grpc.StreamServerInterceptor
}

// NewGRPCServer 构造带标准拦截器链的 gRPC Server。
//
// 拦截器顺序：Recovery -> Trace -> Auth -> Logging -> 自定义
func NewGRPCServer(opts Options) *grpc.Server {
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	chain := []grpc.UnaryServerInterceptor{
		recoveryInterceptor(),
		traceInterceptor(),
		authInterceptor(),
		loggingInterceptor(opts.ServiceName, timeout),
	}
	chain = append(chain, opts.UnaryInterceptors...)

	streamChain := []grpc.StreamServerInterceptor{
		streamRecoveryInterceptor(),
		streamTraceInterceptor(),
	}
	streamChain = append(streamChain, opts.StreamInterceptors...)

	return grpc.NewServer(
		grpc.ChainUnaryInterceptor(chain...),
		grpc.ChainStreamInterceptor(streamChain...),
		grpc.MaxRecvMsgSize(16*1024*1024),
		grpc.MaxSendMsgSize(16*1024*1024),
		grpc.ConnectionTimeout(10*time.Second),
		grpc.KeepaliveParams(keepaliveParams()),
	)
}

// Run 启动 gRPC 服务并等待退出信号，实现优雅停机。
func Run(ctx context.Context, srv *grpc.Server, addr, serviceName string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("监听 %s 失败: %w", addr, err)
	}

	errCh := make(chan error, 1)
	go func() {
		shoplogger.L().Info("gRPC 服务启动",
			zap.String("服务", serviceName), zap.String("地址", addr))
		if err := srv.Serve(lis); err != nil {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case <-quit:
		shoplogger.L().Info("收到退出信号，开始优雅停机", zap.String("服务", serviceName))
	case <-ctx.Done():
		shoplogger.L().Info("上下文取消，开始优雅停机", zap.String("服务", serviceName))
	}

	stopped := make(chan struct{})
	go func() {
		srv.GracefulStop()
		close(stopped)
	}()
	select {
	case <-stopped:
	case <-time.After(15 * time.Second):
		srv.Stop()
	}
	shoplogger.L().Info("服务已停止", zap.String("服务", serviceName))
	return nil
}

// ---------------------------------------------------------------------------
// 拦截器
// ---------------------------------------------------------------------------

func recoveryInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				shoplogger.L().Error("服务发生 panic",
					zap.String("方法", info.FullMethod), zap.Any("panic", r))
				err = status.Error(codes.Internal, "服务内部错误")
			}
		}()
		return handler(ctx, req)
	}
}

func streamRecoveryInterceptor() grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) (err error) {
		defer func() {
			if r := recover(); r != nil {
				shoplogger.L().Error("流服务发生 panic",
					zap.String("方法", info.FullMethod), zap.Any("panic", r))
				err = status.Error(codes.Internal, "服务内部错误")
			}
		}()
		return handler(srv, ss)
	}
}

func traceInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		md, _ := metadata.FromIncomingContext(ctx)
		traceID := firstValue(md, auth.MetadataTraceID)
		requestID := firstValue(md, auth.MetadataRequestID)
		if traceID == "" {
			traceID = uuid.NewString()
		}
		if requestID == "" {
			requestID = uuid.NewString()
		}
		ctx = auth.WithRequestID(ctx, requestID)
		ctx = context.WithValue(ctx, ctxTraceID, traceID)

		// 回写 metadata，方便链路排查
		_ = grpc.SetHeader(ctx, metadata.Pairs(
			auth.MetadataTraceID, traceID,
			auth.MetadataRequestID, requestID,
		))
		return handler(ctx, req)
	}
}

func streamTraceInterceptor() grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		md, _ := metadata.FromIncomingContext(ss.Context())
		traceID := firstValue(md, auth.MetadataTraceID)
		if traceID == "" {
			traceID = uuid.NewString()
		}
		ctx := context.WithValue(ss.Context(), ctxTraceID, traceID)
		return handler(srv, &wrappedStream{ServerStream: ss, ctx: ctx})
	}
}

type wrappedStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedStream) Context() context.Context { return w.ctx }

// authInterceptor 从 gRPC metadata 中还原调用方身份。
//
// 注意：JWT 的校验发生在 API 网关，这里只做身份透传，
// 因此内部服务默认不强制要求身份信息存在。
func authInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if ok {
			if uid := firstValue(md, auth.MetadataUserID); uid != "" {
				ctx = auth.WithIdentity(ctx, parseInt64(uid),
					firstValue(md, auth.MetadataUsername),
					firstValue(md, auth.MetadataSubject),
					parsePermissions(firstValue(md, auth.MetadataPermissions)),
				)
			}
		}
		return handler(ctx, req)
	}
}

func loggingInterceptor(serviceName string, timeout time.Duration) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		cost := time.Since(start)

		fields := []zap.Field{
			zap.String("服务", serviceName),
			zap.String("方法", info.FullMethod),
			zap.Duration("耗时", cost),
			zap.String("trace_id", TraceIDFromContext(ctx)),
			zap.Int64("user_id", auth.UserIDFromContext(ctx)),
		}
		if err != nil {
			fields = append(fields, zap.Error(err))
			shoplogger.L().Error("请求处理失败", fields...)
		} else {
			shoplogger.L().Info("请求处理完成", fields...)
		}

		if err != nil {
			return resp, err
		}
		return resp, nil
	}
}

func firstValue(md metadata.MD, key string) string {
	if vals := md.Get(key); len(vals) > 0 {
		return strings.TrimSpace(vals[0])
	}
	return ""
}

func parseInt64(s string) int64 {
	var v int64
	neg := false
	for i, ch := range s {
		if i == 0 && ch == '-' {
			neg = true
			continue
		}
		if ch < '0' || ch > '9' {
			return 0
		}
		v = v*10 + int64(ch-'0')
	}
	if neg {
		return -v
	}
	return v
}

func parsePermissions(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
