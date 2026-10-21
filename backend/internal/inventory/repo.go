// Package inventory 实现库存服务，负责预占、释放、扣减与库存流水。
//
// 库存模型采用「总量 = 可用 + 锁定 + 已售」的三段式账本：
//   - 预占（Reserve）：下单时锁定库存，available 减少、locked 增加。
//   - 释放（Release）：订单取消或超时未支付，把 locked 归还 available。
//   - 扣减（Deduct）：支付成功后，把 locked 转为 sold。
//
// 所有变更都使用乐观锁（version 字段）+ 行级条件更新，防止超卖。
package inventory

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 库存变更类型
const (
	ChangeTypeInbound  = 1 // 入库
	ChangeTypeReserve  = 2 // 预占
	ChangeTypeRelease  = 3 // 释放
	ChangeTypeDeduct   = 4 // 扣减
	ChangeTypeAdjust   = 5 // 调整
	ChangeTypeReturnIn = 6 // 退货入库
)

// Inventory 是库存模型。
type Inventory struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	SKUID          uint64    `gorm:"column:sku_id;not null;uniqueIndex" json:"sku_id"`
	ProductID      uint64    `gorm:"column:product_id;not null;default:0;index" json:"product_id"`
	SKUCode        string    `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
	SpecText       string    `gorm:"column:spec_text;type:varchar(255);not null;default:''" json:"spec_text"`
	TotalStock     int       `gorm:"column:total_stock;not null;default:0" json:"total_stock"`
	AvailableStock int       `gorm:"column:available_stock;not null;default:0;index" json:"available_stock"`
	LockedStock    int       `gorm:"column:locked_stock;not null;default:0" json:"locked_stock"`
	SoldStock      int       `gorm:"column:sold_stock;not null;default:0" json:"sold_stock"`
	SafetyStock    int       `gorm:"column:safety_stock;not null;default:0" json:"safety_stock"`
	Warehouse      string    `gorm:"type:varchar(64);not null;default:'默认仓'" json:"warehouse"`
	Version        int       `gorm:"not null;default:0" json:"version"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Inventory) TableName() string { return "inventories" }

// InventoryLog 是库存流水模型。
type InventoryLog struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	SKUID       uint64    `gorm:"column:sku_id;not null;index" json:"sku_id"`
	ProductID   uint64    `gorm:"column:product_id;not null;default:0" json:"product_id"`
	SKUCode     string    `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
	ChangeType  int8      `gorm:"column:change_type;not null" json:"change_type"`
	Quantity    int       `gorm:"not null;default:0" json:"quantity"`
	BeforeStock int       `gorm:"column:before_stock;not null;default:0" json:"before_stock"`
	AfterStock  int       `gorm:"column:after_stock;not null;default:0" json:"after_stock"`
	BizType     string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	BizID       string    `gorm:"column:biz_id;type:varchar(64);not null;default:'';index" json:"biz_id"`
	Operator    string    `gorm:"type:varchar(64);not null;default:''" json:"operator"`
	Remark      string    `gorm:"type:varchar(255);not null;default:''" json:"remark"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName 指定表名。
func (InventoryLog) TableName() string { return "inventory_logs" }

// StockItem 表示一次库存操作中的一条 SKU 明细。
type StockItem struct {
	SKUID    uint64
	Quantity int
}

// Repo 封装库存域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// FindBySKU 按 SKU 查询库存。
func (r *Repo) FindBySKU(ctx context.Context, skuID uint64) (*Inventory, error) {
	var inv Inventory
	if err := r.db.WithContext(ctx).Where("sku_id = ?", skuID).First(&inv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		return nil, err
	}
	return &inv, nil
}

// FindBySKUs 批量查询库存。
func (r *Repo) FindBySKUs(ctx context.Context, skuIDs []uint64) ([]Inventory, error) {
	if len(skuIDs) == 0 {
		return []Inventory{}, nil
	}
	var list []Inventory
	err := r.db.WithContext(ctx).Where("sku_id IN ?", skuIDs).Find(&list).Error
	return list, err
}

// EnsureInventory 保证库存记录存在，不存在时按初始值创建。
func (r *Repo) EnsureInventory(ctx context.Context, skuID, productID uint64, skuCode, specText string, initial int) (*Inventory, error) {
	inv, err := r.FindBySKU(ctx, skuID)
	if err == nil {
		return inv, nil
	}
	if !errs.IsCode(err, errs.CodeStockNotFound) {
		return nil, err
	}
	newInv := &Inventory{
		SKUID:          skuID,
		ProductID:      productID,
		SKUCode:        skuCode,
		SpecText:       specText,
		TotalStock:     initial,
		AvailableStock: initial,
		Warehouse:      "默认仓",
	}
	if err := r.db.WithContext(ctx).Create(newInv).Error; err != nil {
		// 并发创建时回退到查询
		if inv2, e2 := r.FindBySKU(ctx, skuID); e2 == nil {
			return inv2, nil
		}
		return nil, errs.Wrap(errs.CodeInternalError, "初始化库存失败", err)
	}
	return newInv, nil
}

// Reserve 预占库存：available -= qty, locked += qty。
//
// 使用带条件的原子更新（available_stock >= qty）防止超卖。
func (r *Repo) Reserve(ctx context.Context, skuID uint64, qty int, bizType, bizID string) (int, error) {
	if qty <= 0 {
		return 0, errs.Invalid("预占数量必须大于 0")
	}
	var before int
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv Inventory
		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		if inv.AvailableStock < qty {
			return errs.New(errs.CodeStockInsufficient,
				"库存不足").WithDetail("available", strconvItoa(inv.AvailableStock))
		}
		before = inv.AvailableStock
		res := tx.Model(&Inventory{}).
			Where("sku_id = ? AND available_stock >= ?", skuID, qty).
			Updates(map[string]any{
				"available_stock": gorm.Expr("available_stock - ?", qty),
				"locked_stock":    gorm.Expr("locked_stock + ?", qty),
				"version":         gorm.Expr("version + 1"),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.New(errs.CodeStockInsufficient, "库存不足")
		}
		return tx.Create(&InventoryLog{
			SKUID:       skuID,
			ProductID:   inv.ProductID,
			SKUCode:     inv.SKUCode,
			ChangeType:  ChangeTypeReserve,
			Quantity:    -qty,
			BeforeStock: before,
			AfterStock:  before - qty,
			BizType:     bizType,
			BizID:       bizID,
		}).Error
	})
	return before, err
}

// Release 释放预占：locked -= qty, available += qty。
func (r *Repo) Release(ctx context.Context, skuID uint64, qty int, bizType, bizID, reason string) error {
	if qty <= 0 {
		return errs.Invalid("释放数量必须大于 0")
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv Inventory
		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		if inv.LockedStock < qty {
			qty = inv.LockedStock
		}
		if qty == 0 {
			return nil
		}
		res := tx.Model(&Inventory{}).
			Where("sku_id = ? AND locked_stock >= ?", skuID, qty).
			Updates(map[string]any{
				"available_stock": gorm.Expr("available_stock + ?", qty),
				"locked_stock":    gorm.Expr("locked_stock - ?", qty),
				"version":         gorm.Expr("version + 1"),
			})
		if res.Error != nil {
			return res.Error
		}
		return tx.Create(&InventoryLog{
			SKUID:       skuID,
			ProductID:   inv.ProductID,
			SKUCode:     inv.SKUCode,
			ChangeType:  ChangeTypeRelease,
			Quantity:    qty,
			BeforeStock: inv.AvailableStock,
			AfterStock:  inv.AvailableStock + qty,
			BizType:     bizType,
			BizID:       bizID,
			Remark:      reason,
		}).Error
	})
}

// Deduct 扣减库存：locked -= qty, sold += qty。
//
// 兼容直接扣减（无预占）的场景：此时从 available 中扣。
func (r *Repo) Deduct(ctx context.Context, skuID uint64, qty int, bizType, bizID string) error {
	if qty <= 0 {
		return errs.Invalid("扣减数量必须大于 0")
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv Inventory
		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		fromLocked := inv.LockedStock >= qty
		updates := map[string]any{
			"sold_stock": gorm.Expr("sold_stock + ?", qty),
			"version":    gorm.Expr("version + 1"),
		}
		if fromLocked {
			updates["locked_stock"] = gorm.Expr("locked_stock - ?", qty)
		} else {
			if inv.AvailableStock < qty {
				return errs.New(errs.CodeStockInsufficient, "库存不足")
			}
			updates["available_stock"] = gorm.Expr("available_stock - ?", qty)
		}
		if err := tx.Model(&Inventory{}).Where("sku_id = ?", skuID).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Create(&InventoryLog{
			SKUID:       skuID,
			ProductID:   inv.ProductID,
			SKUCode:     inv.SKUCode,
			ChangeType:  ChangeTypeDeduct,
			Quantity:    -qty,
			BeforeStock: inv.AvailableStock,
			AfterStock:  inv.AvailableStock,
			BizType:     bizType,
			BizID:       bizID,
		}).Error
	})
}

// Adjust 调整库存到目标值。
func (r *Repo) Adjust(ctx context.Context, skuID uint64, target, safetyStock int, warehouse, reason string) (*Inventory, error) {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv Inventory
		if e := tx.Where("sku_id = ?", skuID).First(&inv).Error; e != nil {
			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		delta := target - inv.AvailableStock
		updates := map[string]any{
			"available_stock": target,
			"total_stock":     inv.LockedStock + inv.SoldStock + target,
			"version":         gorm.Expr("version + 1"),
		}
		if safetyStock >= 0 {
			updates["safety_stock"] = safetyStock
		}
		if warehouse != "" {
			updates["warehouse"] = warehouse
		}
		if err := tx.Model(&Inventory{}).Where("sku_id = ?", skuID).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Create(&InventoryLog{
			SKUID:       skuID,
			ProductID:   inv.ProductID,
			SKUCode:     inv.SKUCode,
			ChangeType:  ChangeTypeAdjust,
			Quantity:    delta,
			BeforeStock: inv.AvailableStock,
			AfterStock:  target,
			BizType:     "manual",
			Operator:    "admin",
			Remark:      reason,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	return r.FindBySKU(ctx, skuID)
}

// ListInventories 分页查询库存列表。
func (r *Repo) ListInventories(ctx context.Context, keyword string, productID uint64, lowStockOnly bool, page, pageSize int) ([]Inventory, int64, error) {
	q := r.db.WithContext(ctx).Model(&Inventory{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("sku_code LIKE ? OR spec_text LIKE ?", like, like)
	}
	if productID > 0 {
		q = q.Where("product_id = ?", productID)
	}
	if lowStockOnly {
		q = q.Where("available_stock <= safety_stock")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Inventory
	err := q.Order("available_stock ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ListLogs 分页查询库存流水。
func (r *Repo) ListLogs(ctx context.Context, skuID, productID uint64, bizID string, changeType int32, page, pageSize int) ([]InventoryLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&InventoryLog{})
	if skuID > 0 {
		q = q.Where("sku_id = ?", skuID)
	}
	if productID > 0 {
		q = q.Where("product_id = ?", productID)
	}
	if bizID != "" {
		q = q.Where("biz_id = ?", bizID)
	}
	if changeType > 0 {
		q = q.Where("change_type = ?", changeType)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []InventoryLog
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// StockWarning 查询低于安全库存的商品。
func (r *Repo) StockWarning(ctx context.Context, threshold int) ([]Inventory, error) {
	q := r.db.WithContext(ctx).Model(&Inventory{}).Where("available_stock <= safety_stock")
	if threshold > 0 {
		q = q.Where("available_stock <= ?", threshold)
	}
	var list []Inventory
	err := q.Order("available_stock ASC").Limit(100).Find(&list).Error
	return list, err
}

func strconvItoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := [20]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
