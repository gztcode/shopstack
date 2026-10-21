// Package cache 封装 Redis 客户端，提供缓存与分布式锁能力。
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// Client 包装 redis.Client。
type Client struct {
	rdb *redis.Client
}

// Options 控制 Redis 连接行为。
type Options struct {
	Addr     string
	Password string
	DB       int
	PoolSize int
}

// New 创建并连通 Redis 客户端。
func New(opts Options) (*Client, error) {
	if opts.PoolSize <= 0 {
		opts.PoolSize = 50
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:         opts.Addr,
		Password:     opts.Password,
		DB:           opts.DB,
		PoolSize:     opts.PoolSize,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("Redis 连通性检查失败: %w", err)
	}
	return &Client{rdb: rdb}, nil
}

// Client 暴露底层 redis 客户端。
func (c *Client) Client() *redis.Client { return c.rdb }

// Close 关闭连接。
func (c *Client) Close() error { return c.rdb.Close() }

// GetString 读取字符串。
func (c *Client) GetString(ctx context.Context, key string) (string, error) {
	return c.rdb.Get(ctx, key).Result()
}

// SetString 写入字符串。
func (c *Client) SetString(ctx context.Context, key, value string, ttl time.Duration) error {
	return c.rdb.Set(ctx, key, value, ttl).Err()
}

// Del 删除键。
func (c *Client) Del(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.rdb.Del(ctx, keys...).Err()
}

// Exists 判断键是否存在。
func (c *Client) Exists(ctx context.Context, key string) (bool, error) {
	n, err := c.rdb.Exists(ctx, key).Result()
	return n > 0, err
}

// Incr 自增并返回新值。
func (c *Client) Incr(ctx context.Context, key string) (int64, error) {
	return c.rdb.Incr(ctx, key).Result()
}

// Decr 自减。
func (c *Client) Decr(ctx context.Context, key string) (int64, error) {
	return c.rdb.Decr(ctx, key).Result()
}

// Expire 设置过期时间。
func (c *Client) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return c.rdb.Expire(ctx, key, ttl).Err()
}

// GetJSON 读取并反序列化 JSON。
func (c *Client) GetJSON(ctx context.Context, key string, dest any) error {
	data, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dest)
}

// SetJSON 序列化并写入 JSON。
func (c *Client) SetJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, key, data, ttl).Err()
}

// SetNX 分布式锁：仅当 key 不存在时设置成功。
func (c *Client) SetNX(ctx context.Context, key, value string, ttl time.Duration) (bool, error) {
	return c.rdb.SetNX(ctx, key, value, ttl).Result()
}

// DelByPattern 按模式删除键。
func (c *Client) DelByPattern(ctx context.Context, pattern string) error {
	iter := c.rdb.Scan(ctx, 0, pattern, 100).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}
	if len(keys) > 0 {
		return c.rdb.Del(ctx, keys...).Err()
	}
	return nil
}

// Lock 是一个简易的 Redis 分布式锁。
type Lock struct {
	client *Client
	key    string
	value  string
	ttl    time.Duration
}

// AcquireLock 尝试获取分布式锁。
func (c *Client) AcquireLock(ctx context.Context, key string, ttl time.Duration) (*Lock, bool, error) {
	value := fmt.Sprintf("%d", time.Now().UnixNano())
	ok, err := c.SetNX(ctx, key, value, ttl)
	if err != nil {
		return nil, false, err
	}
	if !ok {
		return nil, false, nil
	}
	return &Lock{client: c, key: key, value: value, ttl: ttl}, true, nil
}

// Release 释放锁（仅释放自己持有的锁）。
func (l *Lock) Release(ctx context.Context) error {
	const script = `
	if redis.call("get", KEYS[1]) == ARGV[1] then
		return redis.call("del", KEYS[1])
	else
		return 0
	end`
	return l.client.rdb.Eval(ctx, script, []string{l.key}, l.value).Err()
}

// ---------------------------------------------------------------------------
// 业务缓存键
// ---------------------------------------------------------------------------

const (
	KeyProductPrefix   = "shop:product:"
	KeyCategoryPrefix  = "shop:category:"
	KeyCartPrefix      = "shop:cart:"
	KeyUserPrefix      = "shop:user:"
	KeyStockPrefix     = "shop:stock:"
	KeyHomeBanner      = "shop:home:banner"
	KeyHomeCategories  = "shop:home:categories"
	KeyHomeRecommend   = "shop:home:recommend"
	KeySearchPrefix    = "shop:search:"
	KeyAdminPermission = "shop:admin:perm:"
)

// CacheKey 按前缀与 ID 拼接缓存键。
func CacheKey(prefix string, id int64) string {
	return fmt.Sprintf("%s%d", prefix, id)
}

// LogCacheError 记录缓存错误但不中断业务流程。
func LogCacheError(op string, err error) {
	if err == nil || err == redis.Nil {
		return
	}
	shoplogger.L().Warn("Redis 操作失败", zap.String("操作", op), zap.Error(err))
}
