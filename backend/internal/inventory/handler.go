package inventory

import (
	"context"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"
)

// Handler 实现 InventoryService。
type Handler struct {
	inventoryv1.UnimplementedInventoryServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GetStock 查询库存。
func (h *Handler) GetStock(ctx context.Context, req *inventoryv1.GetStockRequest) (*inventoryv1.Inventory, error) {
	return h.service.GetStock(ctx, req.GetSkuId())
}

// BatchGetStock 批量查询库存。
func (h *Handler) BatchGetStock(ctx context.Context, req *inventoryv1.BatchGetStockRequest) (*inventoryv1.BatchGetStockResponse, error) {
	list, err := h.service.BatchGetStock(ctx, req.GetSkuIds())
	if err != nil {
		return nil, err
	}
	return &inventoryv1.BatchGetStockResponse{Inventories: list}, nil
}

// ReserveStock 预占库存。
func (h *Handler) ReserveStock(ctx context.Context, req *inventoryv1.ReserveStockRequest) (*commonv1.OperationResult, error) {
	if err := h.service.ReserveStock(ctx, req.GetOrderId(), req.GetItems(), req.GetBizType()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "库存已预占"}, nil
}

// ReleaseStock 释放库存。
func (h *Handler) ReleaseStock(ctx context.Context, req *inventoryv1.ReleaseStockRequest) (*commonv1.OperationResult, error) {
	if err := h.service.ReleaseStock(ctx, req.GetOrderId(), req.GetItems(), req.GetReason()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "库存已释放"}, nil
}

// DeductStock 扣减库存。
func (h *Handler) DeductStock(ctx context.Context, req *inventoryv1.DeductStockRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeductStock(ctx, req.GetOrderId(), req.GetItems()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "库存已扣减"}, nil
}

// AdjustStock 调整库存。
func (h *Handler) AdjustStock(ctx context.Context, req *inventoryv1.AdjustStockRequest) (*inventoryv1.Inventory, error) {
	return h.service.AdjustStock(ctx, req.GetSkuId(), req.GetQuantity(),
		req.GetSafetyStock(), req.GetWarehouse(), req.GetReason())
}

// ListInventories 库存列表。
func (h *Handler) ListInventories(ctx context.Context, req *inventoryv1.ListInventoriesRequest) (*inventoryv1.ListInventoriesResponse, error) {
	return h.service.ListInventories(ctx, req.GetKeyword(), req.GetProductId(),
		req.GetLowStockOnly() > 0, req.GetPage())
}

// ListLogs 库存流水。
func (h *Handler) ListLogs(ctx context.Context, req *inventoryv1.ListInventoryLogsRequest) (*inventoryv1.ListInventoryLogsResponse, error) {
	return h.service.ListLogs(ctx, req.GetSkuId(), req.GetProductId(),
		req.GetBizId(), req.GetChangeType(), req.GetPage())
}

// StockWarning 库存预警。
func (h *Handler) StockWarning(ctx context.Context, req *inventoryv1.StockWarningRequest) (*inventoryv1.StockWarningResponse, error) {
	return h.service.StockWarning(ctx, req.GetThreshold())
}

// ListWarehouses 仓库列表。
func (h *Handler) ListWarehouses(ctx context.Context, req *inventoryv1.ListWarehousesRequest) (*inventoryv1.ListWarehousesResponse, error) {
	return h.service.ListWarehouses(ctx, req.GetKeyword(), req.GetPage())
}

// SaveWarehouse 新增或更新仓库。
func (h *Handler) SaveWarehouse(ctx context.Context, req *inventoryv1.SaveWarehouseRequest) (*inventoryv1.Warehouse, error) {
	return h.service.SaveWarehouse(ctx, req)
}

// DeleteWarehouse 删除仓库。
func (h *Handler) DeleteWarehouse(ctx context.Context, req *inventoryv1.DeleteWarehouseRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteWarehouse(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "仓库已删除"}, nil
}

// ListInboundOrders 入库单列表。
func (h *Handler) ListInboundOrders(ctx context.Context, req *inventoryv1.ListInboundOrdersRequest) (*inventoryv1.ListInboundOrdersResponse, error) {
	return h.service.ListInboundOrders(ctx, req.GetStatus(), req.GetKeyword(), req.GetPage())
}

// CreateInboundOrder 创建入库单。
func (h *Handler) CreateInboundOrder(ctx context.Context, req *inventoryv1.CreateInboundOrderRequest) (*inventoryv1.InboundOrder, error) {
	return h.service.CreateInboundOrder(ctx, req)
}

// ListOutboundOrders 出库单列表。
func (h *Handler) ListOutboundOrders(ctx context.Context, req *inventoryv1.ListOutboundOrdersRequest) (*inventoryv1.ListOutboundOrdersResponse, error) {
	return h.service.ListOutboundOrders(ctx, req.GetStatus(), req.GetKeyword(), req.GetPage())
}

// CreateOutboundOrder 创建出库单。
func (h *Handler) CreateOutboundOrder(ctx context.Context, req *inventoryv1.CreateOutboundOrderRequest) (*inventoryv1.OutboundOrder, error) {
	return h.service.CreateOutboundOrder(ctx, req)
}

// ListStockChecks 盘点单列表。
func (h *Handler) ListStockChecks(ctx context.Context, req *inventoryv1.ListStockChecksRequest) (*inventoryv1.ListStockChecksResponse, error) {
	return h.service.ListStockChecks(ctx, req.GetStatus(), req.GetKeyword(), req.GetPage())
}

// CreateStockCheck 创建盘点单。
func (h *Handler) CreateStockCheck(ctx context.Context, req *inventoryv1.CreateStockCheckRequest) (*inventoryv1.StockCheck, error) {
	return h.service.CreateStockCheck(ctx, req)
}

// GetStockCheck 盘点单详情。
func (h *Handler) GetStockCheck(ctx context.Context, req *inventoryv1.GetStockCheckRequest) (*inventoryv1.StockCheckDetail, error) {
	return h.service.GetStockCheck(ctx, req.GetId())
}

// ListStockCheckItems 盘点单明细。
func (h *Handler) ListStockCheckItems(ctx context.Context, req *inventoryv1.GetStockCheckRequest) (*inventoryv1.ListStockCheckItemsResponse, error) {
	return h.service.ListStockCheckItems(ctx, req.GetId())
}
