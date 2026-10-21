package cart

import (
	"context"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"
	commonv1 "github.com/shopstack/platform/gen/go/common/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// Handler 实现 CartService。
type Handler struct {
	cartv1.UnimplementedCartServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// userID 解析当前用户 ID。
func (h *Handler) userID(ctx context.Context, explicit int64) (int64, error) {
	if explicit > 0 {
		return explicit, nil
	}
	if uid := auth.UserIDFromContext(ctx); uid > 0 {
		return uid, nil
	}
	return 0, errs.Unauthorized("请先登录")
}

// GetCart 查询购物车。
func (h *Handler) GetCart(ctx context.Context, req *cartv1.GetCartRequest) (*cartv1.Cart, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.GetCart(ctx, uid)
}

// AddToCart 加入购物车。
func (h *Handler) AddToCart(ctx context.Context, req *cartv1.AddToCartRequest) (*cartv1.Cart, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.AddToCart(ctx, uid, req.GetProductId(), req.GetSkuId(),
		req.GetQuantity(), req.GetSelected())
}

// UpdateCartItem 更新购物车条目。
func (h *Handler) UpdateCartItem(ctx context.Context, req *cartv1.UpdateCartItemRequest) (*cartv1.Cart, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	var selected *bool
	if req.GetSelected() {
		v := true
		selected = &v
	}
	return h.service.UpdateCartItem(ctx, uid, req.GetId(), req.GetQuantity(), selected)
}

// RemoveCartItem 删除购物车条目。
func (h *Handler) RemoveCartItem(ctx context.Context, req *cartv1.RemoveCartItemRequest) (*commonv1.OperationResult, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	if err := h.service.RemoveCartItem(ctx, uid, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "已移出购物车"}, nil
}

// ClearCart 清空购物车。
func (h *Handler) ClearCart(ctx context.Context, req *cartv1.ClearCartRequest) (*commonv1.OperationResult, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	if err := h.service.ClearCart(ctx, uid); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "购物车已清空"}, nil
}

// SetAllSelected 全选。
func (h *Handler) SetAllSelected(ctx context.Context, req *cartv1.SetAllSelectedRequest) (*cartv1.Cart, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.SetAllSelected(ctx, uid, req.GetSelected())
}

// GetCount 查询购物车数量。
func (h *Handler) GetCount(ctx context.Context, req *cartv1.GetCartCountRequest) (*cartv1.GetCartCountResponse, error) {
	uid, err := h.userID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	count, err := h.service.GetCount(ctx, uid)
	if err != nil {
		return nil, err
	}
	return &cartv1.GetCartCountResponse{Count: count}, nil
}
