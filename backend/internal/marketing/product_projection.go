package marketing

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// ProductSummary 是商品表在营销域的只读投影。
//
// 商品表由商品服务维护，营销域只在活动、拼团的场景下读取商品标题、
// 封面与价格区间，不参与其结构维护。
type ProductSummary struct {
	ID            uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Title         string         `gorm:"column:title;type:varchar(200);not null" json:"title"`
	Cover         string         `gorm:"column:cover;type:varchar(512);not null;default:''" json:"cover"`
	MinPriceCents int64          `gorm:"column:min_price_cents;not null;default:0" json:"min_price_cents"`
	MaxPriceCents int64          `gorm:"column:max_price_cents;not null;default:0" json:"max_price_cents"`
	SalesCount    int            `gorm:"column:sales_count;not null;default:0" json:"sales_count"`
	Status        int8           `gorm:"tinyint;not null;default:1" json:"status"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (ProductSummary) TableName() string { return "products" }

// ProductSkuSummary 是商品规格表在营销域的只读投影，用于统计活动商品的库存。
type ProductSkuSummary struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID uint64 `gorm:"column:product_id;not null;index" json:"product_id"`
	Stock     int    `gorm:"not null;default:0" json:"stock"`
	Enabled   bool   `gorm:"tinyint;not null;default:1" json:"enabled"`
}

// TableName 指定表名。
func (ProductSkuSummary) TableName() string { return "product_skus" }

// FindProductSummary 按 ID 查询商品摘要。
func (r *Repo) FindProductSummary(ctx context.Context, id uint64) (*ProductSummary, error) {
	var p ProductSummary
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeProductNotFound, "商品不存在")
		}
		return nil, err
	}
	return &p, nil
}

// ProductStockTotal 统计商品启用规格的总库存。
func (r *Repo) ProductStockTotal(ctx context.Context, productID uint64) (int, error) {
	var total int
	err := r.db.WithContext(ctx).Model(&ProductSkuSummary{}).
		Where("product_id = ? AND enabled = ?", productID, true).
		Select("COALESCE(SUM(stock), 0)").Scan(&total).Error
	return total, err
}
