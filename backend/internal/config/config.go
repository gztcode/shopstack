// Package config 负责加载和解析微服务配置。
//
// 配置优先级（从低到高）：
//  1. 内置默认值
//  2. YAML 配置文件
//  3. 环境变量（前缀 SHOP_，如 SHOP_SERVER_GRPC_ADDR）
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	ServiceName string            `yaml:"service_name"`
	Env         string            `yaml:"env"`
	Server      ServerConfig      `yaml:"server"`
	MySQL       MySQLConfig       `yaml:"mysql"`
	Redis       RedisConfig       `yaml:"redis"`
	RabbitMQ    RabbitMQConfig    `yaml:"rabbitmq"`
	Nacos       NacosConfig       `yaml:"nacos"`
	JWT         JWTConfig         `yaml:"jwt"`
	Log         LogConfig         `yaml:"log"`
	ThirdParty  ThirdPartyConfig  `yaml:"third_party"`
	Services    map[string]string `yaml:"services"`
}

type ServerConfig struct {
	GRPCAddr string `yaml:"grpc_addr"`
	HTTPAddr string `yaml:"http_addr"`
	Timeout  int    `yaml:"timeout"`
}

type MySQLConfig struct {
	Host     string   `yaml:"host"`
	Port     int      `yaml:"port"`
	User     string   `yaml:"user"`
	Password string   `yaml:"password"`
	Database string   `yaml:"database"`
	Charset  string   `yaml:"charset"`
	MaxIdle  int      `yaml:"max_idle"`
	MaxOpen  int      `yaml:"max_open"`
	Extra    []string `yaml:"extra"`
}

func (m MySQLConfig) DSN() string {
	charset := m.Charset
	if charset == "" {
		charset = "utf8mb4"
	}
	extra := strings.Join(m.Extra, "&")
	if extra != "" {
		extra = "&" + extra
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local%s",
		m.User, m.Password, m.Host, m.Port, m.Database, charset, extra)
}

type RedisConfig struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
	PoolSize int    `yaml:"pool_size"`
}

type RabbitMQConfig struct {
	URL          string `yaml:"url"`
	Exchange     string `yaml:"exchange"`
	ExchangeType string `yaml:"exchange_type"`
	Prefetch     int    `yaml:"prefetch"`
}

type NacosConfig struct {
	Enabled      bool   `yaml:"enabled"`
	ServerAddr   string `yaml:"server_addr"`
	Namespace    string `yaml:"namespace"`
	Group        string `yaml:"group"`
	Username     string `yaml:"username"`
	Password     string `yaml:"password"`
	RegisterIP   string `yaml:"register_ip"`
	RegisterPort int    `yaml:"register_port"`
}

type JWTConfig struct {
	Secret          string `yaml:"secret"`
	AccessExpire    int    `yaml:"access_expire"`  // 秒
	RefreshExpire   int    `yaml:"refresh_expire"` // 秒
	AdminSecret     string `yaml:"admin_secret"`
	AdminAccessExp  int    `yaml:"admin_access_expire"`
	AdminRefreshExp int    `yaml:"admin_refresh_expire"`
}

type LogConfig struct {
	Level    string `yaml:"level"`
	Format   string `yaml:"format"` // json | console
	Output   string `yaml:"output"`
	Filename string `yaml:"filename"`
}

type ThirdPartyConfig struct {
	WeChatAppID     string `yaml:"wechat_app_id"`
	WeChatAppSecret string `yaml:"wechat_app_secret"`
	WeChatMchID     string `yaml:"wechat_mch_id"`
	WeChatAPIKey    string `yaml:"wechat_api_key"`
	WeChatNotifyURL string `yaml:"wechat_notify_url"`
	AlipayAppID     string `yaml:"alipay_app_id"`
	AlipayPrivate   string `yaml:"alipay_private_key"`
	AlipayPublic    string `yaml:"alipay_public_key"`
	SMSProvider     string `yaml:"sms_provider"`
	SMSAccessKey    string `yaml:"sms_access_key"`
	SMSSecret       string `yaml:"sms_secret"`
	SMSSignName     string `yaml:"sms_sign_name"`
	OSSProvider     string `yaml:"oss_provider"`
	OSSAccessKey    string `yaml:"oss_access_key"`
	OSSSecretKey    string `yaml:"oss_secret_key"`
	OSSBucket       string `yaml:"oss_bucket"`
	OSSEndpoint     string `yaml:"oss_endpoint"`
	OSSPublicURL    string `yaml:"oss_public_url"`
}

// Default 返回内置默认配置。
func Default() *Config {
	return &Config{
		ServiceName: "unknown",
		Env:         "dev",
		Server:      ServerConfig{GRPCAddr: ":9000", HTTPAddr: ":8080", Timeout: 30},
		MySQL: MySQLConfig{
			Host: "127.0.0.1", Port: 3306, User: "shopstack", Password: "shopstack",
			Database: "shopstack", Charset: "utf8mb4", MaxIdle: 10, MaxOpen: 100,
			Extra: []string{"parseTime=True", "loc=Local"},
		},
		Redis:    RedisConfig{Addr: "127.0.0.1:6379", DB: 0, PoolSize: 50},
		RabbitMQ: RabbitMQConfig{URL: "amqp://shopstack:shopstack@127.0.0.1:5672/", Exchange: "shopstack.events", ExchangeType: "topic", Prefetch: 10},
		Nacos:    NacosConfig{Enabled: false, ServerAddr: "127.0.0.1:8848", Namespace: "public", Group: "DEFAULT_GROUP"},
		JWT: JWTConfig{
			Secret: "shopstack-dev-secret-change-me", AccessExpire: 7200, RefreshExpire: 604800,
			AdminSecret: "shopstack-dev-admin-secret-change-me", AdminAccessExp: 7200, AdminRefreshExp: 604800,
		},
		Log:        LogConfig{Level: "info", Format: "console", Output: "stdout"},
		ThirdParty: ThirdPartyConfig{SMSProvider: "mock", OSSProvider: "mock"},
		Services:   map[string]string{},
	}
}

// Load 读取 YAML 配置文件并应用环境变量覆盖。
func Load(path string) (*Config, error) {
	cfg := Default()

	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("读取配置文件 %s 失败: %w", path, err)
		}
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("解析配置文件 %s 失败: %w", path, err)
		}
	}

	applyEnvOverrides(cfg)
	return cfg, nil
}

// LoadDefault 依次尝试常见位置加载配置文件。
//
// 找不到配置文件时回退到内置默认配置，并同样应用环境变量覆盖，
// 保证仅用环境变量也能完成部署。
func LoadDefault(name string) (*Config, error) {
	candidates := []string{
		os.Getenv("SHOP_CONFIG"),
		filepath.Join("configs", name+".yaml"),
		filepath.Join("..", "configs", name+".yaml"),
		filepath.Join("..", "..", "configs", name+".yaml"),
		filepath.Join("/", "app", "configs", name+".yaml"),
	}
	for _, c := range candidates {
		if c == "" {
			continue
		}
		if _, err := os.Stat(c); err == nil {
			return Load(c)
		}
	}
	cfg := Default()
	applyEnvOverrides(cfg)
	return cfg, nil
}

func applyEnvOverrides(cfg *Config) {
	envStr("SHOP_SERVICE_NAME", &cfg.ServiceName)
	envStr("SHOP_ENV", &cfg.Env)
	envStr("SHOP_GRPC_ADDR", &cfg.Server.GRPCAddr)
	envStr("SHOP_HTTP_ADDR", &cfg.Server.HTTPAddr)

	envStr("SHOP_MYSQL_HOST", &cfg.MySQL.Host)
	envInt("SHOP_MYSQL_PORT", &cfg.MySQL.Port)
	envStr("SHOP_MYSQL_USER", &cfg.MySQL.User)
	envStr("SHOP_MYSQL_PASSWORD", &cfg.MySQL.Password)
	envStr("SHOP_MYSQL_DATABASE", &cfg.MySQL.Database)

	envStr("SHOP_REDIS_ADDR", &cfg.Redis.Addr)
	envStr("SHOP_REDIS_PASSWORD", &cfg.Redis.Password)
	envInt("SHOP_REDIS_DB", &cfg.Redis.DB)

	envStr("SHOP_RABBITMQ_URL", &cfg.RabbitMQ.URL)

	envStr("SHOP_NACOS_ADDR", &cfg.Nacos.ServerAddr)
	envBool("SHOP_NACOS_ENABLED", &cfg.Nacos.Enabled)

	envStr("SHOP_JWT_SECRET", &cfg.JWT.Secret)
	envStr("SHOP_ADMIN_JWT_SECRET", &cfg.JWT.AdminSecret)

	envStr("SHOP_WECHAT_APP_ID", &cfg.ThirdParty.WeChatAppID)
	envStr("SHOP_WECHAT_APP_SECRET", &cfg.ThirdParty.WeChatAppSecret)
	envStr("SHOP_WECHAT_MCH_ID", &cfg.ThirdParty.WeChatMchID)
	envStr("SHOP_WECHAT_API_KEY", &cfg.ThirdParty.WeChatAPIKey)
	envStr("SHOP_SMS_ACCESS_KEY", &cfg.ThirdParty.SMSAccessKey)
	envStr("SHOP_SMS_SECRET", &cfg.ThirdParty.SMSSecret)
	envStr("SHOP_OSS_ACCESS_KEY", &cfg.ThirdParty.OSSAccessKey)
	envStr("SHOP_OSS_SECRET_KEY", &cfg.ThirdParty.OSSSecretKey)
	envStr("SHOP_OSS_BUCKET", &cfg.ThirdParty.OSSBucket)
	envStr("SHOP_OSS_ENDPOINT", &cfg.ThirdParty.OSSEndpoint)
}

// ServiceAddr 返回指定依赖服务的 gRPC 地址。
func (c *Config) ServiceAddr(name string) string {
	if addr, ok := c.Services[name]; ok && addr != "" {
		return addr
	}
	return defaultServiceAddr(name)
}

var defaultAddrs = map[string]string{
	"user":         "127.0.0.1:9001",
	"product":      "127.0.0.1:9002",
	"cart":         "127.0.0.1:9003",
	"order":        "127.0.0.1:9004",
	"payment":      "127.0.0.1:9005",
	"inventory":    "127.0.0.1:9006",
	"marketing":    "127.0.0.1:9007",
	"logistics":    "127.0.0.1:9008",
	"notification": "127.0.0.1:9009",
}

func defaultServiceAddr(name string) string {
	if a, ok := defaultAddrs[name]; ok {
		return a
	}
	return ""
}

// AllServiceAddrs 返回所有已知服务的地址映射。
func (c *Config) AllServiceAddrs() map[string]string {
	out := make(map[string]string, len(defaultAddrs))
	for k, v := range defaultAddrs {
		out[k] = v
	}
	for k, v := range c.Services {
		out[k] = v
	}
	return out
}

func envStr(key string, target *string) {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		*target = v
	}
}

func envInt(key string, target *int) {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			*target = n
		}
	}
}

func envBool(key string, target *bool) {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			*target = b
		}
	}
}

var (
	once sync.Once
	inst *Config
)

// Global 返回进程级共享配置实例。
func Global() *Config {
	once.Do(func() {
		c, err := LoadDefault(os.Getenv("SHOP_SERVICE_NAME"))
		if err != nil {
			c = Default()
		}
		inst = c
	})
	return inst
}

// AccessExpireDuration 返回访问令牌有效期。
func (c *Config) AccessExpireDuration() time.Duration {
	return time.Duration(c.JWT.AccessExpire) * time.Second
}
