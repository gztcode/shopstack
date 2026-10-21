// Package auth 负责 JWT 签发、校验以及调用链身份上下文的传递。
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/shopstack/platform/backend/internal/errs"
)

// 身份类型
const (
	SubjectUser  = "user"
	SubjectAdmin = "admin"
)

// 令牌类型
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// Metadata 中携带身份信息的 key。
const (
	MetadataUserID      = "x-user-id"
	MetadataUsername    = "x-username"
	MetadataSubject     = "x-subject"
	MetadataPermissions = "x-permissions"
	MetadataRequestID   = "x-request-id"
	MetadataTraceID     = "x-trace-id"
)

// Claims 是自定义的 JWT 载荷。
type Claims struct {
	UserID      int64    `json:"uid"`
	Username    string   `json:"unm,omitempty"`
	Subject     string   `json:"sub"`
	TokenType   string   `json:"typ"`
	Permissions []string `json:"perms,omitempty"`
	jwt.RegisteredClaims
}

// Manager 负责令牌签发与校验。用户端与后台管理端使用不同密钥，避免越权。
type Manager struct {
	userSecret   []byte
	adminSecret  []byte
	accessExp    time.Duration
	refreshExp   time.Duration
	adminAccExp  time.Duration
	adminRefExp  time.Duration
	issuerPrefix string
}

// NewManager 构造令牌管理器。
func NewManager(userSecret, adminSecret string, accessExp, refreshExp, adminAccessExp, adminRefreshExp int) *Manager {
	return &Manager{
		userSecret:   []byte(userSecret),
		adminSecret:  []byte(adminSecret),
		accessExp:    time.Duration(accessExp) * time.Second,
		refreshExp:   time.Duration(refreshExp) * time.Second,
		adminAccExp:  time.Duration(adminAccessExp) * time.Second,
		adminRefExp:  time.Duration(adminRefreshExp) * time.Second,
		issuerPrefix: "shopstack",
	}
}

func (m *Manager) secretFor(subject string) []byte {
	if subject == SubjectAdmin {
		return m.adminSecret
	}
	return m.userSecret
}

func (m *Manager) expFor(subject, tokenType string) time.Duration {
	if subject == SubjectAdmin {
		if tokenType == TokenTypeRefresh {
			return m.adminRefExp
		}
		return m.adminAccExp
	}
	if tokenType == TokenTypeRefresh {
		return m.refreshExp
	}
	return m.accessExp
}

// Generate 签发令牌。tokenType 取 TokenTypeAccess 或 TokenTypeRefresh。
func (m *Manager) Generate(subject, tokenType string, userID int64, username string, permissions []string) (string, time.Time, error) {
	now := time.Now()
	exp := now.Add(m.expFor(subject, tokenType))
	claims := &Claims{
		UserID:      userID,
		Username:    username,
		Subject:     subject,
		TokenType:   tokenType,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    fmt.Sprintf("%s-%s", m.issuerPrefix, subject),
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString(m.secretFor(subject))
	if err != nil {
		return "", time.Time{}, errs.Wrap(errs.CodeInternalError, "令牌签发失败", err)
	}
	return signed, exp, nil
}

// Parse 校验并解析令牌。
func (m *Manager) Parse(tokenString string) (*Claims, error) {
	if tokenString == "" {
		return nil, errs.Unauthorized("缺少访问令牌")
	}
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("非预期的签名算法: %v", t.Header["alg"])
		}
		// 先用用户密钥校验，再按 subject 用对应密钥校验
		if _, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
			return m.userSecret, nil
		}); err == nil {
			return m.userSecret, nil
		}
		return m.adminSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, errs.New(errs.CodeTokenExpired, "登录已过期，请重新登录")
		}
		return nil, errs.New(errs.CodeTokenInvalid, "无效的访问令牌")
	}
	if claims.TokenType != TokenTypeAccess {
		return nil, errs.New(errs.CodeTokenInvalid, "令牌类型不正确")
	}
	return claims, nil
}

// ParseRefresh 校验刷新令牌。
func (m *Manager) ParseRefresh(tokenString string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("非预期的签名算法: %v", t.Header["alg"])
		}
		if _, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
			return m.userSecret, nil
		}); err == nil {
			return m.userSecret, nil
		}
		return m.adminSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, errs.New(errs.CodeTokenExpired, "登录已过期，请重新登录")
		}
		return nil, errs.New(errs.CodeTokenInvalid, "无效的刷新令牌")
	}
	if claims.TokenType != TokenTypeRefresh {
		return nil, errs.New(errs.CodeTokenInvalid, "令牌类型不正确")
	}
	return claims, nil
}

// ---------------------------------------------------------------------------
// 上下文
// ---------------------------------------------------------------------------

type ctxKey string

const (
	ctxKeyUserID      ctxKey = "auth.user_id"
	ctxKeyUsername    ctxKey = "auth.username"
	ctxKeySubject     ctxKey = "auth.subject"
	ctxKeyPermissions ctxKey = "auth.permissions"
	ctxKeyRequestID   ctxKey = "auth.request_id"
)

// WithIdentity 把身份信息写入 context。
func WithIdentity(ctx context.Context, userID int64, username, subject string, permissions []string) context.Context {
	ctx = context.WithValue(ctx, ctxKeyUserID, userID)
	ctx = context.WithValue(ctx, ctxKeyUsername, username)
	ctx = context.WithValue(ctx, ctxKeySubject, subject)
	ctx = context.WithValue(ctx, ctxKeyPermissions, permissions)
	return ctx
}

// WithRequestID 把请求 ID 写入 context。
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, ctxKeyRequestID, requestID)
}

// UserIDFromContext 从 context 取出当前用户 ID。
func UserIDFromContext(ctx context.Context) int64 {
	if v, ok := ctx.Value(ctxKeyUserID).(int64); ok {
		return v
	}
	return 0
}

// UsernameFromContext 从 context 取出当前用户名。
func UsernameFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyUsername).(string); ok {
		return v
	}
	return ""
}

// SubjectFromContext 从 context 取出身份类型。
func SubjectFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeySubject).(string); ok {
		return v
	}
	return ""
}

// PermissionsFromContext 从 context 取出权限码列表。
func PermissionsFromContext(ctx context.Context) []string {
	if v, ok := ctx.Value(ctxKeyPermissions).([]string); ok {
		return v
	}
	return nil
}

// RequestIDFromContext 从 context 取出请求 ID。
func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyRequestID).(string); ok {
		return v
	}
	return ""
}

// IsAdmin 判断当前请求是否为管理员。
func IsAdmin(ctx context.Context) bool {
	return SubjectFromContext(ctx) == SubjectAdmin
}

// HasPermission 判断当前请求是否拥有指定权限码。
func HasPermission(ctx context.Context, code string) bool {
	if code == "" {
		return true
	}
	for _, p := range PermissionsFromContext(ctx) {
		if p == code || p == "*" {
			return true
		}
	}
	return false
}
