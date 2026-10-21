package product

import (
	"context"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/auth"
)

// Handler 实现 ProductService、CategoryService 与 ReviewService。
type Handler struct {
	productv1.UnimplementedProductServiceServer
	productv1.UnimplementedCategoryServiceServer
	productv1.UnimplementedReviewServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ---------------------------------------------------------------------------
// ProductService
// ---------------------------------------------------------------------------

// ListProducts 商品列表。
func (h *Handler) ListProducts(ctx context.Context, req *productv1.ListProductsRequest) (*productv1.ListProductsResponse, error) {
	return h.service.ListProducts(ctx, req)
}

// GetProduct 商品详情。
func (h *Handler) GetProduct(ctx context.Context, req *productv1.GetProductRequest) (*productv1.ProductDetail, error) {
	return h.service.GetProduct(ctx, req)
}

// CreateProduct 新增商品。
func (h *Handler) CreateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
	return h.service.CreateProduct(ctx, req)
}

// UpdateProduct 更新商品。
func (h *Handler) UpdateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
	return h.service.UpdateProduct(ctx, req)
}

// DeleteProduct 删除商品。
func (h *Handler) DeleteProduct(ctx context.Context, req *productv1.DeleteProductRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteProduct(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "商品已删除"}, nil
}

// SetProductStatus 上下架商品。
func (h *Handler) SetProductStatus(ctx context.Context, req *productv1.SetProductStatusRequest) (*productv1.Product, error) {
	return h.service.SetProductStatus(ctx, req.GetId(), req.GetStatus())
}

// SaveSku 保存规格。
func (h *Handler) SaveSku(ctx context.Context, req *productv1.SaveSkuRequest) (*productv1.ProductSku, error) {
	return h.service.SaveSku(ctx, req)
}

// ListBanners 轮播列表。
func (h *Handler) ListBanners(ctx context.Context, req *productv1.ListBannersRequest) (*productv1.ListBannersResponse, error) {
	return h.service.ListBanners(ctx, req)
}

// SaveBanner 保存轮播。
func (h *Handler) SaveBanner(ctx context.Context, req *productv1.SaveBannerRequest) (*productv1.Banner, error) {
	return h.service.SaveBanner(ctx, req)
}

// DeleteBanner 删除轮播。
func (h *Handler) DeleteBanner(ctx context.Context, req *productv1.DeleteBannerRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteBanner(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "轮播位已删除"}, nil
}

// ListMaterials 素材列表。
func (h *Handler) ListMaterials(ctx context.Context, req *productv1.ListMaterialsRequest) (*productv1.ListMaterialsResponse, error) {
	return h.service.ListMaterials(ctx, req)
}

// SaveMaterial 保存素材。
func (h *Handler) SaveMaterial(ctx context.Context, req *productv1.SaveMaterialRequest) (*productv1.Material, error) {
	return h.service.SaveMaterial(ctx, req)
}

// DeleteMaterial 删除素材。
func (h *Handler) DeleteMaterial(ctx context.Context, req *productv1.DeleteMaterialRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteMaterial(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "素材已删除"}, nil
}

// ---------------------------------------------------------------------------
// 频道
// ---------------------------------------------------------------------------

// ListChannels 频道列表。
func (h *Handler) ListChannels(ctx context.Context, req *productv1.ListChannelsRequest) (*productv1.ListChannelsResponse, error) {
	return h.service.ListChannels(ctx, req)
}

// GetChannel 频道详情。
func (h *Handler) GetChannel(ctx context.Context, req *productv1.GetChannelRequest) (*productv1.Channel, error) {
	return h.service.GetChannel(ctx, req)
}

// ListChannelProducts 频道下的商品。
func (h *Handler) ListChannelProducts(ctx context.Context, req *productv1.ListChannelProductsRequest) (*productv1.ListChannelProductsResponse, error) {
	return h.service.ListChannelProducts(ctx, req)
}

// SaveChannel 保存频道。
func (h *Handler) SaveChannel(ctx context.Context, req *productv1.SaveChannelRequest) (*productv1.Channel, error) {
	return h.service.SaveChannel(ctx, req)
}

// UpdateChannel 更新频道。
func (h *Handler) UpdateChannel(ctx context.Context, req *productv1.SaveChannelRequest) (*productv1.Channel, error) {
	return h.service.UpdateChannel(ctx, req)
}

// DeleteChannel 删除频道。
func (h *Handler) DeleteChannel(ctx context.Context, req *productv1.DeleteChannelRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteChannel(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "频道已删除"}, nil
}

// ---------------------------------------------------------------------------
// 评价标签与商品保障项
// ---------------------------------------------------------------------------

// ListReviewTags 评价标签列表。
func (h *Handler) ListReviewTags(ctx context.Context, req *productv1.ListReviewTagsRequest) (*productv1.ListReviewTagsResponse, error) {
	return h.service.ListReviewTags(ctx, req)
}

// SaveReviewTag 保存评价标签。
func (h *Handler) SaveReviewTag(ctx context.Context, req *productv1.SaveReviewTagRequest) (*productv1.ReviewTag, error) {
	return h.service.SaveReviewTag(ctx, req)
}

// DeleteReviewTag 删除评价标签。
func (h *Handler) DeleteReviewTag(ctx context.Context, req *productv1.DeleteReviewTagRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteReviewTag(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "评价标签已删除"}, nil
}

// ListGuarantees 商品保障项列表。
func (h *Handler) ListGuarantees(ctx context.Context, req *productv1.ListGuaranteesRequest) (*productv1.ListGuaranteesResponse, error) {
	return h.service.ListGuarantees(ctx, req)
}

// SaveGuarantee 保存商品保障项。
func (h *Handler) SaveGuarantee(ctx context.Context, req *productv1.SaveGuaranteeRequest) (*productv1.Guarantee, error) {
	return h.service.SaveGuarantee(ctx, req)
}

// DeleteGuarantee 删除商品保障项。
func (h *Handler) DeleteGuarantee(ctx context.Context, req *productv1.DeleteGuaranteeRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteGuarantee(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "商品保障项已删除"}, nil
}

// ListProductParams 商品参数列表。
func (h *Handler) ListProductParams(ctx context.Context, req *productv1.ListProductParamsRequest) (*productv1.ListProductParamsResponse, error) {
	return h.service.ListProductParams(ctx, req)
}

// ---------------------------------------------------------------------------
// CategoryService
// ---------------------------------------------------------------------------

// ListCategories 分类列表。
func (h *Handler) ListCategories(ctx context.Context, req *productv1.ListCategoriesRequest) (*productv1.ListCategoriesResponse, error) {
	return h.service.ListCategories(ctx, req)
}

// CreateCategory 新增分类。
func (h *Handler) CreateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
	return h.service.CreateCategory(ctx, req)
}

// UpdateCategory 更新分类。
func (h *Handler) UpdateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
	return h.service.UpdateCategory(ctx, req)
}

// DeleteCategory 删除分类。
func (h *Handler) DeleteCategory(ctx context.Context, req *productv1.DeleteCategoryRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteCategory(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "分类已删除"}, nil
}

// ---------------------------------------------------------------------------
// ReviewService
// ---------------------------------------------------------------------------

// ListReviews 评价列表。
func (h *Handler) ListReviews(ctx context.Context, req *productv1.ListReviewsRequest) (*productv1.ListReviewsResponse, error) {
	return h.service.ListReviews(ctx, req)
}

// CreateReview 发表评价。
func (h *Handler) CreateReview(ctx context.Context, req *productv1.CreateReviewRequest) (*productv1.Review, error) {
	if req.GetUserId() == 0 {
		req.UserId = auth.UserIDFromContext(ctx)
	}
	return h.service.CreateReview(ctx, req)
}

// SetReviewStatus 审核评价。
func (h *Handler) SetReviewStatus(ctx context.Context, req *productv1.SetReviewStatusRequest) (*productv1.Review, error) {
	return h.service.SetReviewStatus(ctx, req.GetId(), req.GetStatus(), req.GetAdminReply())
}

// ListProductQuestions 商品下的问答列表。
func (h *Handler) ListProductQuestions(ctx context.Context, req *productv1.ListProductQuestionsRequest) (*productv1.ListProductQuestionsResponse, error) {
	return h.service.ListProductQuestions(ctx, req)
}

// CreateQuestion 用户提问。
func (h *Handler) CreateQuestion(ctx context.Context, req *productv1.CreateQuestionRequest) (*productv1.ProductQuestion, error) {
	return h.service.CreateQuestion(ctx, req)
}

// ListQuestions 后台问答列表。
func (h *Handler) ListQuestions(ctx context.Context, req *productv1.ListQuestionsRequest) (*productv1.ListQuestionsResponse, error) {
	return h.service.ListQuestions(ctx, req)
}

// AnswerQuestion 后台回答提问。
func (h *Handler) AnswerQuestion(ctx context.Context, req *productv1.AnswerQuestionRequest) (*productv1.ProductQuestion, error) {
	return h.service.AnswerQuestion(ctx, req)
}
