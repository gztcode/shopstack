package httpx

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/server"
)

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

// CORS 处理跨域请求。
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers",
			"Origin, Content-Type, Content-Length, Accept, Authorization, X-Requested-With, X-Request-Id")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-Id, X-Trace-Id")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

// Recovery 捕获 panic，避免单个请求打挂整个网关。
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				shoplogger.L().Error("网关 panic",
					zap.String("路径", r.URL.Path), zap.Any("panic", rec))
				WriteJSON(w, http.StatusInternalServerError,
					ErrorEnvelope(errs.CodeInternalError, "服务内部错误", ""))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------------------
// 请求日志
// ---------------------------------------------------------------------------

// RequestLogger 记录每个请求的方法、路径、状态码与耗时。
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		traceID := r.Header.Get(auth.MetadataTraceID)
		if traceID == "" {
			traceID = uuid.NewString()
		}
		requestID := r.Header.Get(auth.MetadataRequestID)
		if requestID == "" {
			requestID = uuid.NewString()
		}
		w.Header().Set(auth.MetadataTraceID, traceID)
		w.Header().Set(auth.MetadataRequestID, requestID)

		ctx := server.WithTraceID(r.Context(), traceID)
		ctx = auth.WithRequestID(ctx, requestID)
		r = r.WithContext(ctx)

		next.ServeHTTP(sw, r)

		shoplogger.L().Info("网关请求",
			zap.String("方法", r.Method),
			zap.String("路径", r.URL.Path),
			zap.Int("状态码", sw.status),
			zap.Duration("耗时", time.Since(start)),
			zap.String("trace_id", traceID),
			zap.String("client_ip", ClientIP(r)),
		)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// ClientIP 解析客户端真实 IP。
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if rip := r.Header.Get("X-Real-IP"); rip != "" {
		return rip
	}
	host, _, err := splitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func splitHostPort(addr string) (string, string, error) {
	idx := strings.LastIndex(addr, ":")
	if idx < 0 {
		return addr, "", nil
	}
	return addr[:idx], addr[idx+1:], nil
}

// ---------------------------------------------------------------------------
// 限流
// ---------------------------------------------------------------------------

// RateLimiter 是一个基于固定时间窗的内存限流器。
type RateLimiter struct {
	mu       sync.Mutex
	counters map[string]*counter
	limit    int
	window   time.Duration
}

type counter struct {
	count     int
	windowEnd time.Time
}

// NewRateLimiter 创建限流器。limit 为时间窗内允许的最大请求数。
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	if limit <= 0 {
		limit = 300
	}
	if window <= 0 {
		window = time.Minute
	}
	return &RateLimiter{counters: map[string]*counter{}, limit: limit, window: window}
}

// Allow 判断请求是否放行。
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	c, ok := rl.counters[key]
	if !ok || now.After(c.windowEnd) {
		rl.counters[key] = &counter{count: 1, windowEnd: now.Add(rl.window)}
		// 简单清理，避免 map 无限增长
		if len(rl.counters) > 10000 {
			rl.cleanup(now)
		}
		return true
	}
	if c.count >= rl.limit {
		return false
	}
	c.count++
	return true
}

func (rl *RateLimiter) cleanup(now time.Time) {
	for k, c := range rl.counters {
		if now.After(c.windowEnd) {
			delete(rl.counters, k)
		}
	}
}

// RateLimit 按客户端 IP 限流。
func RateLimit(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !limiter.Allow(ClientIP(r)) {
				w.Header().Set("Retry-After", "60")
				WriteJSON(w, http.StatusTooManyRequests,
					ErrorEnvelope(errs.CodeTooManyReq, "请求过于频繁，请稍后再试", ""))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ---------------------------------------------------------------------------
// 鉴权
// ---------------------------------------------------------------------------

// 路由访问策略。
type Policy int

const (
	// PolicyPublic 无需登录即可访问。
	PolicyPublic Policy = iota
	// PolicyUser 需要用户端登录态。
	PolicyUser
	// PolicyAdmin 需要后台管理端登录态。
	PolicyAdmin
	// PolicyInternal 是服务间内部接口，不允许从公网网关访问。
	PolicyInternal
)

// routePolicy 描述受保护路径的匹配规则。
type routePolicy struct {
	prefix string
	policy Policy
	// methods 限定生效的 HTTP 方法，为空表示所有方法都生效。
	//
	// 用于区分同一条路径上的公开读与受保护写：
	// 例如 GET /api/v1/reviews 是公开的评价浏览，
	// 而 POST /api/v1/reviews 是用户发表评价，需要登录。
	methods []string
}

// policies 定义需要鉴权的路径规则。
//
//	/api/v1/admin/**  → 后台管理端令牌
//	其余业务路径     → 用户端令牌
//
// 规则按声明顺序匹配，首个命中即生效，因此更具体的前缀要写在前面。
// 未列出的路径为公开接口：商品浏览、频道、评价列表、活动详情等只读内容。
var policies = []routePolicy{
	{prefix: "/api/v1/admin/", policy: PolicyAdmin},

	// 库存的锁定/释放/扣减是服务间内部调用，绝不能暴露给公网。
	// 这些接口由订单与购物车服务通过 gRPC 直连调用，网关侧一律拒绝。
	{prefix: "/api/v1/inventory/", policy: PolicyInternal},

	// 目录类读接口：用户端与后台管理端都要读，保持公开。
	// 退款原因、拼团列表、任务目录、通知分类都是配置型数据，不含用户隐私。
	// 这些前缀比下面的通用前缀更具体，必须写在前面。
	{prefix: "/api/v1/refund-reasons", policy: PolicyPublic},
	{prefix: "/api/v1/notifications/categories", policy: PolicyPublic},

	// 同一路径上读公开、写需登录：拼团列表可浏览，参团要登录；
	// 任务目录可浏览，领取奖励要登录。
	{prefix: "/api/v1/group-buys", policy: PolicyUser, methods: []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}},
	{prefix: "/api/v1/marketing/tasks", policy: PolicyUser, methods: []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}},

	// 写操作需要登录，读取保持公开浏览。
	{prefix: "/api/v1/reviews", policy: PolicyUser, methods: []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}},
	{prefix: "/api/v1/questions", policy: PolicyUser, methods: []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}},

	// 用户私有资源：签到、售后单。这些路径上的数据属于当前登录用户。
	{prefix: "/api/v1/marketing/sign-in", policy: PolicyUser},
	{prefix: "/api/v1/after-sales", policy: PolicyUser},

	// 用户私有数据的通用前缀。
	{prefix: "/api/v1/cart", policy: PolicyUser},
	{prefix: "/api/v1/orders", policy: PolicyUser},
	{prefix: "/api/v1/payments", policy: PolicyUser},
	{prefix: "/api/v1/users", policy: PolicyUser},
	{prefix: "/api/v1/notifications", policy: PolicyUser},
	{prefix: "/api/v1/sms/", policy: PolicyUser},
	{prefix: "/api/v1/coupons/", policy: PolicyUser},
}

// publicPaths 是无需登录即可访问的接口（登录、注册、刷新令牌等）。
var publicPaths = []string{
	"/api/v1/auth/",
	"/api/v1/admin/auth/login",
	"/healthz",
	"/readyz",
}

// PolicyFor 返回指定路径与方法的访问策略。
func PolicyFor(path string, method string) Policy {
	for _, p := range publicPaths {
		if strings.HasPrefix(path, p) {
			return PolicyPublic
		}
	}
	for _, p := range policies {
		if !strings.HasPrefix(path, p.prefix) {
			continue
		}
		if len(p.methods) == 0 || containsMethod(p.methods, method) {
			return p.policy
		}
	}
	return PolicyPublic
}

// containsMethod 判断方法是否在列表内。
func containsMethod(methods []string, method string) bool {
	for _, m := range methods {
		if strings.EqualFold(m, method) {
			return true
		}
	}
	return false
}

// Auth 校验 JWT 并把身份信息写入请求上下文。
//
// 令牌本身在这里完成校验（网关是唯一对外入口），
// 随后通过 metadata 注解器把身份透传给下游 gRPC 服务。
func Auth(manager *auth.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			policy := PolicyFor(r.URL.Path, r.Method)
			token := bearerToken(r)

			if policy == PolicyInternal {
				// 内部接口只允许服务间 gRPC 直连，网关侧直接拒绝。
				WriteJSON(w, http.StatusForbidden,
					ErrorEnvelope(errs.CodeForbidden, "该接口仅限服务间调用", server.TraceIDFromContext(r.Context())))
				return
			}

			if token == "" {
				if policy == PolicyPublic {
					next.ServeHTTP(w, r)
					return
				}
				WriteJSON(w, http.StatusUnauthorized,
					ErrorEnvelope(errs.CodeUnauthorized, "请先登录", server.TraceIDFromContext(r.Context())))
				return
			}

			claims, err := manager.Parse(token)
			if err != nil {
				if policy == PolicyPublic {
					// 公开接口带了无效令牌：忽略即可，不阻断浏览
					next.ServeHTTP(w, r)
					return
				}
				bizErr := errs.FromError(err)
				WriteJSON(w, http.StatusUnauthorized,
					ErrorEnvelope(bizErr.Code, bizErr.Msg, server.TraceIDFromContext(r.Context())))
				return
			}

			if policy == PolicyAdmin && claims.Subject != auth.SubjectAdmin {
				WriteJSON(w, http.StatusForbidden,
					ErrorEnvelope(errs.CodeForbidden, "需要管理员权限", server.TraceIDFromContext(r.Context())))
				return
			}
			// PolicyUser 的路径既允许用户令牌，也允许管理员令牌：
			// 后台管理端需要读取用户维度的数据（充值单、余额流水、成长值流水），
			// 服务层会根据管理员身份返回全量或指定用户的数据。
			if policy == PolicyUser && claims.Subject != auth.SubjectUser && claims.Subject != auth.SubjectAdmin {
				WriteJSON(w, http.StatusForbidden,
					ErrorEnvelope(errs.CodeForbidden, "需要用户登录态", server.TraceIDFromContext(r.Context())))
				return
			}

			ctx := auth.WithIdentity(r.Context(), claims.UserID, claims.Username,
				claims.Subject, claims.Permissions)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return strings.TrimSpace(h)
}

// ---------------------------------------------------------------------------
// 身份元数据透传
// ---------------------------------------------------------------------------

// IdentityMetadata 把当前请求的身份信息注入到发往 gRPC 服务的 metadata。
func IdentityMetadata(ctx context.Context, r *http.Request) map[string][]string {
	md := map[string][]string{}

	if uid := auth.UserIDFromContext(ctx); uid > 0 {
		md[auth.MetadataUserID] = []string{strconv.FormatInt(uid, 10)}
	}
	if name := auth.UsernameFromContext(ctx); name != "" {
		md[auth.MetadataUsername] = []string{name}
	}
	if subject := auth.SubjectFromContext(ctx); subject != "" {
		md[auth.MetadataSubject] = []string{subject}
	}
	if perms := auth.PermissionsFromContext(ctx); len(perms) > 0 {
		md[auth.MetadataPermissions] = []string{strings.Join(perms, ",")}
	}
	if reqID := auth.RequestIDFromContext(ctx); reqID != "" {
		md[auth.MetadataRequestID] = []string{reqID}
	}
	if traceID := server.TraceIDFromContext(ctx); traceID != "" {
		md[auth.MetadataTraceID] = []string{traceID}
	}
	return md
}
