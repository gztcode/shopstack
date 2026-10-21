// Package marketing 实现优惠券、促销活动与结算试算相关的业务能力。
package marketing

import (
	"time"
)

// 优惠券类型
const (
	CouponTypeFixed    = 1 // 满减券
	CouponTypePercent  = 2 // 折扣券
	CouponTypeShipping = 3 // 免运费券
)

// 用户优惠券状态
const (
	UserCouponStatusUnused  = 1
	UserCouponStatusUsed    = 2
	UserCouponStatusExpired = 3
)

// 促销活动类型
const (
	PromotionTypeFullReduction = 1 // 满减
	PromotionTypeDiscount      = 2 // 折扣
	PromotionTypeSeckill       = 3 // 秒杀
	PromotionTypeGroupBuy      = 4 // 拼团
)

// 促销活动状态
const (
	PromotionStatusNotStarted = 0 // 未开始
	PromotionStatusRunning    = 1 // 进行中
	PromotionStatusFinished   = 2 // 已结束
	PromotionStatusOffline    = 3 // 已下线
)

// Coupon 是优惠券模型。
type Coupon struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string    `gorm:"type:varchar(128);not null" json:"name"`
	Code             string    `gorm:"type:varchar(64);not null;uniqueIndex:uk_code" json:"code"`
	Type             int8      `gorm:"tinyint;not null;default:1" json:"type"`
	FaceValueCents   int64     `gorm:"bigint;not null;default:0" json:"face_value_cents"`
	Percent          int32     `gorm:"int;not null;default:100" json:"percent"`
	MinAmountCents   int64     `gorm:"bigint;not null;default:0" json:"min_amount_cents"`
	MaxDiscountCents int64     `gorm:"bigint;not null;default:0" json:"max_discount_cents"`
	TotalQuantity    int64     `gorm:"bigint;not null;default:0" json:"total_quantity"`
	ReceivedQuantity int64     `gorm:"bigint;not null;default:0" json:"received_quantity"`
	UsedQuantity     int64     `gorm:"bigint;not null;default:0" json:"used_quantity"`
	PerUserLimit     int64     `gorm:"bigint;not null;default:1" json:"per_user_limit"`
	StartTime        time.Time `gorm:"type:datetime;not null;index:idx_enabled_time,priority:2" json:"start_time"`
	EndTime          time.Time `gorm:"type:datetime;not null;index:idx_enabled_time,priority:3" json:"end_time"`
	CategoryID       uint64    `gorm:"bigint unsigned;not null;default:0" json:"category_id"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled   bool      `gorm:"tinyint;not null;index:idx_enabled_time,priority:1" json:"enabled"`
	CreatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (Coupon) TableName() string { return "coupons" }

// UserCoupon 是用户持有的优惠券模型。
//
// 表结构上 (user_id, coupon_id) 有唯一键，因此同一张券每个用户只会有一条领取记录。
type UserCoupon struct {
	ID         uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint64     `gorm:"bigint unsigned;not null;uniqueIndex:uk_user_coupon;index:idx_user_status,priority:1" json:"user_id"`
	CouponID   uint64     `gorm:"bigint unsigned;not null;uniqueIndex:uk_user_coupon" json:"coupon_id"`
	Status     int8       `gorm:"tinyint;not null;default:1;index:idx_user_status,priority:2" json:"status"`
	OrderID    uint64     `gorm:"bigint unsigned;not null;default:0" json:"order_id"`
	ReceivedAt time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"received_at"`
	UsedAt     *time.Time `gorm:"type:datetime" json:"used_at"`
}

// TableName 指定表名。
func (UserCoupon) TableName() string { return "user_coupons" }

// Promotion 是促销活动模型。
type Promotion struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name           string    `gorm:"type:varchar(128);not null" json:"name"`
	Description    string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Type           int8      `gorm:"tinyint;not null;default:1" json:"type"`
	Status         int8      `gorm:"tinyint;not null;default:0;index:idx_status_time,priority:1" json:"status"`
	StartTime      time.Time `gorm:"type:datetime;not null;index:idx_status_time,priority:2" json:"start_time"`
	EndTime        time.Time `gorm:"type:datetime;not null;index:idx_status_time,priority:3" json:"end_time"`
	MinAmountCents int64     `gorm:"bigint;not null;default:0" json:"min_amount_cents"`
	DiscountCents  int64     `gorm:"bigint;not null;default:0" json:"discount_cents"`
	Percent        int32     `gorm:"int;not null;default:100" json:"percent"`
	ProductID      uint64    `gorm:"bigint unsigned;not null;default:0" json:"product_id"`
	LimitPerUser   int32     `gorm:"int;not null;default:0" json:"limit_per_user"`
	SoldCount      int64     `gorm:"bigint;not null;default:0" json:"sold_count"`
	BannerImage    string    `gorm:"type:varchar(512);not null;default:''" json:"banner_image"`
	CreatedAt      time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt      time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (Promotion) TableName() string { return "promotions" }

// LogisticTemplate 是运费模板模型。
//
// 该表由物流服务维护，营销服务仅在结算试算时读取，
// 因此不参与营销服务的自动建表。
type LogisticTemplate struct {
	ID                     uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name                   string    `gorm:"type:varchar(64);not null" json:"name"`
	Company                string    `gorm:"type:varchar(64);not null;default:''" json:"company"`
	CompanyCode            string    `gorm:"type:varchar(32);not null;default:''" json:"company_code"`
	FreightCents           int64     `gorm:"bigint;not null;default:0" json:"freight_cents"`
	FreeFreightAmountCents int64     `gorm:"bigint;not null;default:0" json:"free_freight_amount_cents"`
	Regions                string    `gorm:"type:varchar(512);not null;default:''" json:"regions"`
	Enabled                bool      `gorm:"tinyint;not null;default:1" json:"enabled"`
	Sort                   int32     `gorm:"int;not null;default:0" json:"sort"`
	CreatedAt              time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt              time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (LogisticTemplate) TableName() string { return "logistic_templates" }
