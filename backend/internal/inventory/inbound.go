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

// 入库单状态
const (
	// InboundStatusPending 待入库（单据已创建、库存尚未入账）。
	InboundStatusPending = 0
	// InboundStatusDone 已入库（库存已入账）。
	InboundStatusDone = 1
	// InboundStatusCancelled 已取消。
	InboundStatusCancelled = 2
)

// 入库单业务类型，用于库存流水追溯。
const inboundBizType = "inbound"

// InboundOrder 是入库单模型。
type InboundOrder struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	InboundNo     string    `gorm:"column:inbound_no;type:varchar(64);not null;uniqueIndex" json:"inbound_no"`
	WarehouseID   uint64    `gorm:"column:warehouse_id;not null;default:0;index" json:"warehouse_id"`
	WarehouseName string    `gorm:"column:warehouse_name;type:varchar(64);not null;default:''" json:"warehouse_name"`
	Supplier      string    `gorm:"column:supplier;type:varchar(128);not null;default:''" json:"supplier"`
	Status        int8      `gorm:"column:status;not null;default:0;index" json:"status"`
	TotalQuantity int       `gorm:"column:total_quantity;not null;default:0" json:"total_quantity"`
	Remark        string    `gorm:"column:remark;type:varchar(512);not null;default:''" json:"remark"`
	Operator      string    `gorm:"column:operator;type:varchar(64);not null;default:''" json:"operator"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (InboundOrder) TableName() string { return "inbound_orders" }

// InboundOrderItem 是入库单明细模型。
type InboundOrderItem struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	InboundID uint64 `gorm:"column:inbound_id;not null;index" json:"inbound_id"`
	SKUID     uint64 `gorm:"column:sku_id;not null" json:"sku_id"`
	SKUCode   string `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
	SpecText  string `gorm:"column:spec_text;type:varchar(128);not null;default:''" json:"spec_text"`
	Quantity  int    `gorm:"column:quantity;not null;default:0" json:"quantity"`
}

// TableName 指定表名。
func (InboundOrderItem) TableName() string { return "inbound_order_items" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// CreateInboundOrderWithItems 在同一事务中创建入库单与明细。
func (r *Repo) CreateInboundOrderWithItems(ctx context.Context, order *InboundOrder, items []InboundOrderItem, apply func(tx *gorm.DB, item *InboundOrderItem) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			item := items[i]
			item.InboundID = order.ID
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
			if apply != nil {
				if err := apply(tx, &item); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// ListInboundOrders 分页查询入库单。
func (r *Repo) ListInboundOrders(ctx context.Context, status int32, keyword string, page, pageSize int) ([]InboundOrder, int64, error) {
	q := r.db.WithContext(ctx).Model(&InboundOrder{})
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("inbound_no LIKE ? OR supplier LIKE ? OR warehouse_name LIKE ?", like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []InboundOrder
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindInboundOrderByID 按 ID 查询入库单。
func (r *Repo) FindInboundOrderByID(ctx context.Context, id uint64) (*InboundOrder, error) {
	var o InboundOrder
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&o).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "入库单不存在")
		}
		return nil, err
	}
	return &o, nil
}

// ListInboundOrderItems 查询入库单明细。
func (r *Repo) ListInboundOrderItems(ctx context.Context, inboundID uint64) ([]InboundOrderItem, error) {
	var list []InboundOrderItem
	err := r.db.WithContext(ctx).Where("inbound_id = ?", inboundID).Order("id ASC").Find(&list).Error
	return list, err
}

// InboundStock 入库加库存：total_stock += qty，available_stock += qty。
//
// 保持「总量 = 可用 + 锁定 + 已售」的三段式账本不变，
// 并写入一条 change_type = 入库 的库存流水。
func (r *Repo) InboundStock(tx *gorm.DB, item *InboundOrderItem, warehouse string, bizID, operator, remark string) error {
	qty := item.Quantity
	if qty <= 0 {
		return errs.New(errs.CodeInvalidParam, "入库数量必须大于 0")
	}

	var inv Inventory
	err := tx.Where("sku_id = ?", item.SKUID).First(&inv).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// 库存台账中没有该 SKU，先建立初始记录
		inv = Inventory{
			SKUID:     item.SKUID,
			SKUCode:   item.SKUCode,
			SpecText:  item.SpecText,
			Warehouse: warehouse,
		}
		if createErr := tx.Create(&inv).Error; createErr != nil {
			return createErr
		}
	}

	before := inv.AvailableStock
	res := tx.Model(&Inventory{}).
		Where("sku_id = ? AND available_stock >= 0", item.SKUID).
		Updates(map[string]any{
			"total_stock":     gorm.Expr("total_stock + ?", qty),
			"available_stock": gorm.Expr("available_stock + ?", qty),
			"version":         gorm.Expr("version + 1"),
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
	}

	return tx.Create(&InventoryLog{
		SKUID:       item.SKUID,
		ProductID:   inv.ProductID,
		SKUCode:     inv.SKUCode,
		ChangeType:  ChangeTypeInbound,
		Quantity:    qty,
		BeforeStock: before,
		AfterStock:  before + qty,
		BizType:     inboundBizType,
		BizID:       bizID,
		Operator:    operator,
		Remark:      remark,
	}).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListInboundOrders 分页查询入库单列表。
func (s *Service) ListInboundOrders(ctx context.Context, status int32, keyword string, page *commonv1.PageRequest) (*inventoryv1.ListInboundOrdersResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListInboundOrders(ctx, status, strings.TrimSpace(keyword), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询入库单失败", err)
	}
	out := make([]*inventoryv1.InboundOrder, 0, len(list))
	for i := range list {
		order, err := s.buildInboundOrder(ctx, &list[i])
		if err != nil {
			return nil, err
		}
		out = append(out, order)
	}
	return &inventoryv1.ListInboundOrdersResponse{InboundOrders: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// CreateInboundOrder 创建入库单并即时入账库存。
//
// 整个过程在一个事务内完成：单据 + 明细 + 库存增加 + 库存流水，
// 任一 SKU 入库失败则整体回滚。
func (s *Service) CreateInboundOrder(ctx context.Context, req *inventoryv1.CreateInboundOrderRequest) (*inventoryv1.InboundOrder, error) {
	items := req.GetItems()
	if len(items) == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "入库明细不能为空")
	}
	warehouse, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetWarehouseId()))
	if err != nil {
		return nil, err
	}
	if !warehouse.Enabled {
		return nil, errs.New(errs.CodeInvalidParam, "仓库已停用，无法入库")
	}

	total := 0
	detail := make([]InboundOrderItem, 0, len(items))
	for _, it := range items {
		if it.GetSkuId() <= 0 {
			return nil, errs.New(errs.CodeInvalidParam, "入库明细缺少 SKU")
		}
		if it.GetQuantity() <= 0 {
			return nil, errs.New(errs.CodeInvalidParam, "入库数量必须大于 0")
		}
		total += int(it.GetQuantity())
		detail = append(detail, InboundOrderItem{
			SKUID:    uint64(it.GetSkuId()),
			SKUCode:  strings.TrimSpace(it.GetSkuCode()),
			SpecText: strings.TrimSpace(it.GetSpecText()),
			Quantity: int(it.GetQuantity()),
		})
	}

	operator := operatorName(ctx)
	order := &InboundOrder{
		InboundNo:     generateMoveNo("IN", time.Now()),
		WarehouseID:   warehouse.ID,
		WarehouseName: warehouse.Name,
		Supplier:      strings.TrimSpace(req.GetSupplier()),
		Status:        InboundStatusPending,
		TotalQuantity: total,
		Remark:        strings.TrimSpace(req.GetRemark()),
		Operator:      operator,
	}

	err = s.repo.CreateInboundOrderWithItems(ctx, order, detail, func(tx *gorm.DB, item *InboundOrderItem) error {
		return s.repo.InboundStock(tx, item, warehouse.Name, order.InboundNo, operator, "采购入库")
	})
	if err != nil {
		if errs.IsCode(err, errs.CodeStockInsufficient) || errs.IsCode(err, errs.CodeStockNotFound) {
			return nil, err
		}
		return nil, errs.Wrap(errs.CodeInternalError, "创建入库单失败", err)
	}

	// 库存已入账，单据置为「已入库」
	if err := s.repo.UpdateInboundOrderStatus(ctx, order.ID, InboundStatusDone); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新入库单状态失败", err)
	}
	order.Status = InboundStatusDone

	return s.buildInboundOrder(ctx, order)
}

// UpdateInboundOrderStatus 更新入库单状态。
func (r *Repo) UpdateInboundOrderStatus(ctx context.Context, id uint64, status int8) error {
	return r.db.WithContext(ctx).Model(&InboundOrder{}).
		Where("id = ?", id).Update("status", status).Error
}

// buildInboundOrder 组装入库单及其明细。
func (s *Service) buildInboundOrder(ctx context.Context, order *InboundOrder) (*inventoryv1.InboundOrder, error) {
	if order == nil {
		return nil, nil
	}
	items, err := s.repo.ListInboundOrderItems(ctx, order.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询入库明细失败", err)
	}
	return &inventoryv1.InboundOrder{
		Id:            int64(order.ID),
		InboundNo:     order.InboundNo,
		WarehouseId:   int64(order.WarehouseID),
		WarehouseName: order.WarehouseName,
		Supplier:      order.Supplier,
		Status:        int32(order.Status),
		TotalQuantity: int32(order.TotalQuantity),
		Remark:        order.Remark,
		Operator:      order.Operator,
		Items:         stockMoveItemsToProto(items),
		CreatedAt:     timestamppb.New(order.CreatedAt),
	}, nil
}

// stockMoveItemsToProto 把出入库明细转换为 protobuf 消息。
func stockMoveItemsToProto(items []InboundOrderItem) []*inventoryv1.StockMoveItem {
	out := make([]*inventoryv1.StockMoveItem, 0, len(items))
	for i := range items {
		out = append(out, &inventoryv1.StockMoveItem{
			SkuId:    int64(items[i].SKUID),
			SkuCode:  items[i].SKUCode,
			SpecText: items[i].SpecText,
			Quantity: int32(items[i].Quantity),
		})
	}
	return out
}
