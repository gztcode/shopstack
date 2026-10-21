package server

import (
	"context"
	"time"

	"google.golang.org/grpc/keepalive"
)

type ctxKey string

const ctxTraceID ctxKey = "trace.id"

// TraceIDFromContext 取出当前链路的 trace ID。
func TraceIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxTraceID).(string); ok {
		return v
	}
	return ""
}

// WithTraceID 写入 trace ID。
func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, ctxTraceID, traceID)
}

func keepaliveParams() keepalive.ServerParameters {
	return keepalive.ServerParameters{
		MaxConnectionIdle: 5 * time.Minute,
		Time:              30 * time.Second,
		Timeout:           10 * time.Second,
	}
}
