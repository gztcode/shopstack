package inventory

import (
	"context"
	"strconv"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/mq"
)

// Service 承载库存域的业务逻辑。
type Service struct {
	repo *Repo
	mq   *mq.Client
}

// NewService 构造库存服务。
func NewService(repo *Repo, mqClient *mq.Client) *Service {
	return &Service{repo: repo, mq: mqClient}
}

// GetStock 查询单个 SKU 库存。
func (s *Service) GetStock(ctx context.Context, skuID int64) (*inventoryv1.Inventory, error) {
	inv, err := s.repo.FindBySKU(ctx, uint64(skuID))
	if err != nil {
		return nil, err
	}
	return inventoryToProto(inv), nil
}

// BatchGetStock 批量查询库存。
func (s *Service) BatchGetStock(ctx context.Context, skuIDs []int64) ([]*inventoryv1.Inventory, error) {
	ids := make([]uint64, 0, len(skuIDs))
	for _, id := range skuIDs {
		if id > 0 {
			ids = append(ids, uint64(id))
		}
	}
	list, err := s.repo.FindBySKUs(ctx, ids)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询库存失败", err)
	}
	out := make([]*inventoryv1.Inventory, 0, len(list))
	for i := range list {
		out = append(out, inventoryToProto(&list[i]))
	}
	return out, nil
}

// ReserveStock 预占库存（下单时调用）。
func (s *Service) ReserveStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, bizType string) error {
	if len(items) == 0 {
		return errs.Invalid("没有需要预占的商品")
	}
	if bizType == "" {
		bizType = "order"
	}
	bizID := strconv.FormatInt(orderID, 10)

	for _, item := range items {
		if item.GetQuantity() <= 0 {
			continue
		}
		if _, err := s.repo.Reserve(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()), bizType, bizID); err != nil {
			// 任一 SKU 预占失败则回滚已预占的部分
			s.rollbackReserve(ctx, orderID, items, bizType, bizID)
			return err
		}
	}
	return nil
}

// rollbackReserve 预占失败时释放已锁定的库存。
func (s *Service) rollbackReserve(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, bizType, bizID string) {
	for _, item := range items {
		if item.GetQuantity() <= 0 {
			continue
		}
		_ = s.repo.Release(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()),
			bizType, bizID, "预占失败回滚")
	}
}

// ReleaseStock 释放库存（订单取消时调用）。
func (s *Service) ReleaseStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem, reason string) error {
	bizID := strconv.FormatInt(orderID, 10)
	for _, item := range items {
		if item.GetQuantity() <= 0 {
			continue
		}
		if err := s.repo.Release(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()),
			"order", bizID, reason); err != nil {
			return err
		}
	}
	return nil
}

// DeductStock 扣减库存（支付成功后调用）。
func (s *Service) DeductStock(ctx context.Context, orderID int64, items []*inventoryv1.StockItem) error {
	bizID := strconv.FormatInt(orderID, 10)
	for _, item := range items {
		if item.GetQuantity() <= 0 {
			continue
		}
		if err := s.repo.Deduct(ctx, uint64(item.GetSkuId()), int(item.GetQuantity()), "order", bizID); err != nil {
			return err
		}
	}
	return nil
}

// AdjustStock 人工调整库存。
func (s *Service) AdjustStock(ctx context.Context, skuID int64, target int32, safetyStock int32, warehouse, reason string) (*inventoryv1.Inventory, error) {
	if target < 0 {
		return nil, errs.Invalid("库存不能为负数")
	}
	inv, err := s.repo.Adjust(ctx, uint64(skuID), int(target), int(safetyStock), warehouse, reason)
	if err != nil {
		return nil, err
	}
	return inventoryToProto(inv), nil
}

// ListInventories 库存列表。
func (s *Service) ListInventories(ctx context.Context, keyword string, productID int64, lowStockOnly bool, page *commonv1.PageRequest) (*inventoryv1.ListInventoriesResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListInventories(ctx, keyword, uint64(productID), lowStockOnly, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询库存失败", err)
	}
	out := make([]*inventoryv1.Inventory, 0, len(list))
	for i := range list {
		out = append(out, inventoryToProto(&list[i]))
	}
	return &inventoryv1.ListInventoriesResponse{Inventories: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// ListLogs 库存流水。
func (s *Service) ListLogs(ctx context.Context, skuID, productID int64, bizID string, changeType int32, page *commonv1.PageRequest) (*inventoryv1.ListInventoryLogsResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListLogs(ctx, uint64(skuID), uint64(productID), bizID, changeType, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询库存流水失败", err)
	}
	out := make([]*inventoryv1.InventoryLog, 0, len(list))
	for i := range list {
		out = append(out, logToProto(&list[i]))
	}
	return &inventoryv1.ListInventoryLogsResponse{Logs: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// StockWarning 低库存预警。
func (s *Service) StockWarning(ctx context.Context, threshold int32) (*inventoryv1.StockWarningResponse, error) {
	list, err := s.repo.StockWarning(ctx, int(threshold))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询库存预警失败", err)
	}
	out := make([]*inventoryv1.Inventory, 0, len(list))
	for i := range list {
		out = append(out, inventoryToProto(&list[i]))
	}
	return &inventoryv1.StockWarningResponse{Inventories: out, Count: int32(len(out))}, nil
}

// ---------------------------------------------------------------------------
// 事件消费
// ---------------------------------------------------------------------------

// Consumers 返回库存服务订阅的事件。
func Consumers(queueName string) []mq.Consumer {
	return []mq.Consumer{
		{
			Queue:      queueName + ".inventory",
			RoutingKey: mq.EventOrderCreated,
			Handler:    handleOrderCreated,
		},
		{
			Queue:      queueName + ".inventory",
			RoutingKey: mq.EventOrderPaid,
			Handler:    handleOrderPaid,
		},
		{
			Queue:      queueName + ".inventory",
			RoutingKey: mq.EventOrderCancelled,
			Handler:    handleOrderCancelled,
		},
	}
}

// handleOrderCreated 处理订单创建事件：预占库存。
func handleOrderCreated(ctx context.Context, event *mq.Event) error {
	orderID := payloadInt64(event, "order_id")
	items := payloadItems(event, "items")
	if orderID == 0 || len(items) == 0 {
		return nil
	}
	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
	for _, it := range items {
		protoItems = append(protoItems, &inventoryv1.StockItem{
			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
		})
	}
	return globalService.ReserveStock(ctx, orderID, protoItems, "order")
}

// handleOrderPaid 处理支付成功事件：扣减锁定库存。
func handleOrderPaid(ctx context.Context, event *mq.Event) error {
	orderID := payloadInt64(event, "order_id")
	items := payloadItems(event, "items")
	if orderID == 0 || len(items) == 0 {
		return nil
	}
	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
	for _, it := range items {
		protoItems = append(protoItems, &inventoryv1.StockItem{
			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
		})
	}
	return globalService.DeductStock(ctx, orderID, protoItems)
}

// handleOrderCancelled 处理订单取消事件：释放锁定库存。
func handleOrderCancelled(ctx context.Context, event *mq.Event) error {
	orderID := payloadInt64(event, "order_id")
	items := payloadItems(event, "items")
	if orderID == 0 || len(items) == 0 {
		return nil
	}
	protoItems := make([]*inventoryv1.StockItem, 0, len(items))
	for _, it := range items {
		protoItems = append(protoItems, &inventoryv1.StockItem{
			SkuId: int64(it.SKUID), Quantity: int32(it.Quantity),
		})
	}
	return globalService.ReleaseStock(ctx, orderID, protoItems, "订单取消")
}

// globalService 供事件回调使用的服务实例。
var globalService *Service

// SetGlobalService 注册事件回调使用的服务实例。
func SetGlobalService(s *Service) { globalService = s }

// payloadItem 是事件负载中的库存明细。
type payloadItem struct {
	SKUID    uint64
	Quantity int
}

func payloadInt64(event *mq.Event, key string) int64 {
	if event == nil || event.Payload == nil {
		return 0
	}
	switch v := event.Payload[key].(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	}
	return 0
}

func payloadItems(event *mq.Event, key string) []payloadItem {
	if event == nil || event.Payload == nil {
		return nil
	}
	raw, ok := event.Payload[key].([]any)
	if !ok {
		return nil
	}
	out := make([]payloadItem, 0, len(raw))
	for _, item := range raw {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		skuID := uint64(0)
		switch v := m["sku_id"].(type) {
		case float64:
			skuID = uint64(v)
		case int64:
			skuID = uint64(v)
		}
		qty := 0
		switch v := m["quantity"].(type) {
		case float64:
			qty = int(v)
		case int64:
			qty = int(v)
		}
		out = append(out, payloadItem{SKUID: skuID, Quantity: qty})
	}
	return out
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func inventoryToProto(inv *Inventory) *inventoryv1.Inventory {
	if inv == nil {
		return nil
	}
	return &inventoryv1.Inventory{
		Id:             int64(inv.ID),
		SkuId:          int64(inv.SKUID),
		ProductId:      int64(inv.ProductID),
		SkuCode:        inv.SKUCode,
		SpecText:       inv.SpecText,
		TotalStock:     int32(inv.TotalStock),
		AvailableStock: int32(inv.AvailableStock),
		LockedStock:    int32(inv.LockedStock),
		SoldStock:      int32(inv.SoldStock),
		SafetyStock:    int32(inv.SafetyStock),
		Warehouse:      inv.Warehouse,
		UpdatedAt:      timestamppb.New(inv.UpdatedAt),
	}
}

func logToProto(l *InventoryLog) *inventoryv1.InventoryLog {
	if l == nil {
		return nil
	}
	return &inventoryv1.InventoryLog{
		Id:          int64(l.ID),
		SkuId:       int64(l.SKUID),
		ProductId:   int64(l.ProductID),
		SkuCode:     l.SKUCode,
		ChangeType:  int32(l.ChangeType),
		Quantity:    int32(l.Quantity),
		BeforeStock: int32(l.BeforeStock),
		AfterStock:  int32(l.AfterStock),
		BizType:     l.BizType,
		BizId:       l.BizID,
		Operator:    l.Operator,
		Remark:      l.Remark,
		CreatedAt:   timestamppb.New(l.CreatedAt),
	}
}

func normalizePage(page *commonv1.PageRequest) (int, int) {
	pageNum := int(page.GetPage())
	pageSize := int(page.GetPageSize())
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return pageNum, pageSize
}

func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page: int32(page), PageSize: int32(pageSize),
		Total: total, TotalPages: int32(totalPages),
	}
}

var _ = time.Now
