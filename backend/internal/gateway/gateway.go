// Package gateway 组装 API 网关：对外暴露 REST/JSON，对内通过 gRPC 调用微服务。
package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"
	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"
	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"
	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/config"
	"github.com/shopstack/platform/backend/internal/httpx"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// Gateway 是 API 网关。
type Gateway struct {
	cfg      *config.Config
	registry *client.Registry
	mux      *runtime.ServeMux
	server   *http.Server
}

// New 创建并初始化网关。
func New(cfg *config.Config, registry *client.Registry, manager *auth.Manager) (*Gateway, error) {
	marshaler := httpx.NewEnvelopeMarshaler()

	mux := runtime.NewServeMux(
		runtime.WithMarshalerOption(runtime.MIMEWildcard, marshaler),
		runtime.WithErrorHandler(httpx.ErrorHandler),
		// 把网关解析出的身份信息透传给下游 gRPC 服务
		runtime.WithMetadata(func(ctx context.Context, r *http.Request) metadata.MD {
			return metadata.MD(httpx.IdentityMetadata(ctx, r))
		}),
		runtime.WithIncomingHeaderMatcher(func(key string) (string, bool) {
			switch key {
			case "Authorization":
				return "authorization", true
			case "X-Request-Id":
				return auth.MetadataRequestID, true
			case "X-Trace-Id":
				return auth.MetadataTraceID, true
			}
			return "", false
		}),
	)

	g := &Gateway{cfg: cfg, registry: registry, mux: mux}

	if err := g.registerHandlers(context.Background()); err != nil {
		return nil, fmt.Errorf("注册网关路由失败: %w", err)
	}
	return g, nil
}

// registerHandlers 连接所有下游服务并注册路由。
func (g *Gateway) registerHandlers(ctx context.Context) error {
	type serviceEntry struct {
		// name 是 gRPC 服务名，logical 是配置中的逻辑服务名。
		name     string
		logical  string
		register func(context.Context, *runtime.ServeMux, *grpc.ClientConn) error
	}

	entries := []serviceEntry{
		{"user", "user", userv1.RegisterUserServiceHandler},
		{"admin", "user", userv1.RegisterAdminServiceHandler},
		{"product", "product", productv1.RegisterProductServiceHandler},
		{"category", "product", productv1.RegisterCategoryServiceHandler},
		{"review", "product", productv1.RegisterReviewServiceHandler},
		{"cart", "cart", cartv1.RegisterCartServiceHandler},
		{"order", "order", orderv1.RegisterOrderServiceHandler},
		{"payment", "payment", paymentv1.RegisterPaymentServiceHandler},
		{"inventory", "inventory", inventoryv1.RegisterInventoryServiceHandler},
		{"marketing", "marketing", marketingv1.RegisterMarketingServiceHandler},
		{"logistics", "logistics", logisticsv1.RegisterLogisticsServiceHandler},
		{"notification", "notification", notificationv1.RegisterNotificationServiceHandler},
	}

	for _, entry := range entries {
		conn, err := g.registry.Conn(ctx, entry.logical)
		if err != nil {
			shoplogger.L().Warn("下游服务暂不可用，该模块路由将返回 503",
				zap.String("服务", entry.name), zap.Error(err))
			continue
		}
		if err := entry.register(ctx, g.mux, conn); err != nil {
			return fmt.Errorf("注册 %s 路由失败: %w", entry.name, err)
		}
	}
	return nil
}

// Handler 返回网关的 HTTP 处理器（含中间件链）。
func (g *Gateway) Handler(manager *auth.Manager) http.Handler {
	limiter := httpx.NewRateLimiter(600, time.Minute)

	mux := http.NewServeMux()
	mux.Handle("/healthz", g.healthHandler())
	mux.Handle("/readyz", g.readyHandler())
	mux.Handle("/api/v1/home", g.homeHandler())
	mux.Handle("/api/v1/", g.mux)

	return chain(mux,
		httpx.Recovery,
		httpx.RequestLogger,
		httpx.CORS,
		httpx.RateLimit(limiter),
		httpx.Auth(manager),
	)
}

func chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

// healthHandler 健康检查。
func (g *Gateway) healthHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "api-gateway",
			"time":    time.Now().Format(time.RFC3339),
		})
	})
}

// readyHandler 就绪检查：确认下游服务均可连通。
func (g *Gateway) readyHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		services := []string{"user", "product", "cart", "order", "payment",
			"inventory", "marketing", "logistics", "notification"}
		status := make(map[string]string, len(services))
		ready := true

		for _, s := range services {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			conn, err := g.registry.Conn(ctx, s)
			cancel()
			if err != nil {
				status[s] = "unavailable"
				ready = false
				continue
			}
			state := conn.GetState().String()
			status[s] = state
			if state != "READY" && state != "IDLE" {
				ready = false
			}
		}

		code := http.StatusOK
		if !ready {
			code = http.StatusServiceUnavailable
		}
		httpx.WriteJSON(w, code, map[string]any{
			"ready":    ready,
			"services": status,
		})
	})
}

// ---------------------------------------------------------------------------
// 首页聚合接口
// ---------------------------------------------------------------------------

type homeResponse struct {
	Banners    []*productv1.Banner      `json:"banners"`
	Categories []*productv1.Category    `json:"categories"`
	Products   []*productv1.Product     `json:"products"`
	Promotions []*marketingv1.Promotion `json:"promotions"`
	Coupons    []*marketingv1.Coupon    `json:"coupons"`
}

// homeHandler 聚合首页所需的多服务数据，减少前端请求次数。
func (g *Gateway) homeHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		result := &homeResponse{
			Banners:    []*productv1.Banner{},
			Categories: []*productv1.Category{},
			Products:   []*productv1.Product{},
			Promotions: []*marketingv1.Promotion{},
			Coupons:    []*marketingv1.Coupon{},
		}

		productConn, err := g.registry.Conn(ctx, "product")
		if err == nil {
			productClient := productv1.NewProductServiceClient(productConn)
			if banners, bErr := productClient.ListBanners(ctx, &productv1.ListBannersRequest{
				Position: "home_banner",
			}); bErr == nil {
				result.Banners = banners.GetBanners()
			}
			categoryClient := productv1.NewCategoryServiceClient(productConn)
			if cats, cErr := categoryClient.ListCategories(ctx, &productv1.ListCategoriesRequest{
				Tree: true,
			}); cErr == nil {
				result.Categories = cats.GetCategories()
			}
			if products, pErr := productClient.ListProducts(ctx, &productv1.ListProductsRequest{
				Page: &commonv1.PageRequest{Page: 1, PageSize: 12, OrderBy: "sales", OrderDir: "desc"},
			}); pErr == nil {
				result.Products = products.GetProducts()
			}
		}

		marketingConn, err := g.registry.Conn(ctx, "marketing")
		if err == nil {
			marketingClient := marketingv1.NewMarketingServiceClient(marketingConn)
			if promos, pErr := marketingClient.ListPromotions(ctx, &marketingv1.ListPromotionsRequest{
				Page: &commonv1.PageRequest{Page: 1, PageSize: 6},
			}); pErr == nil {
				result.Promotions = promos.GetPromotions()
			}
			if coupons, cErr := marketingClient.ListCoupons(ctx, &marketingv1.ListCouponsRequest{
				Page:      &commonv1.PageRequest{Page: 1, PageSize: 6},
				Available: true,
			}); cErr == nil {
				result.Coupons = coupons.GetCoupons()
			}
		}

		httpx.WriteJSON(w, http.StatusOK, httpx.SuccessEnvelope(result, ""))
	})
}

// WriteJSONRaw 用于测试辅助。
func WriteJSONRaw(w http.ResponseWriter, v any) {
	b, _ := json.Marshal(v)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write(b)
}
