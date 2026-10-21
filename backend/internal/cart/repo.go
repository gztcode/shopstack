// Package cart 实现购物车服务。
//
// 购物车条目以「用户 + SKU」唯一，同 SKU 重复加购时累加数量。
// 条目上冗余存储商品标题、规格与价格快照，避免列表页频繁跨服务查询；
// 但商品信息以实时查询结果为准（下单前会重新校验价格与库存）。
package cart

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// CartItem 是购物车条目模型。
type CartItem struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;uniqueIndex:uk_user_sku" json:"user_id"`
	ProductID uint64    `gorm:"column:product_id;not null" json:"product_id"`
	SKUID     uint64    `gorm:"column:sku_id;not null;uniqueIndex:uk_user_sku" json:"sku_id"`
	Quantity  int       `gorm:"not null;default:1" json:"quantity"`
	Selected  bool      `gorm:"not null;default:true" json:"selected"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (CartItem) TableName() string { return "cart_items" }

// Repo 封装购物车数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// ListItems 查询用户购物车条目。
func (r *Repo) ListItems(ctx context.Context, userID uint64) ([]CartItem, error) {
	var list []CartItem
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("updated_at DESC, id DESC").Find(&list).Error
	return list, err
}

// ListItemsByIDs 按 ID 批量查询条目。
func (r *Repo) ListItemsByIDs(ctx context.Context, userID uint64, ids []uint64) ([]CartItem, error) {
	if len(ids) == 0 {
		return []CartItem{}, nil
	}
	var list []CartItem
	err := r.db.WithContext(ctx).Where("user_id = ? AND id IN ?", userID, ids).Find(&list).Error
	return list, err
}

// FindItem 按 ID 查询条目。
func (r *Repo) FindItem(ctx context.Context, userID, id uint64) (*CartItem, error) {
	var item CartItem
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeCartItemNotFound, "购物车条目不存在")
		}
		return nil, err
	}
	return &item, nil
}

// FindBySKU 按 SKU 查询条目。
func (r *Repo) FindBySKU(ctx context.Context, userID, skuID uint64) (*CartItem, error) {
	var item CartItem
	if err := r.db.WithContext(ctx).Where("user_id = ? AND sku_id = ?", userID, skuID).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

// SaveItem 新增或更新条目。
func (r *Repo) SaveItem(ctx context.Context, item *CartItem) error {
	return r.db.WithContext(ctx).Save(item).Error
}

// UpdateItemFields 更新条目的指定字段。
func (r *Repo) UpdateItemFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&CartItem{}).Where("id = ?", id).Updates(fields).Error
}

// DeleteItem 删除条目。
func (r *Repo) DeleteItem(ctx context.Context, userID, id uint64) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&CartItem{}).Error
}

// DeleteItems 批量删除条目。
func (r *Repo) DeleteItems(ctx context.Context, userID uint64, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Where("user_id = ? AND id IN ?", userID, ids).Delete(&CartItem{}).Error
}

// Clear 清空购物车。
func (r *Repo) Clear(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&CartItem{}).Error
}

// SetAllSelected 设置全选状态。
func (r *Repo) SetAllSelected(ctx context.Context, userID uint64, selected bool) error {
	return r.db.WithContext(ctx).Model(&CartItem{}).Where("user_id = ?", userID).
		Update("selected", selected).Error
}

// CountItems 统计购物车条目数量。
func (r *Repo) CountItems(ctx context.Context, userID uint64) (int32, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&CartItem{}).Where("user_id = ?", userID).Count(&count).Error
	return int32(count), err
}
