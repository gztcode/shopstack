// Package thirdparty 封装微信、短信、对象存储等外部服务。
//
// 所有能力都定义了 Provider 接口，并提供两套实现：
//   - 真实实现：配置了密钥时启用，调用真实的服务端接口。
//   - Mock 实现：未配置密钥时的降级方案，保证本地开发与演示流程可跑通。
package thirdparty

import (
	"context"
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/config"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// ---------------------------------------------------------------------------
// 微信
// ---------------------------------------------------------------------------

// WeChatUser 是微信开放平台返回的用户信息。
type WeChatUser struct {
	OpenID     string `json:"openid"`
	UnionID    string `json:"unionid"`
	SessionKey string `json:"session_key"`
	Nickname   string `json:"nickname"`
	Avatar     string `json:"avatar"`
}

// WeChatLoginPayload 是小程序登录需要的参数。
type WeChatLoginPayload struct {
	Code string `json:"code"`
}

// WeChatPayPayload 是唤起微信支付需要的参数。
type WeChatPayPayload struct {
	AppID     string            `json:"appId"`
	TimeStamp string            `json:"timeStamp"`
	NonceStr  string            `json:"nonceStr"`
	Package   string            `json:"package"`
	SignType  string            `json:"signType"`
	PaySign   string            `json:"paySign"`
	PrepayID  string            `json:"prepayId"`
	Extra     map[string]string `json:"extra,omitempty"`
}

// WeChatProvider 定义微信相关能力。
type WeChatProvider interface {
	// Code2Session 用 wx.login 拿到的 code 换取 openid。
	Code2Session(ctx context.Context, code string) (*WeChatUser, error)
	// CreatePay 统一下单，返回唤起支付所需参数。
	CreatePay(ctx context.Context, params PayParams) (*WeChatPayPayload, error)
	// Mock 标识当前是否为模拟实现。
	Mock() bool
}

// PayParams 是下单参数。
type PayParams struct {
	OrderNo     string
	AmountCents int64
	Description string
	ClientIP    string
	NotifyURL   string
	TradeType   string // JSAPI / APP / NATIVE
	OpenID      string
	Attach      string
}

// ---------------------------------------------------------------------------
// 短信
// ---------------------------------------------------------------------------

// SMSProvider 定义短信发送能力。
type SMSProvider interface {
	Send(ctx context.Context, phone, scene, code string) error
	Mock() bool
}

// ---------------------------------------------------------------------------
// 对象存储
// ---------------------------------------------------------------------------

// OSSProvider 定义文件上传能力。
type OSSProvider interface {
	// Upload 上传内容并返回可访问的 URL。
	Upload(ctx context.Context, objectKey string, content []byte, contentType string) (string, error)
	// Delete 删除对象。
	Delete(ctx context.Context, objectKey string) error
	Mock() bool
}

// ---------------------------------------------------------------------------
// 集合
// ---------------------------------------------------------------------------

// Providers 持有全部第三方服务实现。
type Providers struct {
	WeChat WeChatProvider
	SMS    SMSProvider
	OSS    OSSProvider
}

// NewProviders 根据配置构建第三方服务实现集合。
func NewProviders(cfg *config.Config) *Providers {
	return &Providers{
		WeChat: newWeChatProvider(cfg),
		SMS:    newSMSProvider(cfg),
		OSS:    newOSSProvider(cfg),
	}
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

// RandomCode 生成指定长度的数字验证码。
func RandomCode(length int) string {
	if length <= 0 {
		length = 6
	}
	max := big.NewInt(10)
	sb := strings.Builder{}
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			sb.WriteByte('0')
			continue
		}
		sb.WriteString(strconv.Itoa(int(n.Int64())))
	}
	return sb.String()
}

// RandomString 生成指定长度的随机字符串。
func RandomString(length int) string {
	if length <= 0 {
		length = 16
	}
	buf := make([]byte, length)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)[:length]
}

// Sign 生成 md5 签名。
func Sign(values ...string) string {
	joined := strings.Join(values, "&")
	sum := md5.Sum([]byte(joined))
	return hex.EncodeToString(sum[:])
}

// ---------------------------------------------------------------------------
// 验证码存储（内存实现，生产环境可替换为 Redis）
// ---------------------------------------------------------------------------

type codeStore struct {
	mu   sync.RWMutex
	data map[string]codeEntry
}

type codeEntry struct {
	code      string
	expiresAt time.Time
	attempts  int
}

func newCodeStore() *codeStore {
	return &codeStore{data: map[string]codeEntry{}}
}

func (s *codeStore) Save(key, code string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data[key] = codeEntry{code: code, expiresAt: time.Now().Add(ttl)}
}

func (s *codeStore) Verify(key, code string) (bool, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.data[key]
	if !ok {
		return false, "验证码不存在或已失效"
	}
	if time.Now().After(entry.expiresAt) {
		delete(s.data, key)
		return false, "验证码已过期"
	}
	entry.attempts++
	if entry.attempts > 5 {
		delete(s.data, key)
		return false, "验证码错误次数过多，请重新获取"
	}
	s.data[key] = entry
	if entry.code != code {
		return false, "验证码错误"
	}
	delete(s.data, key)
	return true, ""
}

// CodeStore 是验证码存储的公共接口。
type CodeStore interface {
	Save(key, code string, ttl time.Duration)
	Verify(key, code string) (bool, string)
}

// NewCodeStore 创建验证码存储。
func NewCodeStore() CodeStore { return newCodeStore() }

var _ = fmt.Sprintf
var _ = zap.String
var _ = shoplogger.L
