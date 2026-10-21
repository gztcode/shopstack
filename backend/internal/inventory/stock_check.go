package inventory

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 盘点单状态
const (
	// StockCheckStatusOngoing 盘点中。
	StockCheckStatusOngoing = 0
	// StockCheckStatusDone 已完成。
	StockCheckStatusDone = 1
	// StockCheckStatusCancelled 已取消。
	StockCheckStatusCancelled = 2
)

// StockCheck 是盘点单模型。
type StockCheck struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	CheckNo       string    `gorm:"column:check_no;type:varchar(64);not null;uniqueIndex" json:"check_no"`
	WarehouseID   uint64    `gorm:"column:warehouse_id;not null;default:0;index" json:"warehouse_id"`
	WarehouseName string    `gorm:"column:warehouse_name;type:varchar(64);not null;default:''" json:"warehouse_name"`
	Status        int8      `gorm:"column:status;not null;default:0;index" json:"status"`
	TotalCount    int       `gorm:"column:total_count;not null;default:0" json:"total_count"`
	DiffCount     int       `gorm:"column:diff_count;not null;default:0" json:"diff_count"`
	Remark        string    `gorm:"column:remark;type:varchar(512);not null;default:''" json:"remark"`
	Operator      string    `gorm:"column:operator;type:varchar(64);not null;default:''" json:"operator"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (StockCheck) TableName() string { return "stock_checks" }

// StockCheckItem 是盘点明细模型。
type StockCheckItem struct {
	ID             uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	StockCheckID   uint64 `gorm:"column:stock_check_id;not null;index" json:"stock_check_id"`
	SKUID          uint64 `gorm:"column:sku_id;not null" json:"sku_id"`
	SKUCode        string `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
	SpecText       string `gorm:"column:spec_text;type:varchar(128);not null;default:''" json:"spec_text"`
	BookQuantity   int    `gorm:"column:book_quantity;not null;default:0" json:"book_quantity"`
	ActualQuantity int    `gorm:"column:actual_quantity;not null;default:0" json:"actual_quantity"`
	DiffQuantity   int    `gorm:"column:diff_quantity;not null;default:0" json:"diff_quantity"`
}

// TableName 指定表名。
func (StockCheckItem) TableName() string { return "stock_check_items" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListStockChecks 分页查询盘点单。
func (r *Repo) ListStockChecks(ctx context.Context, status int32, keyword string, page, pageSize int) ([]StockCheck, int64, error) {
	q := r.db.WithContext(ctx).Model(&StockCheck{})
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("check_no LIKE ? OR warehouse_name LIKE ? OR remark LIKE ?", like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []StockCheck
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindStockCheckByID 按 ID 查询盘点单。
func (r *Repo) FindStockCheckByID(ctx context.Context, id uint64) (*StockCheck, error) {
	var c StockCheck
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "盘点单不存在")
		}
		return nil, err
	}
	return &c, nil
}

// CreateStockCheckWithItems 在同一事务中创建盘点单与明细。
func (r *Repo) CreateStockCheckWithItems(ctx context.Context, check *StockCheck, items []StockCheckItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(check).Error; err != nil {
			return err
		}
		for i := range items {
			item := items[i]
			item.StockCheckID = check.ID
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ListStockCheckItems 查询盘点单明细。
func (r *Repo) ListStockCheckItems(ctx context.Context, stockCheckID uint64) ([]StockCheckItem, error) {
	var list []StockCheckItem
	err := r.db.WithContext(ctx).Where("stock_check_id = ?", stockCheckID).Order("id ASC").Find(&list).Error
	return list, err
}

// ListCheckScopeSKUs 返回指定仓库下需要盘点的 SKU。
//
// 库存台账以 SKU 为粒度，warehouse 字段是仓库名称；
// 若该仓库尚未绑定任何 SKU（台账里没有匹配记录），
// 则回退为当前所有有可用库存的 SKU，保证盘点单不会因为仓库尚未启用而产生空明细。
func (r *Repo) ListCheckScopeSKUs(ctx context.Context, warehouseName, warehouseCode string) ([]Inventory, error) {
	matched := make([]Inventory, 0)
	err := r.db.WithContext(ctx).Model(&Inventory{}).
		Where("warehouse = ? OR warehouse = ?", warehouseName, warehouseCode).
		Where("available_stock > 0 OR locked_stock > 0 OR sold_stock > 0").
		Order("id ASC").Find(&matched).Error
	if err != nil {
		return nil, err
	}
	if len(matched) > 0 {
		return matched, nil
	}
	var all []Inventory
	err = r.db.WithContext(ctx).Model(&Inventory{}).
		Where("available_stock > 0 OR locked_stock > 0 OR sold_stock > 0").
		Order("id ASC").Find(&all).Error
	if err != nil {
		return nil, err
	}
	return all, nil
}

// FindInventoryBySKU 按 SKU 查询库存台账。
func (r *Repo) FindInventoryBySKU(ctx context.Context, skuID uint64) (*Inventory, error) {
	var inv Inventory
	if err := r.db.WithContext(ctx).Where("sku_id = ?", skuID).First(&inv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		return nil, err
	}
	return &inv, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListStockChecks 分页查询盘点单列表。
func (s *Service) ListStockChecks(ctx context.Context, status int32, keyword string, page *commonv1.PageRequest) (*inventoryv1.ListStockChecksResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListStockChecks(ctx, status, strings.TrimSpace(keyword), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询盘点单失败", err)
	}
	out := make([]*inventoryv1.StockCheck, 0, len(list))
	for i := range list {
		out = append(out, stockCheckToProto(&list[i]))
	}
	return &inventoryv1.ListStockChecksResponse{StockChecks: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// CreateStockCheck 创建盘点单并生成盘点明细。
//
// 明细的账面数量取当前可用库存，实盘数量与差异数量留空等待人工盘点录入。
func (s *Service) CreateStockCheck(ctx context.Context, req *inventoryv1.CreateStockCheckRequest) (*inventoryv1.StockCheck, error) {
	warehouse, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetWarehouseId()))
	if err != nil {
		return nil, err
	}

	items := make([]StockCheckItem, 0)
	if len(req.GetItems()) > 0 {
		for _, it := range req.GetItems() {
			if it.GetSkuId() <= 0 {
				return nil, errs.New(errs.CodeInvalidParam, "盘点明细缺少 SKU")
			}
			book := 0
			inv, invErr := s.repo.FindInventoryBySKU(ctx, uint64(it.GetSkuId()))
			if invErr == nil {
				book = inv.AvailableStock
			}
			skuCode := strings.TrimSpace(it.GetSkuCode())
			specText := strings.TrimSpace(it.GetSpecText())
			if inv != nil {
				if skuCode == "" {
					skuCode = inv.SKUCode
				}
				if specText == "" {
					specText = inv.SpecText
				}
			}
			items = append(items, StockCheckItem{
				SKUID:        uint64(it.GetSkuId()),
				SKUCode:      skuCode,
				SpecText:     specText,
				BookQuantity: book,
			})
		}
	} else {
		skus, err := s.repo.ListCheckScopeSKUs(ctx, warehouse.Name, warehouse.Code)
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询盘点范围失败", err)
		}
		for i := range skus {
			items = append(items, StockCheckItem{
				SKUID:        skus[i].SKUID,
				SKUCode:      skus[i].SKUCode,
				SpecText:     skus[i].SpecText,
				BookQuantity: skus[i].AvailableStock,
			})
		}
	}
	if len(items) == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "没有可盘点的商品")
	}

	operator := operatorName(ctx)
	check := &StockCheck{
		CheckNo:       generateMoveNo("SC", time.Now()),
		WarehouseID:   warehouse.ID,
		WarehouseName: warehouse.Name,
		Status:        StockCheckStatusOngoing,
		TotalCount:    len(items),
		Remark:        strings.TrimSpace(req.GetRemark()),
		Operator:      operator,
	}
	if err := s.repo.CreateStockCheckWithItems(ctx, check, items); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建盘点单失败", err)
	}
	return stockCheckToProto(check), nil
}

// GetStockCheck 查询盘点单详情（含盘点明细）。
func (s *Service) GetStockCheck(ctx context.Context, id int64) (*inventoryv1.StockCheckDetail, error) {
	if id <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "盘点单 ID 不能为空")
	}
	check, err := s.repo.FindStockCheckByID(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListStockCheckItems(ctx, check.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询盘点明细失败", err)
	}
	return &inventoryv1.StockCheckDetail{
		StockCheck: stockCheckToProto(check),
		Items:      stockCheckItemsToProto(items),
	}, nil
}

// ListStockCheckItems 查询盘点单明细。
//
// 请求中没有分页参数，这里返回该盘点单的全部明细。
func (s *Service) ListStockCheckItems(ctx context.Context, id int64) (*inventoryv1.ListStockCheckItemsResponse, error) {
	if id <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "盘点单 ID 不能为空")
	}
	check, err := s.repo.FindStockCheckByID(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	items, err := s.repo.ListStockCheckItems(ctx, check.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询盘点明细失败", err)
	}
	total := int64(len(items))
	return &inventoryv1.ListStockCheckItemsResponse{
		Items: stockCheckItemsToProto(items),
		Meta:  buildMeta(1, int(total), total),
	}, nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func stockCheckToProto(c *StockCheck) *inventoryv1.StockCheck {
	if c == nil {
		return nil
	}
	return &inventoryv1.StockCheck{
		Id:            int64(c.ID),
		CheckNo:       c.CheckNo,
		WarehouseId:   int64(c.WarehouseID),
		WarehouseName: c.WarehouseName,
		Status:        int32(c.Status),
		TotalCount:    int32(c.TotalCount),
		DiffCount:     int32(c.DiffCount),
		Remark:        c.Remark,
		Operator:      c.Operator,
		CreatedAt:     timestamppb.New(c.CreatedAt),
	}
}

func stockCheckItemsToProto(items []StockCheckItem) []*inventoryv1.StockCheckItem {
	out := make([]*inventoryv1.StockCheckItem, 0, len(items))
	for i := range items {
		out = append(out, &inventoryv1.StockCheckItem{
			Id:             int64(items[i].ID),
			StockCheckId:   int64(items[i].StockCheckID),
			SkuId:          int64(items[i].SKUID),
			SkuCode:        items[i].SKUCode,
			SpecText:       items[i].SpecText,
			BookQuantity:   int32(items[i].BookQuantity),
			ActualQuantity: int32(items[i].ActualQuantity),
			DiffQuantity:   int32(items[i].DiffQuantity),
		})
	}
	return out
}
