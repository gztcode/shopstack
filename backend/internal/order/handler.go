package order

import (
	"context"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// Handler 实现 OrderService。
type Handler struct {
	orderv1.UnimplementedOrderServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Handler 必须实现 OrderService 的全部方法。
var _ orderv1.OrderServiceServer = (*Handler)(nil)

// userID 解析当前用户 ID。
func (h *Handler) userID(ctx context.Context, explicit int64) int64 {
	if explicit > 0 {
		return explicit
	}
	return auth.UserIDFromContext(ctx)
}

// CreateOrder 创建订单。
func (h *Handler) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.Order, error) {
	return h.service.CreateOrder(ctx, req)
}

// GetOrder 查询订单详情。
func (h *Handler) GetOrder(ctx context.Context, req *orderv1.GetOrderRequest) (*orderv1.OrderDetail, error) {
	return h.service.GetOrder(ctx, req.GetId(), h.userID(ctx, req.GetUserId()))
}

// ListOrders 查询订单列表。
func (h *Handler) ListOrders(ctx context.Context, req *orderv1.ListOrdersRequest) (*orderv1.ListOrdersResponse, error) {
	var start, end time.Time
	if req.GetStartTime() > 0 {
		start = time.Unix(req.GetStartTime(), 0)
	}
	if req.GetEndTime() > 0 {
		end = time.Unix(req.GetEndTime(), 0)
	}
	return h.service.ListOrders(ctx, h.userID(ctx, req.GetUserId()),
		int8(req.GetStatus()), req.GetKeyword(), start, end, req.GetPage())
}

// CancelOrder 取消订单。
func (h *Handler) CancelOrder(ctx context.Context, req *orderv1.CancelOrderRequest) (*orderv1.Order, error) {
	return h.service.CancelOrder(ctx, req.GetOrderId(), h.userID(ctx, req.GetUserId()), req.GetReason())
}

// ConfirmReceipt 确认收货。
func (h *Handler) ConfirmReceipt(ctx context.Context, req *orderv1.ConfirmReceiptRequest) (*orderv1.Order, error) {
	return h.service.ConfirmReceipt(ctx, req.GetOrderId(), h.userID(ctx, req.GetUserId()))
}

// ApplyRefund 申请退款。
func (h *Handler) ApplyRefund(ctx context.Context, req *orderv1.ApplyRefundRequest) (*orderv1.Refund, error) {
	return h.service.ApplyRefund(ctx, req.GetOrderId(), h.userID(ctx, req.GetUserId()),
		req.GetItemIds(), req.GetAmountCents(), req.GetReason(), req.GetDescription())
}

// ListRefunds 退款单列表。
func (h *Handler) ListRefunds(ctx context.Context, req *orderv1.ListRefundsRequest) (*orderv1.ListRefundsResponse, error) {
	return h.service.ListRefunds(ctx, int8(req.GetStatus()), h.userID(ctx, req.GetUserId()),
		req.GetKeyword(), req.GetPage())
}

// SetRefundStatus 审核退款单。
func (h *Handler) SetRefundStatus(ctx context.Context, req *orderv1.SetRefundStatusRequest) (*orderv1.Refund, error) {
	return h.service.SetRefundStatus(ctx, req.GetId(), int8(req.GetStatus()), req.GetAdminRemark())
}

// UpdateOrderRemark 更新订单备注。
func (h *Handler) UpdateOrderRemark(ctx context.Context, req *orderv1.AdminUpdateOrderRemarkRequest) (*orderv1.Order, error) {
	return h.service.UpdateOrderRemark(ctx, req.GetId(), req.GetAdminRemark())
}

// ListOrderLogs 订单状态流转日志。
func (h *Handler) ListOrderLogs(ctx context.Context, req *orderv1.ListOrderLogsRequest) (*orderv1.ListOrderLogsResponse, error) {
	return h.service.ListOrderLogs(ctx, req.GetOrderId())
}

// GetOrderCount 各状态订单数量。
func (h *Handler) GetOrderCount(ctx context.Context, req *orderv1.OrderCountRequest) (*orderv1.OrderCountResponse, error) {
	return h.service.GetOrderCount(ctx, h.userID(ctx, req.GetUserId()))
}

// AdminOrderStats 订单侧经营统计。
func (h *Handler) AdminOrderStats(ctx context.Context, req *orderv1.AdminOrderStatsRequest) (*orderv1.AdminOrderStatsResponse, error) {
	return h.service.AdminOrderStats(ctx, req.GetDays())
}

// ---------------------------------------------------------------------------
// 售后工单 / 退款原因
// ---------------------------------------------------------------------------

// currentUserID 返回当前登录用户 ID。
//
// 请求里携带的 user_id 只用于校验一致性，不允许借此访问他人的数据。
func (h *Handler) currentUserID(ctx context.Context, explicit int64) (int64, error) {
	userID := auth.UserIDFromContext(ctx)
	if userID <= 0 {
		return 0, errs.Unauthorized("请先登录")
	}
	if explicit > 0 && explicit != userID {
		return 0, errs.Forbidden("无权访问他人的售后单")
	}
	return userID, nil
}

// ListAfterSales 查询当前用户的售后工单列表。
func (h *Handler) ListAfterSales(ctx context.Context, req *orderv1.ListAfterSalesRequest) (*orderv1.ListAfterSalesResponse, error) {
	userID, err := h.currentUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.ListAfterSales(ctx, userID, req.GetStatus(), req.GetType(), req.GetPage())
}

// GetAfterSale 查询售后工单详情。
func (h *Handler) GetAfterSale(ctx context.Context, req *orderv1.GetAfterSaleRequest) (*orderv1.AfterSale, error) {
	userID, err := h.currentUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.GetAfterSale(ctx, req.GetId(), userID)
}

// ListRefundReasons 查询退款原因列表。
func (h *Handler) ListRefundReasons(ctx context.Context, req *orderv1.ListRefundReasonsRequest) (*orderv1.ListRefundReasonsResponse, error) {
	return h.service.ListRefundReasons(ctx, req.GetType())
}

// AdminListAfterSales 后台查询售后工单列表。
func (h *Handler) AdminListAfterSales(ctx context.Context, req *orderv1.AdminListAfterSalesRequest) (*orderv1.ListAfterSalesResponse, error) {
	return h.service.AdminListAfterSales(ctx, req.GetStatus(), req.GetType(), req.GetKeyword(), req.GetPage())
}

// SetAfterSaleStatus 后台审核售后工单。
func (h *Handler) SetAfterSaleStatus(ctx context.Context, req *orderv1.SetAfterSaleStatusRequest) (*orderv1.AfterSale, error) {
	return h.service.SetAfterSaleStatus(ctx, req.GetId(), req.GetStatus(), req.GetAdminRemark())
}

// SaveRefundReason 保存退款原因。
func (h *Handler) SaveRefundReason(ctx context.Context, req *orderv1.SaveRefundReasonRequest) (*orderv1.RefundReason, error) {
	return h.service.SaveRefundReason(ctx, req)
}

// ---------------------------------------------------------------------------
// 后台订单列表与统计
// ---------------------------------------------------------------------------

// AdminListOrders 后台订单列表。
func (h *Handler) AdminListOrders(ctx context.Context, req *orderv1.AdminListOrdersRequest) (*orderv1.ListOrdersResponse, error) {
	return h.service.AdminListOrders(ctx, req)
}

// AdminOrderStatsByChannel 按渠道统计订单。
func (h *Handler) AdminOrderStatsByChannel(ctx context.Context, req *orderv1.AdminOrderStatsRequest) (*orderv1.AdminOrderStatsByChannelResponse, error) {
	return h.service.AdminOrderStatsByChannel(ctx, req.GetDays())
}

// AdminOrderStatsByHour 按小时统计订单。
func (h *Handler) AdminOrderStatsByHour(ctx context.Context, req *orderv1.AdminOrderStatsRequest) (*orderv1.AdminOrderStatsByHourResponse, error) {
	return h.service.AdminOrderStatsByHour(ctx, req.GetDays())
}

// AdminOrderStatsByRegion 按收货地区统计订单。
func (h *Handler) AdminOrderStatsByRegion(ctx context.Context, req *orderv1.AdminOrderStatsRequest) (*orderv1.AdminOrderStatsByRegionResponse, error) {
	return h.service.AdminOrderStatsByRegion(ctx, req.GetDays())
}

// AdminListOrderLogs 后台订单操作日志。
func (h *Handler) AdminListOrderLogs(ctx context.Context, req *orderv1.ListOrderLogsRequest) (*orderv1.ListOrderLogsResponse, error) {
	return h.service.AdminListOrderLogs(ctx, req.GetOrderId())
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func orderToProto(o *Order) *orderv1.Order {
	if o == nil {
		return nil
	}
	return &orderv1.Order{
		Id:               int64(o.ID),
		OrderNo:          o.OrderNo,
		UserId:           int64(o.UserID),
		UserNickname:     o.UserNickname,
		Status:           commonv1.OrderStatus(o.Status),
		TotalAmountCents: o.TotalAmountCents,
		DiscountCents:    o.DiscountCents,
		FreightCents:     o.FreightCents,
		PayableCents:     o.PayableCents,
		PaidCents:        o.PaidCents,
		RefundedCents:    o.RefundedCents,
		ItemCount:        int32(o.ItemCount),
		TotalQuantity:    int32(o.TotalQuantity),
		Address: &commonv1.Address{
			Receiver: o.Receiver,
			Phone:    o.Phone,
			Detail:   o.Address,
		},
		Remark:        o.Remark,
		AdminRemark:   o.AdminRemark,
		PaymentMethod: o.PaymentMethod,
		PaidAt:        tsPtr(o.PaidAt),
		ShippedAt:     tsPtr(o.ShippedAt),
		CompletedAt:   tsPtr(o.CompletedAt),
		CancelledAt:   tsPtr(o.CancelledAt),
		CreatedAt:     timestamppb.New(o.CreatedAt),
		UpdatedAt:     timestamppb.New(o.UpdatedAt),
		ShipmentId:    int64(o.ShipmentID),
	}
}

func orderItemToProto(i *OrderItem) *orderv1.OrderItem {
	if i == nil {
		return nil
	}
	return &orderv1.OrderItem{
		Id:            int64(i.ID),
		OrderId:       int64(i.OrderID),
		ProductId:     int64(i.ProductID),
		SkuId:         int64(i.SKUID),
		ProductTitle:  i.ProductTitle,
		SpecText:      i.SpecText,
		Image:         i.Image,
		PriceCents:    i.PriceCents,
		Quantity:      int32(i.Quantity),
		SubtotalCents: i.SubtotalCents,
		RefundedCents: i.RefundedCents,
		Reviewed:      i.Reviewed,
	}
}

func statusLogToProto(l *OrderStatusLog) *orderv1.OrderStatusLog {
	if l == nil {
		return nil
	}
	return &orderv1.OrderStatusLog{
		Id:         int64(l.ID),
		OrderId:    int64(l.OrderID),
		FromStatus: int32(l.FromStatus),
		ToStatus:   int32(l.ToStatus),
		Action:     l.Action,
		Operator:   l.Operator,
		Remark:     l.Remark,
		CreatedAt:  timestamppb.New(l.CreatedAt),
	}
}

func refundToProto(r *Refund) *orderv1.Refund {
	if r == nil {
		return nil
	}
	return &orderv1.Refund{
		Id:          int64(r.ID),
		RefundNo:    r.RefundNo,
		OrderId:     int64(r.OrderID),
		OrderNo:     r.OrderNo,
		UserId:      int64(r.UserID),
		AmountCents: r.AmountCents,
		Reason:      r.Reason,
		Description: r.Description,
		Status:      int32(r.Status),
		AdminRemark: r.AdminRemark,
		CreatedAt:   timestamppb.New(r.CreatedAt),
		ProcessedAt: tsPtr(r.ProcessedAt),
	}
}

func tsPtr(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}
	return timestamppb.New(*t)
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
