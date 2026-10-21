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

// 出库单状态
const (
	// OutboundStatusPending 待出库。
	OutboundStatusPending = 0
	// OutboundStatusDone 已出库。
	OutboundStatusDone = 1
	// OutboundStatusCancelled 已取消。
	OutboundStatusCancelled = 2
)

// 出库单业务类型，用于库存流水追溯。
const outboundBizType = "outbound"

// OutboundOrder 是出库单模型。
type OutboundOrder struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OutboundNo    string    `gorm:"column:outbound_no;type:varchar(64);not null;uniqueIndex" json:"outbound_no"`
	WarehouseID   uint64    `gorm:"column:warehouse_id;not null;default:0;index" json:"warehouse_id"`
	WarehouseName string    `gorm:"column:warehouse_name;type:varchar(64);not null;default:''" json:"warehouse_name"`
	OrderID       uint64    `gorm:"column:order_id;not null;default:0" json:"order_id"`
	OrderNo       string    `gorm:"column:order_no;type:varchar(64);not null;default:''" json:"order_no"`
	Status        int8      `gorm:"column:status;not null;default:0;index" json:"status"`
	TotalQuantity int       `gorm:"column:total_quantity;not null;default:0" json:"total_quantity"`
	Remark        string    `gorm:"column:remark;type:varchar(512);not null;default:''" json:"remark"`
	Operator      string    `gorm:"column:operator;type:varchar(64);not null;default:''" json:"operator"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (OutboundOrder) TableName() string { return "outbound_orders" }

// OutboundOrderItem 是出库单明细模型。
type OutboundOrderItem struct {
	ID         uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	OutboundID uint64 `gorm:"column:outbound_id;not null;index" json:"outbound_id"`
	SKUID      uint64 `gorm:"column:sku_id;not null" json:"sku_id"`
	SKUCode    string `gorm:"column:sku_code;type:varchar(64);not null;default:''" json:"sku_code"`
	SpecText   string `gorm:"column:spec_text;type:varchar(128);not null;default:''" json:"spec_text"`
	Quantity   int    `gorm:"column:quantity;not null;default:0" json:"quantity"`
}

// TableName 指定表名。
func (OutboundOrderItem) TableName() string { return "outbound_order_items" }

// orderBrief 是订单表在出库场景下的最小只读投影。
type orderBrief struct {
	ID      uint64 `gorm:"primaryKey" json:"id"`
	OrderNo string `gorm:"column:order_no" json:"order_no"`
}

// TableName 指定表名。
func (orderBrief) TableName() string { return "orders" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// CreateOutboundOrderWithItems 在同一事务中创建出库单与明细。
func (r *Repo) CreateOutboundOrderWithItems(ctx context.Context, order *OutboundOrder, items []OutboundOrderItem, apply func(tx *gorm.DB, item *OutboundOrderItem) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			item := items[i]
			item.OutboundID = order.ID
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

// ListOutboundOrders 分页查询出库单。
func (r *Repo) ListOutboundOrders(ctx context.Context, status int32, keyword string, page, pageSize int) ([]OutboundOrder, int64, error) {
	q := r.db.WithContext(ctx).Model(&OutboundOrder{})
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("outbound_no LIKE ? OR order_no LIKE ? OR warehouse_name LIKE ?", like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []OutboundOrder
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindOutboundOrderByID 按 ID 查询出库单。
func (r *Repo) FindOutboundOrderByID(ctx context.Context, id uint64) (*OutboundOrder, error) {
	var o OutboundOrder
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&o).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "出库单不存在")
		}
		return nil, err
	}
	return &o, nil
}

// ListOutboundOrderItems 查询出库单明细。
func (r *Repo) ListOutboundOrderItems(ctx context.Context, outboundID uint64) ([]OutboundOrderItem, error) {
	var list []OutboundOrderItem
	err := r.db.WithContext(ctx).Where("outbound_id = ?", outboundID).Order("id ASC").Find(&list).Error
	return list, err
}

// UpdateOutboundOrderStatus 更新出库单状态。
func (r *Repo) UpdateOutboundOrderStatus(ctx context.Context, id uint64, status int8) error {
	return r.db.WithContext(ctx).Model(&OutboundOrder{}).
		Where("id = ?", id).Update("status", status).Error
}

// FindOrderNo 按订单 ID 查询订单号（只读）。
func (r *Repo) FindOrderNo(ctx context.Context, orderID uint64) (string, error) {
	var ob orderBrief
	if err := r.db.WithContext(ctx).Where("id = ?", orderID).First(&ob).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return ob.OrderNo, nil
}

// OutboundStock 出库减库存。
//
// 优先把锁定库存转为已售（订单发货场景：locked -> sold，总量不变）；
// 没有锁定库存时从可用库存扣减，同时扣减总量（可用 -> 出库，总量减少）。
// 两种路径都保持「总量 = 可用 + 锁定 + 已售」不变。
func (r *Repo) OutboundStock(tx *gorm.DB, item *OutboundOrderItem, bizID, operator, remark string) error {
	qty := item.Quantity
	if qty <= 0 {
		return errs.New(errs.CodeInvalidParam, "出库数量必须大于 0")
	}

	var inv Inventory
	if err := tx.Where("sku_id = ?", item.SKUID).First(&inv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.New(errs.CodeStockNotFound, "商品库存记录不存在")
		}
		return err
	}

	updates := map[string]any{
		"version": gorm.Expr("version + 1"),
	}
	afterAvailable := inv.AvailableStock
	if inv.LockedStock >= qty {
		updates["locked_stock"] = gorm.Expr("locked_stock - ?", qty)
		updates["sold_stock"] = gorm.Expr("sold_stock + ?", qty)
	} else {
		if inv.AvailableStock < qty {
			return errs.New(errs.CodeStockInsufficient, "库存不足，无法出库").
				WithDetail("available", itoa(inv.AvailableStock)).
				WithDetail("required", itoa(qty))
		}
		updates["available_stock"] = gorm.Expr("available_stock - ?", qty)
		updates["total_stock"] = gorm.Expr("total_stock - ?", qty)
		afterAvailable = inv.AvailableStock - qty
	}

	res := tx.Model(&Inventory{}).
		Where("sku_id = ? AND (locked_stock >= ? OR available_stock >= ?)", item.SKUID, qty, qty).
		Updates(updates)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeStockInsufficient, "库存不足，无法出库")
	}

	return tx.Create(&InventoryLog{
		SKUID:       item.SKUID,
		ProductID:   inv.ProductID,
		SKUCode:     inv.SKUCode,
		ChangeType:  ChangeTypeDeduct,
		Quantity:    -qty,
		BeforeStock: inv.AvailableStock,
		AfterStock:  afterAvailable,
		BizType:     outboundBizType,
		BizID:       bizID,
		Operator:    operator,
		Remark:      remark,
	}).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListOutboundOrders 分页查询出库单列表。
func (s *Service) ListOutboundOrders(ctx context.Context, status int32, keyword string, page *commonv1.PageRequest) (*inventoryv1.ListOutboundOrdersResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListOutboundOrders(ctx, status, strings.TrimSpace(keyword), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询出库单失败", err)
	}
	out := make([]*inventoryv1.OutboundOrder, 0, len(list))
	for i := range list {
		order, err := s.buildOutboundOrder(ctx, &list[i])
		if err != nil {
			return nil, err
		}
		out = append(out, order)
	}
	return &inventoryv1.ListOutboundOrdersResponse{OutboundOrders: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// CreateOutboundOrder 创建出库单并即时扣减库存。
//
// 单据、明细与库存扣减在同一事务内完成，库存不足时整体回滚。
func (s *Service) CreateOutboundOrder(ctx context.Context, req *inventoryv1.CreateOutboundOrderRequest) (*inventoryv1.OutboundOrder, error) {
	items := req.GetItems()
	if len(items) == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "出库明细不能为空")
	}
	warehouse, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetWarehouseId()))
	if err != nil {
		return nil, err
	}
	if !warehouse.Enabled {
		return nil, errs.New(errs.CodeInvalidParam, "仓库已停用，无法出库")
	}

	total := 0
	detail := make([]OutboundOrderItem, 0, len(items))
	for _, it := range items {
		if it.GetSkuId() <= 0 {
			return nil, errs.New(errs.CodeInvalidParam, "出库明细缺少 SKU")
		}
		if it.GetQuantity() <= 0 {
			return nil, errs.New(errs.CodeInvalidParam, "出库数量必须大于 0")
		}
		total += int(it.GetQuantity())
		detail = append(detail, OutboundOrderItem{
			SKUID:    uint64(it.GetSkuId()),
			SKUCode:  strings.TrimSpace(it.GetSkuCode()),
			SpecText: strings.TrimSpace(it.GetSpecText()),
			Quantity: int(it.GetQuantity()),
		})
	}

	operator := operatorName(ctx)
	order := &OutboundOrder{
		OutboundNo:    generateMoveNo("OUT", time.Now()),
		WarehouseID:   warehouse.ID,
		WarehouseName: warehouse.Name,
		OrderID:       uint64(req.GetOrderId()),
		Status:        OutboundStatusPending,
		TotalQuantity: total,
		Remark:        strings.TrimSpace(req.GetRemark()),
		Operator:      operator,
	}
	if order.OrderID > 0 {
		orderNo, err := s.repo.FindOrderNo(ctx, order.OrderID)
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询订单信息失败", err)
		}
		order.OrderNo = orderNo
	}

	err = s.repo.CreateOutboundOrderWithItems(ctx, order, detail, func(tx *gorm.DB, item *OutboundOrderItem) error {
		return s.repo.OutboundStock(tx, item, order.OutboundNo, operator, "出库单扣减")
	})
	if err != nil {
		if errs.IsCode(err, errs.CodeStockInsufficient) || errs.IsCode(err, errs.CodeStockNotFound) {
			return nil, err
		}
		return nil, errs.Wrap(errs.CodeInternalError, "创建出库单失败", err)
	}

	// 库存已扣减，单据置为「已出库」
	if err := s.repo.UpdateOutboundOrderStatus(ctx, order.ID, OutboundStatusDone); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新出库单状态失败", err)
	}
	order.Status = OutboundStatusDone

	return s.buildOutboundOrder(ctx, order)
}

// buildOutboundOrder 组装出库单及其明细。
func (s *Service) buildOutboundOrder(ctx context.Context, order *OutboundOrder) (*inventoryv1.OutboundOrder, error) {
	if order == nil {
		return nil, nil
	}
	items, err := s.repo.ListOutboundOrderItems(ctx, order.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询出库明细失败", err)
	}
	protoItems := make([]*inventoryv1.StockMoveItem, 0, len(items))
	for i := range items {
		protoItems = append(protoItems, &inventoryv1.StockMoveItem{
			SkuId:    int64(items[i].SKUID),
			SkuCode:  items[i].SKUCode,
			SpecText: items[i].SpecText,
			Quantity: int32(items[i].Quantity),
		})
	}
	return &inventoryv1.OutboundOrder{
		Id:            int64(order.ID),
		OutboundNo:    order.OutboundNo,
		WarehouseId:   int64(order.WarehouseID),
		WarehouseName: order.WarehouseName,
		OrderId:       int64(order.OrderID),
		OrderNo:       order.OrderNo,
		Status:        int32(order.Status),
		TotalQuantity: int32(order.TotalQuantity),
		Remark:        order.Remark,
		Operator:      order.Operator,
		Items:         protoItems,
		CreatedAt:     timestamppb.New(order.CreatedAt),
	}, nil
}
