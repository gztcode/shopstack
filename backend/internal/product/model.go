// Package product 实现商品、分类与评价相关的业务能力。
package product

import (
	"time"

	"gorm.io/gorm"
)

// 商品状态
const (
	StatusDraft    = 1
	StatusOnShelf  = 2
	StatusOffShelf = 3
)

// Category 是商品分类模型。
type Category struct {
	ID          uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string `gorm:"type:varchar(64);not null" json:"name"`
	ParentID    uint64 `gorm:"column:parent_id;not null;default:0;index" json:"parent_id"`
	Icon        string `gorm:"type:varchar(512);not null;default:''" json:"icon"`
	Description string `gorm:"type:varchar(255);not null;default:''" json:"description"`
	Sort        int    `gorm:"not null;default:0" json:"sort"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Visible   bool           `gorm:"not null" json:"visible"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (Category) TableName() string { return "categories" }

// Product 是商品（SPU）模型。
type Product struct {
	ID            uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string         `gorm:"type:varchar(200);not null" json:"title"`
	Subtitle      string         `gorm:"type:varchar(255);not null;default:''" json:"subtitle"`
	Cover         string         `gorm:"type:varchar(512);not null;default:''" json:"cover"`
	CategoryID    uint64         `gorm:"column:category_id;not null;default:0;index" json:"category_id"`
	MinPriceCents int64          `gorm:"column:min_price_cents;not null;default:0" json:"min_price_cents"`
	MaxPriceCents int64          `gorm:"column:max_price_cents;not null;default:0" json:"max_price_cents"`
	SalesCount    int            `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
	Status        int8           `gorm:"not null;default:1;index" json:"status"`
	Description   string         `gorm:"type:mediumtext" json:"description"`
	Tags          string         `gorm:"type:varchar(255);not null;default:''" json:"tags"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (Product) TableName() string { return "products" }

// ProductSku 是商品规格模型。
type ProductSku struct {
	ID                 uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID          uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
	SKUCode            string `gorm:"column:sku_code;type:varchar(64);not null;default:'';uniqueIndex" json:"sku_code"`
	SpecText           string `gorm:"column:spec_text;type:varchar(255);not null;default:''" json:"spec_text"`
	Specs              string `gorm:"type:varchar(512);not null;default:'{}'" json:"specs"`
	PriceCents         int64  `gorm:"column:price_cents;not null;default:0" json:"price_cents"`
	OriginalPriceCents int64  `gorm:"column:original_price_cents;not null;default:0" json:"original_price_cents"`
	Stock              int    `gorm:"not null;default:0" json:"stock"`
	Image              string `gorm:"type:varchar(512);not null;default:''" json:"image"`
	Sort               int    `gorm:"not null;default:0" json:"sort"`
	SalesCount         int    `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
	WeightGrams        int    `gorm:"column:weight_grams;not null;default:0" json:"weight_grams"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled   bool      `gorm:"not null" json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (ProductSku) TableName() string { return "product_skus" }

// ProductImage 是商品图集模型。
type ProductImage struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
	URL       string `gorm:"type:varchar(512);not null" json:"url"`
	Alt       string `gorm:"type:varchar(255);not null;default:''" json:"alt"`
	Sort      int    `gorm:"not null;default:0" json:"sort"`
}

// TableName 指定表名。
func (ProductImage) TableName() string { return "product_images" }

// ProductAttribute 是商品参数模型。
type ProductAttribute struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
	Name      string `gorm:"type:varchar(64);not null" json:"name"`
	Value     string `gorm:"type:varchar(255);not null;default:''" json:"value"`
	Sort      int    `gorm:"not null;default:0" json:"sort"`
}

// TableName 指定表名。
func (ProductAttribute) TableName() string { return "product_attributes" }

// Banner 是轮播位模型。
type Banner struct {
	ID       uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Title    string `gorm:"type:varchar(128);not null;default:''" json:"title"`
	Image    string `gorm:"type:varchar(512);not null;default:''" json:"image"`
	Link     string `gorm:"type:varchar(512);not null;default:''" json:"link"`
	Sort     int    `gorm:"not null;default:0" json:"sort"`
	Position string `gorm:"type:varchar(64);not null;default:'home_banner';index" json:"position"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Visible   bool      `gorm:"not null" json:"visible"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Banner) TableName() string { return "banners" }

// Review 是商品评价模型。
type Review struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID    uint64    `gorm:"column:product_id;not null;index" json:"product_id"`
	ProductTitle string    `gorm:"column:product_title;type:varchar(200);not null;default:''" json:"product_title"`
	UserID       uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	UserNickname string    `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	UserAvatar   string    `gorm:"column:user_avatar;type:varchar(512);not null;default:''" json:"user_avatar"`
	Rating       int8      `gorm:"not null;default:5" json:"rating"`
	Content      string    `gorm:"type:text" json:"content"`
	Images       string    `gorm:"type:varchar(1024);not null;default:''" json:"images"`
	SKUID        uint64    `gorm:"column:sku_id;not null;default:0" json:"sku_id"`
	SKUText      string    `gorm:"column:sku_text;type:varchar(255);not null;default:''" json:"sku_text"`
	Status       int8      `gorm:"not null;default:1;index" json:"status"`
	AdminReply   string    `gorm:"column:admin_reply;type:varchar(1024);not null;default:''" json:"admin_reply"`
	LikeCount    int       `gorm:"column:like_count;not null;default:0" json:"like_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Review) TableName() string { return "reviews" }

// 评价状态
const (
	ReviewPending  = 1
	ReviewApproved = 2
	ReviewRejected = 3
)
