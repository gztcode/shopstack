package marketing

import (
	"context"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Handler 实现 MarketingService。
type Handler struct {
	marketingv1.UnimplementedMarketingServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ListCoupons 查询优惠券列表。
func (h *Handler) ListCoupons(ctx context.Context, req *marketingv1.ListCouponsRequest) (*marketingv1.ListCouponsResponse, error) {
	return h.service.ListCoupons(ctx, req)
}

// SaveCoupon 保存优惠券。
func (h *Handler) SaveCoupon(ctx context.Context, req *marketingv1.SaveCouponRequest) (*marketingv1.Coupon, error) {
	return h.service.SaveCoupon(ctx, req)
}

// DeleteCoupon 删除优惠券。
func (h *Handler) DeleteCoupon(ctx context.Context, req *marketingv1.DeleteCouponRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteCoupon(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "优惠券已删除"}, nil
}

// ReceiveCoupon 领取优惠券。
func (h *Handler) ReceiveCoupon(ctx context.Context, req *marketingv1.ReceiveCouponRequest) (*marketingv1.UserCoupon, error) {
	return h.service.ReceiveCoupon(ctx, req)
}

// ListUserCoupons 查询用户优惠券。
func (h *Handler) ListUserCoupons(ctx context.Context, req *marketingv1.ListUserCouponsRequest) (*marketingv1.ListUserCouponsResponse, error) {
	return h.service.ListUserCoupons(ctx, req)
}

// ListPromotions 查询促销活动。
func (h *Handler) ListPromotions(ctx context.Context, req *marketingv1.ListPromotionsRequest) (*marketingv1.ListPromotionsResponse, error) {
	return h.service.ListPromotions(ctx, req)
}

// SavePromotion 保存促销活动。
func (h *Handler) SavePromotion(ctx context.Context, req *marketingv1.SavePromotionRequest) (*marketingv1.Promotion, error) {
	return h.service.SavePromotion(ctx, req)
}

// DeletePromotion 删除促销活动。
func (h *Handler) DeletePromotion(ctx context.Context, req *marketingv1.DeletePromotionRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeletePromotion(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "促销活动已删除"}, nil
}

// PreviewCheckout 结算试算。
func (h *Handler) PreviewCheckout(ctx context.Context, req *marketingv1.PreviewCheckoutRequest) (*marketingv1.PreviewCheckoutResponse, error) {
	return h.service.PreviewCheckout(ctx, req)
}

// ---------------------------------------------------------------------------
// 签到
// ---------------------------------------------------------------------------

// SignIn 每日签到。
func (h *Handler) SignIn(ctx context.Context, req *marketingv1.SignInRequest) (*marketingv1.GetSignInStatusResponse, error) {
	return h.service.SignIn(ctx, req)
}

// GetSignInStatus 查询签到状态。
func (h *Handler) GetSignInStatus(ctx context.Context, req *marketingv1.GetSignInStatusRequest) (*marketingv1.GetSignInStatusResponse, error) {
	return h.service.GetSignInStatus(ctx, req)
}

// GetSignInConfig 查询签到配置。
func (h *Handler) GetSignInConfig(ctx context.Context, req *marketingv1.GetSignInConfigRequest) (*marketingv1.SignInConfig, error) {
	return h.service.GetSignInConfig(ctx, req)
}

// SaveSignInConfig 保存签到配置。
func (h *Handler) SaveSignInConfig(ctx context.Context, req *marketingv1.SaveSignInConfigRequest) (*marketingv1.SignInConfig, error) {
	return h.service.SaveSignInConfig(ctx, req)
}

// ---------------------------------------------------------------------------
// 任务中心
// ---------------------------------------------------------------------------

// ListTasks 查询任务列表。
func (h *Handler) ListTasks(ctx context.Context, req *marketingv1.ListTasksRequest) (*marketingv1.ListTasksResponse, error) {
	return h.service.ListTasks(ctx, req)
}

// ClaimTask 领取任务奖励。
func (h *Handler) ClaimTask(ctx context.Context, req *marketingv1.ClaimTaskRequest) (*marketingv1.UserTask, error) {
	return h.service.ClaimTask(ctx, req)
}

// ListAdminMarketingTasks 后台查询营销任务列表。
func (h *Handler) ListAdminMarketingTasks(ctx context.Context, req *marketingv1.ListAdminMarketingTasksRequest) (*marketingv1.ListAdminMarketingTasksResponse, error) {
	return h.service.ListAdminMarketingTasks(ctx, req)
}

// SaveMarketingTask 新增营销任务。
func (h *Handler) SaveMarketingTask(ctx context.Context, req *marketingv1.SaveMarketingTaskRequest) (*marketingv1.MarketingTask, error) {
	return h.service.SaveMarketingTask(ctx, req)
}

// UpdateMarketingTask 更新营销任务。
func (h *Handler) UpdateMarketingTask(ctx context.Context, req *marketingv1.SaveMarketingTaskRequest) (*marketingv1.MarketingTask, error) {
	return h.service.UpdateMarketingTask(ctx, req)
}

// DeleteMarketingTask 删除营销任务。
func (h *Handler) DeleteMarketingTask(ctx context.Context, req *marketingv1.DeleteMarketingTaskRequest) (*commonv1.OperationResult, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("任务 ID 不合法")
	}
	if err := h.service.DeleteMarketingTask(ctx, uint64(req.GetId())); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "营销任务已删除"}, nil
}

// ---------------------------------------------------------------------------
// 活动详情与场次
// ---------------------------------------------------------------------------

// GetPromotion 查询活动详情。
func (h *Handler) GetPromotion(ctx context.Context, req *marketingv1.GetPromotionRequest) (*marketingv1.GetPromotionResponse, error) {
	return h.service.GetPromotion(ctx, req)
}

// ListPromotionProducts 查询活动商品。
func (h *Handler) ListPromotionProducts(ctx context.Context, req *marketingv1.ListPromotionProductsRequest) (*marketingv1.ListPromotionProductsResponse, error) {
	return h.service.ListPromotionProducts(ctx, req)
}

// ListPromotionSessions 查询活动场次。
func (h *Handler) ListPromotionSessions(ctx context.Context, req *marketingv1.ListPromotionSessionsRequest) (*marketingv1.ListPromotionSessionsResponse, error) {
	return h.service.ListPromotionSessions(ctx, req)
}

// SavePromotionSession 保存活动场次。
func (h *Handler) SavePromotionSession(ctx context.Context, req *marketingv1.SavePromotionSessionRequest) (*marketingv1.PromotionSession, error) {
	return h.service.SavePromotionSession(ctx, req)
}

// ---------------------------------------------------------------------------
// 拼团
// ---------------------------------------------------------------------------

// ListGroupBuys 查询拼团活动。
func (h *Handler) ListGroupBuys(ctx context.Context, req *marketingv1.ListGroupBuysRequest) (*marketingv1.ListGroupBuysResponse, error) {
	return h.service.ListGroupBuys(ctx, req)
}

// GetGroupBuy 查询拼团活动详情。
func (h *Handler) GetGroupBuy(ctx context.Context, req *marketingv1.GetGroupBuyRequest) (*marketingv1.GetGroupBuyResponse, error) {
	return h.service.GetGroupBuy(ctx, req)
}

// JoinGroupBuy 参与拼团。
func (h *Handler) JoinGroupBuy(ctx context.Context, req *marketingv1.JoinGroupBuyRequest) (*marketingv1.GroupBuy, error) {
	return h.service.JoinGroupBuy(ctx, req)
}

// SaveGroupBuy 保存拼团活动。
func (h *Handler) SaveGroupBuy(ctx context.Context, req *marketingv1.SaveGroupBuyRequest) (*marketingv1.GroupBuy, error) {
	return h.service.SaveGroupBuy(ctx, req)
}

// ---------------------------------------------------------------------------
// 会员等级
// ---------------------------------------------------------------------------

// ListUserLevels 查询会员等级。
func (h *Handler) ListUserLevels(ctx context.Context, req *marketingv1.ListUserLevelsRequest) (*marketingv1.ListUserLevelsResponse, error) {
	return h.service.ListUserLevels(ctx, req)
}
