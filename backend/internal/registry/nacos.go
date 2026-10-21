// Package registry 提供轻量级服务注册与发现客户端。
//
// 这里直接对接 Nacos v1 开放 API（HTTP），不引入重量级 SDK，
// 保持构建轻量、行为可控。Nacos 不可用时上层会自动降级为静态地址。
package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// Instance 是注册中心中的一个服务实例。
type Instance struct {
	IP      string  `json:"ip"`
	Port    int     `json:"port"`
	Weight  float64 `json:"weight"`
	Healthy bool    `json:"healthy"`
	Enabled bool    `json:"enabled"`
	Service string  `json:"serviceName,omitempty"`
	Cluster string  `json:"clusterName,omitempty"`
}

// Addr 返回 host:port 形式��地址。
func (i Instance) Addr() string {
	return net_JoinHostPort(i.IP, i.Port)
}

func net_JoinHostPort(host string, port int) string {
	return host + ":" + strconv.Itoa(port)
}

// NacosClient 是 Nacos v1 开放 API 的 HTTP 客户端。
type NacosClient struct {
	serverAddr string
	namespace  string
	group      string
	username   string
	password   string
	http       *http.Client
}

// Options 控制 Nacos 客户端行为。
type Options struct {
	ServerAddr string
	Namespace  string
	Group      string
	Username   string
	Password   string
	Timeout    time.Duration
}

// NewNacosClient 创建 Nacos 客户端。
func NewNacosClient(opts Options) *NacosClient {
	if opts.Timeout <= 0 {
		opts.Timeout = 5 * time.Second
	}
	if opts.Group == "" {
		opts.Group = "DEFAULT_GROUP"
	}
	return &NacosClient{
		serverAddr: normalizeServerAddr(opts.ServerAddr),
		namespace:  opts.Namespace,
		group:      opts.Group,
		username:   opts.Username,
		password:   opts.Password,
		http:       &http.Client{Timeout: opts.Timeout},
	}
}

// normalizeServerAddr 补全协议头并去掉尾部斜杠。
//
// 配置里通常写 "127.0.0.1:8848" 或 "nacos:8848"（不带协议），
// 直接拼进 URL 会让 http.NewRequest 解析失败，这里统一补成 http://。
func normalizeServerAddr(addr string) string {
	addr = strings.TrimSpace(strings.TrimSuffix(addr, "/"))
	if addr == "" {
		return addr
	}
	if !strings.HasPrefix(addr, "http://") && !strings.HasPrefix(addr, "https://") {
		addr = "http://" + addr
	}
	return addr
}

// Register 注册一个服务实例。
func (c *NacosClient) Register(ctx context.Context, serviceName, ip string, port int, metadata map[string]string) error {
	query := url.Values{}
	query.Set("serviceName", serviceName)
	query.Set("ip", ip)
	query.Set("port", strconv.Itoa(port))
	query.Set("groupName", c.group)
	query.Set("namespaceId", c.namespace)
	query.Set("weight", "1")
	query.Set("enabled", "true")
	query.Set("healthy", "true")
	query.Set("ephemeral", "true")
	for k, v := range metadata {
		query.Set("metadata."+k, v)
	}

	endpoint := c.serverAddr + "/nacos/v1/ns/instance?" + query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return err
	}
	c.withAuth(req)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("注册实例失败: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("注册实例返回 %d: %s", resp.StatusCode, string(body))
	}
	if !strings.Contains(string(body), "ok") {
		return fmt.Errorf("注册实例未成功: %s", string(body))
	}
	return nil
}

// Deregister 注销一个服务实例。
func (c *NacosClient) Deregister(ctx context.Context, serviceName, ip string, port int) error {
	query := url.Values{}
	query.Set("serviceName", serviceName)
	query.Set("ip", ip)
	query.Set("port", strconv.Itoa(port))
	query.Set("groupName", c.group)
	query.Set("namespaceId", c.namespace)
	query.Set("ephemeral", "true")

	endpoint := c.serverAddr + "/nacos/v1/ns/instance?" + query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return err
	}
	c.withAuth(req)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	return nil
}

type instanceListResponse struct {
	Hosts []Instance `json:"hosts"`
}

// SelectInstances 查询服务实例列表。
func (c *NacosClient) SelectInstances(ctx context.Context, serviceName string, healthyOnly bool) ([]Instance, error) {
	query := url.Values{}
	query.Set("serviceName", serviceName)
	query.Set("groupName", c.group)
	query.Set("namespaceId", c.namespace)
	query.Set("healthyOnly", strconv.FormatBool(healthyOnly))

	endpoint := c.serverAddr + "/nacos/v1/ns/instance/list?" + query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	c.withAuth(req)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("查询服务实例失败: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("查询服务实例返回 %d: %s", resp.StatusCode, string(body))
	}
	var result instanceListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("解析服务实例响应失败: %w", err)
	}
	return result.Hosts, nil
}

func (c *NacosClient) withAuth(req *http.Request) {
	if c.username != "" {
		req.SetBasicAuth(c.username, c.password)
	}
}

// Health 探测 Nacos 是否可用。
func (c *NacosClient) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.serverAddr+"/nacos/v1/console/health/liveness", nil)
	if err != nil {
		return err
	}
	c.withAuth(req)
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Nacos 健康检查返回 %d", resp.StatusCode)
	}
	return nil
}

// LogRegisterError 记录注册失败，便于排查但不阻断启动。
func LogRegisterError(serviceName string, err error) {
	shoplogger.L().Warn("服务注册失败（将使用静态地址）",
		zap.String("服务", serviceName), zap.Error(err))
}
