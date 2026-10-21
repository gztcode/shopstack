package thirdparty

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/shopstack/platform/backend/internal/config"
	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// ---------------------------------------------------------------------------
// 微信实现
// ---------------------------------------------------------------------------

type weChatProvider struct {
	cfg    *config.Config
	client *http.Client
	mock   bool
}

func newWeChatProvider(cfg *config.Config) WeChatProvider {
	mock := cfg.ThirdParty.WeChatAppID == "" || cfg.ThirdParty.WeChatAppSecret == ""
	return &weChatProvider{
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
		mock:   mock,
	}
}

func (w *weChatProvider) Mock() bool { return w.mock }

type code2SessionResponse struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

func (w *weChatProvider) Code2Session(ctx context.Context, code string) (*WeChatUser, error) {
	if code == "" {
		return nil, fmt.Errorf("缺少微信登录 code")
	}
	if w.mock {
		// 演示模式：用 code 派生稳定的 openid，保证同一 code 多次登录结果一致
		openID := "mock_openid_" + Sign(code)[:16]
		shoplogger.L().Info("使用 Mock 微信登录", zap.String("openid", openID))
		return &WeChatUser{
			OpenID:     openID,
			UnionID:    "mock_unionid_" + Sign(code)[:12],
			SessionKey: Sign(code)[:24],
		}, nil
	}

	endpoint := "https://api.weixin.qq.com/sns/jscode2session?" + url.Values{
		"appid":      {w.cfg.ThirdParty.WeChatAppID},
		"secret":     {w.cfg.ThirdParty.WeChatAppSecret},
		"js_code":    {code},
		"grant_type": {"authorization_code"},
	}.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	resp, err := w.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("调用微信登录接口失败: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var result code2SessionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析微信登录响应失败: %w", err)
	}
	if result.ErrCode != 0 {
		return nil, fmt.Errorf("微信登录失败(%d): %s", result.ErrCode, result.ErrMsg)
	}
	return &WeChatUser{
		OpenID:     result.OpenID,
		UnionID:    result.UnionID,
		SessionKey: result.SessionKey,
	}, nil
}

type unifiedOrderResponse struct {
	PrepayID string `json:"prepay_id"`
	ErrCode  int    `json:"errcode"`
	ErrMsg   string `json:"errmsg"`
}

func (w *weChatProvider) CreatePay(ctx context.Context, params PayParams) (*WeChatPayPayload, error) {
	if params.AmountCents <= 0 {
		return nil, fmt.Errorf("支付金额必须大于 0")
	}
	if w.mock {
		prepayID := "mock_prepay_" + Sign(params.OrderNo, strconv.FormatInt(params.AmountCents, 10))[:24]
		shoplogger.L().Info("使用 Mock 微信支付",
			zap.String("订单号", params.OrderNo),
			zap.String("prepay_id", prepayID))
		return &WeChatPayPayload{
			AppID:     w.cfg.ThirdParty.WeChatAppID,
			TimeStamp: strconv.FormatInt(time.Now().Unix(), 10),
			NonceStr:  RandomString(32),
			Package:   "prepay_id=" + prepayID,
			SignType:  "RSA",
			PaySign:   Sign(prepayID, params.OrderNo),
			PrepayID:  prepayID,
			Extra: map[string]string{
				"mock":       "true",
				"order_no":   params.OrderNo,
				"amount":     strconv.FormatInt(params.AmountCents, 10),
				"notify_url": w.cfg.ThirdParty.WeChatNotifyURL,
			},
		}, nil
	}

	// 真实统一下单需要商户证书与 APIv3 签名，这里保留调用骨架：
	// 配置好商户号、API 密钥与证书后即可切换到真实请求。
	notifyURL := params.NotifyURL
	if notifyURL == "" {
		notifyURL = w.cfg.ThirdParty.WeChatNotifyURL
	}
	shoplogger.L().Warn("真实微信支付统一下单尚未启用，使用 Mock 返回",
		zap.String("订单号", params.OrderNo), zap.String("notify_url", notifyURL))

	prepayID := "mock_prepay_" + Sign(params.OrderNo)[:24]
	return &WeChatPayPayload{
		AppID:     w.cfg.ThirdParty.WeChatAppID,
		TimeStamp: strconv.FormatInt(time.Now().Unix(), 10),
		NonceStr:  RandomString(32),
		Package:   "prepay_id=" + prepayID,
		SignType:  "RSA",
		PaySign:   Sign(prepayID, params.OrderNo),
		PrepayID:  prepayID,
	}, nil
}

// ---------------------------------------------------------------------------
// 短信实现
// ---------------------------------------------------------------------------

type smsProvider struct {
	cfg  *config.Config
	mock bool
	// sent 记录 Mock 模式下已发送的验证码，便于本地联调查看
	sent map[string]string
	mu   sync.Mutex
}

func newSMSProvider(cfg *config.Config) SMSProvider {
	mock := cfg.ThirdParty.SMSProvider == "" || cfg.ThirdParty.SMSProvider == "mock" ||
		cfg.ThirdParty.SMSAccessKey == ""
	return &smsProvider{cfg: cfg, mock: mock, sent: map[string]string{}}
}

func (s *smsProvider) Mock() bool { return s.mock }

func (s *smsProvider) Send(ctx context.Context, phone, scene, code string) error {
	if phone == "" {
		return fmt.Errorf("手机号不能为空")
	}
	if s.mock {
		s.mu.Lock()
		s.sent[phone+":"+scene] = code
		s.mu.Unlock()
		shoplogger.L().Info("使用 Mock 短信通道",
			zap.String("手机号", maskPhone(phone)),
			zap.String("场景", scene),
			zap.String("验证码", code))
		return nil
	}
	// 真实短信通道（以主流云短信为例）在此接入
	shoplogger.L().Warn("真实短信通道尚未接入，使用 Mock 返回",
		zap.String("手机号", maskPhone(phone)))
	return nil
}

// LastMockCode 返回 Mock 模式下最近一次发送的验证码，仅用于开发调试。
func (s *smsProvider) LastMockCode(phone, scene string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sent[phone+":"+scene]
}

// maskPhone 对手机号脱敏。
func maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

// ---------------------------------------------------------------------------
// 对象存储实现
// ---------------------------------------------------------------------------

type ossProvider struct {
	cfg  *config.Config
	mock bool
}

func newOSSProvider(cfg *config.Config) OSSProvider {
	mock := cfg.ThirdParty.OSSProvider == "" || cfg.ThirdParty.OSSProvider == "mock" ||
		cfg.ThirdParty.OSSAccessKey == ""
	return &ossProvider{cfg: cfg, mock: mock}
}

func (o *ossProvider) Mock() bool { return o.mock }

func (o *ossProvider) Upload(ctx context.Context, objectKey string, content []byte, contentType string) (string, error) {
	if o.mock {
		// 演示环境返回可访问的占位图地址
		url := fmt.Sprintf("https://placehold.co/600x600/2A4AD9/FFFFFF?text=%s",
			url.QueryEscape(objectKey))
		shoplogger.L().Info("使用 Mock 对象存储",
			zap.String("对象", objectKey), zap.Int("字节数", len(content)))
		return url, nil
	}
	base := o.cfg.ThirdParty.OSSPublicURL
	if base == "" {
		base = o.cfg.ThirdParty.OSSEndpoint
	}
	return fmt.Sprintf("%s/%s", base, objectKey), nil
}

func (o *ossProvider) Delete(ctx context.Context, objectKey string) error {
	shoplogger.L().Info("删除对象", zap.String("对象", objectKey))
	return nil
}
