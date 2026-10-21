package payment

import (
	"context"
	"time"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/auth"
)

// Handler 实现 PaymentService。
type Handler struct {
	paymentv1.UnimplementedPaymentServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// userID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
func (h *Handler) userID(ctx context.Context, explicit int64) int64 {
	if explicit > 0 {
		return explicit
	}
	return auth.UserIDFromContext(ctx)
}

// CreatePayment 创建支付单。
func (h *Handler) CreatePayment(ctx context.Context, req *paymentv1.CreatePaymentRequest) (*paymentv1.Payment, error) {
	return h.service.CreatePayment(ctx, req)
}

// QueryPayment 查询支付单。
func (h *Handler) QueryPayment(ctx context.Context, req *paymentv1.QueryPaymentRequest) (*paymentv1.Payment, error) {
	return h.service.QueryPayment(ctx, req.GetPaymentId(), req.GetOrderId(), h.userID(ctx, req.GetUserId()))
}

// Notify 支付回调。
func (h *Handler) Notify(ctx context.Context, req *paymentv1.PaymentCallbackRequest) (*commonv1.OperationResult, error) {
	if err := h.service.Notify(ctx, req); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "回调处理成功"}, nil
}

// CreateRefund 发起退款。
func (h *Handler) CreateRefund(ctx context.Context, req *paymentv1.CreateRefundRequest) (*paymentv1.PaymentRefund, error) {
	return h.service.CreateRefund(ctx, req)
}

// ListPayments 支付流水列表。
func (h *Handler) ListPayments(ctx context.Context, req *paymentv1.ListPaymentsRequest) (*paymentv1.ListPaymentsResponse, error) {
	var start, end time.Time
	if req.GetStartTime() > 0 {
		start = time.Unix(req.GetStartTime(), 0)
	}
	if req.GetEndTime() > 0 {
		end = time.Unix(req.GetEndTime(), 0)
	}
	return h.service.ListPayments(ctx, req.GetStatus(), req.GetChannel(), req.GetKeyword(),
		req.GetUserId(), start, end, req.GetPage())
}

// Summary 支付统计。
func (h *Handler) Summary(ctx context.Context, req *paymentv1.PaymentSummaryRequest) (*paymentv1.PaymentSummaryResponse, error) {
	return h.service.Summary(ctx, req.GetDays())
}

// ListPayChannels 支付渠道列表。
func (h *Handler) ListPayChannels(ctx context.Context, req *paymentv1.ListPayChannelsRequest) (*paymentv1.ListPayChannelsResponse, error) {
	return h.service.ListPayChannels(ctx, req.GetChannel(), req.GetPage())
}

// SavePayChannel 新增或更新支付渠道。
func (h *Handler) SavePayChannel(ctx context.Context, req *paymentv1.SavePayChannelRequest) (*paymentv1.PayChannel, error) {
	return h.service.SavePayChannel(ctx, req)
}

// DeletePayChannel 删除支付渠道。
func (h *Handler) DeletePayChannel(ctx context.Context, req *paymentv1.DeletePayChannelRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeletePayChannel(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "支付渠道已删除"}, nil
}

// CreateRecharge 创建余额充值单。
func (h *Handler) CreateRecharge(ctx context.Context, req *paymentv1.CreateRechargeRequest) (*paymentv1.RechargeOrder, error) {
	return h.service.CreateRecharge(ctx, req)
}

// ListRecharges 查询当前用户的充值单。
func (h *Handler) ListRecharges(ctx context.Context, req *paymentv1.ListRechargesRequest) (*paymentv1.ListRechargesResponse, error) {
	return h.service.ListRecharges(ctx, req)
}

// ListBalanceLogs 查询当前用户的余额流水。
func (h *Handler) ListBalanceLogs(ctx context.Context, req *paymentv1.ListBalanceLogsRequest) (*paymentv1.ListBalanceLogsResponse, error) {
	return h.service.ListBalanceLogs(ctx, req)
}

// GetRechargeConfig 查询充值配置。
func (h *Handler) GetRechargeConfig(ctx context.Context, req *paymentv1.GetRechargeConfigRequest) (*paymentv1.RechargeConfig, error) {
	return h.service.GetRechargeConfig(ctx)
}
