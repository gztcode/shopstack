package product

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/mq"
)

// Service 承载商品域的业务逻辑。
type Service struct {
	repo *Repo
	mq   *mq.Client
}

// NewService 构造商品服务。
func NewService(repo *Repo, mqClient *mq.Client) *Service {
	return &Service{repo: repo, mq: mqClient}
}

// ---------------------------------------------------------------------------
// 商品列表与详情
// ---------------------------------------------------------------------------

// ListProducts 分页查询商品。
func (s *Service) ListProducts(ctx context.Context, req *productv1.ListProductsRequest) (*productv1.ListProductsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListProducts(ctx, ProductQuery{
		Keyword:       strings.TrimSpace(req.GetKeyword()),
		CategoryID:    uint64(req.GetCategoryId()),
		Status:        int8(req.GetStatus()),
		MinPriceCents: req.GetMinPriceCents(),
		MaxPriceCents: req.GetMaxPriceCents(),
		OnlyInStock:   req.GetOnlyInStock(),
		Tags:          req.GetTags(),
		Sort:          req.GetSort(),
		Page:          page,
		PageSize:      pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品失败", err)
	}

	categoryNames, err := s.categoryNameMap(ctx)
	if err != nil {
		categoryNames = map[uint64]string{}
	}

	products := make([]*productv1.Product, 0, len(list))
	for i := range list {
		products = append(products, s.productToProto(&list[i], categoryNames))
	}

	return &productv1.ListProductsResponse{
		Products: products,
		Meta:     buildMeta(page, pageSize, total),
	}, nil
}

// GetProduct 查询商品详情。
func (s *Service) GetProduct(ctx context.Context, req *productv1.GetProductRequest) (*productv1.ProductDetail, error) {
	p, err := s.repo.FindProduct(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	skus, err := s.repo.ProductSkus(ctx, p.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品规格失败", err)
	}
	images, err := s.repo.ProductImages(ctx, p.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品图集失败", err)
	}
	attrs, err := s.repo.ProductAttributes(ctx, p.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品参数失败", err)
	}

	total, _, _, _, avg, err := s.repo.ReviewSummary(ctx, p.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计评价失败", err)
	}

	reviews, _, err := s.repo.ListReviews(ctx, ReviewQuery{
		ProductID: p.ID, Status: ReviewApproved, Page: 1, PageSize: 5,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询评价失败", err)
	}

	// 相关推荐：同分类下销量最高的其它商品
	related, _, err := s.repo.ListProducts(ctx, ProductQuery{
		CategoryID: p.CategoryID, Status: StatusOnShelf, Sort: "sales", Page: 1, PageSize: 6,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询推荐商品失败", err)
	}
	relatedList := make([]*productv1.Product, 0, len(related))
	categoryNames, _ := s.categoryNameMap(ctx)
	for i := range related {
		if related[i].ID == p.ID {
			continue
		}
		relatedList = append(relatedList, s.productToProto(&related[i], categoryNames))
		if len(relatedList) >= 6 {
			break
		}
	}

	categoryNames2, _ := s.categoryNameMap(ctx)
	detail := &productv1.ProductDetail{
		Product:      s.productToProto(p, categoryNames2),
		Skus:         make([]*productv1.ProductSku, 0, len(skus)),
		Images:       make([]*commonv1.ImageItem, 0, len(images)),
		Attributes:   make([]*productv1.ProductAttribute, 0, len(attrs)),
		Reviews:      make([]*productv1.Review, 0, len(reviews)),
		ReviewCount:  total,
		ReviewRating: avg,
		Related:      relatedList,
	}

	for i := range skus {
		detail.Skus = append(detail.Skus, skuToProto(&skus[i]))
	}
	for i := range images {
		detail.Images = append(detail.Images, &commonv1.ImageItem{
			Url: images[i].URL, Alt: images[i].Alt, Sort: int32(images[i].Sort),
		})
	}
	for i := range attrs {
		detail.Attributes = append(detail.Attributes, &productv1.ProductAttribute{
			Id: int64(attrs[i].ID), ProductId: int64(attrs[i].ProductID),
			Name: attrs[i].Name, Value: attrs[i].Value, Sort: int32(attrs[i].Sort),
		})
	}
	for i := range reviews {
		detail.Reviews = append(detail.Reviews, reviewToProto(&reviews[i]))
	}

	return detail, nil
}

// ---------------------------------------------------------------------------
// 商品维护
// ---------------------------------------------------------------------------

// CreateProduct 新增商品。
func (s *Service) CreateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
	if strings.TrimSpace(req.GetTitle()) == "" {
		return nil, errs.Invalid("商品标题不能为空")
	}

	p := &Product{
		Title:       req.GetTitle(),
		Subtitle:    req.GetSubtitle(),
		Cover:       req.GetCover(),
		CategoryID:  uint64(req.GetCategoryId()),
		Description: req.GetDescription(),
		Tags:        strings.Join(req.GetTags(), ","),
		Status:      int8(req.GetStatus()),
	}
	if p.Status == 0 {
		p.Status = StatusDraft
	}
	if p.Tags == "" {
		p.Tags = ""
	}

	if err := s.repo.SaveProduct(ctx, p); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建商品失败", err)
	}

	if err := s.saveSubResources(ctx, p.ID, req); err != nil {
		return nil, err
	}
	if err := s.repo.RecalculateProductPrice(ctx, p.ID); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
	}

	created, err := s.repo.FindProduct(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	s.publishProductChanged(ctx, p.ID)
	return s.productToProto(created, map[uint64]string{}), nil
}

// UpdateProduct 更新商品。
func (s *Service) UpdateProduct(ctx context.Context, req *productv1.SaveProductRequest) (*productv1.Product, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("商品 ID 不能为空")
	}
	if _, err := s.repo.FindProduct(ctx, uint64(req.GetId())); err != nil {
		return nil, err
	}

	fields := map[string]any{}
	if req.GetTitle() != "" {
		fields["title"] = req.GetTitle()
	}
	fields["subtitle"] = req.GetSubtitle()
	fields["cover"] = req.GetCover()
	fields["category_id"] = req.GetCategoryId()
	fields["description"] = req.GetDescription()
	fields["tags"] = strings.Join(req.GetTags(), ",")
	if req.GetStatus() > 0 {
		fields["status"] = int8(req.GetStatus())
	}

	if err := s.repo.UpdateProductFields(ctx, uint64(req.GetId()), fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新商品失败", err)
	}
	if err := s.saveSubResources(ctx, uint64(req.GetId()), req); err != nil {
		return nil, err
	}
	if err := s.repo.RecalculateProductPrice(ctx, uint64(req.GetId())); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
	}

	updated, err := s.repo.FindProduct(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}
	s.publishProductChanged(ctx, uint64(req.GetId()))
	return s.productToProto(updated, map[uint64]string{}), nil
}

// saveSubResources 保存商品的图集、参数与 SKU。
func (s *Service) saveSubResources(ctx context.Context, productID uint64, req *productv1.SaveProductRequest) error {
	images := make([]ProductImage, 0, len(req.GetImages()))
	for _, img := range req.GetImages() {
		images = append(images, ProductImage{
			URL: img.GetUrl(), Alt: img.GetAlt(), Sort: int(img.GetSort()),
		})
	}
	if err := s.repo.ReplaceProductImages(ctx, productID, images); err != nil {
		return errs.Wrap(errs.CodeInternalError, "保存商品图片失败", err)
	}

	attrs := make([]ProductAttribute, 0, len(req.GetAttributes()))
	for _, a := range req.GetAttributes() {
		attrs = append(attrs, ProductAttribute{
			Name: a.GetName(), Value: a.GetValue(), Sort: int(a.GetSort()),
		})
	}
	if err := s.repo.ReplaceProductAttributes(ctx, productID, attrs); err != nil {
		return errs.Wrap(errs.CodeInternalError, "保存商品参数失败", err)
	}

	for _, sku := range req.GetSkus() {
		specs := "{}"
		if len(sku.GetSpecs()) > 0 {
			if raw, err := json.Marshal(sku.GetSpecs()); err == nil {
				specs = string(raw)
			}
		}
		model := &ProductSku{
			ID:                 uint64(sku.GetId()),
			ProductID:          productID,
			SKUCode:            sku.GetSkuCode(),
			SpecText:           sku.GetSpecText(),
			Specs:              specs,
			PriceCents:         sku.GetPriceCents(),
			OriginalPriceCents: sku.GetOriginalPriceCents(),
			Stock:              int(sku.GetStock()),
			Image:              sku.GetImage(),
			Sort:               int(sku.GetSort()),
			WeightGrams:        int(sku.GetWeightGrams()),
			Enabled:            sku.GetEnabled(),
		}
		// enabled 以请求为准：后台新建规格时默认勾选「启用」，
		// 若强行改成 true，用户主动取消勾选的选择会被丢掉。
		if err := s.repo.SaveSku(ctx, model); err != nil {
			return errs.Wrap(errs.CodeInternalError, "保存商品规格失败", err)
		}
	}
	return nil
}

// DeleteProduct 删除商品。
func (s *Service) DeleteProduct(ctx context.Context, id int64) error {
	if _, err := s.repo.FindProduct(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteProduct(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除商品失败", err)
	}
	s.publishProductChanged(ctx, uint64(id))
	return nil
}

// SetProductStatus 上架/下架商品。
func (s *Service) SetProductStatus(ctx context.Context, id int64, status int32) (*productv1.Product, error) {
	if status != StatusDraft && status != StatusOnShelf && status != StatusOffShelf {
		return nil, errs.Invalid("非法的商品状态")
	}
	if _, err := s.repo.FindProduct(ctx, uint64(id)); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateProductFields(ctx, uint64(id), map[string]any{"status": int8(status)}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新商品状态失败", err)
	}
	p, err := s.repo.FindProduct(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	s.publishProductChanged(ctx, uint64(id))
	return s.productToProto(p, map[uint64]string{}), nil
}

// SaveSku 新增或更新规格。
func (s *Service) SaveSku(ctx context.Context, req *productv1.SaveSkuRequest) (*productv1.ProductSku, error) {
	if req.GetProductId() <= 0 {
		return nil, errs.Invalid("商品 ID 不能为空")
	}
	if req.GetPriceCents() <= 0 {
		return nil, errs.Invalid("规格价格必须大于 0")
	}

	specs := "{}"
	if len(req.GetSpecs()) > 0 {
		if raw, err := json.Marshal(req.GetSpecs()); err == nil {
			specs = string(raw)
		}
	}
	model := &ProductSku{
		ID:                 uint64(req.GetId()),
		ProductID:          uint64(req.GetProductId()),
		SKUCode:            req.GetSkuCode(),
		SpecText:           req.GetSpecText(),
		Specs:              specs,
		PriceCents:         req.GetPriceCents(),
		OriginalPriceCents: req.GetOriginalPriceCents(),
		Stock:              int(req.GetStock()),
		Image:              req.GetImage(),
		Sort:               int(req.GetSort()),
		WeightGrams:        int(req.GetWeightGrams()),
		Enabled:            req.GetEnabled(),
	}
	// enabled 以请求为准：后台新建规格时默认勾选「启用」，
	// 若强行改成 true，用户主动取消勾选的选择会被丢掉。
	if err := s.repo.SaveSku(ctx, model); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存规格失败", err)
	}
	if err := s.repo.RecalculateProductPrice(ctx, model.ProductID); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "计算商品价格失败", err)
	}
	return skuToProto(model), nil
}

// publishProductChanged 发布商品变更事件，通知缓存失效。
func (s *Service) publishProductChanged(ctx context.Context, productID uint64) {
	if s.mq == nil {
		return
	}
	s.mq.PublishAsync(mq.NewEvent(mq.EventProductChanged, "product-service", "",
		map[string]any{"product_id": productID}))
}

// ---------------------------------------------------------------------------
// 分类
// ---------------------------------------------------------------------------

// ListCategories 查询分类（tree=true 时返回树形结构）。
func (s *Service) ListCategories(ctx context.Context, req *productv1.ListCategoriesRequest) (*productv1.ListCategoriesResponse, error) {
	all, err := s.repo.AllCategories(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询分类失败", err)
	}
	counts, err := s.repo.CategoryProductCounts(ctx)
	if err != nil {
		counts = map[uint64]int32{}
	}

	if !req.GetTree() {
		list := make([]*productv1.Category, 0, len(all))
		for i := range all {
			if req.GetParentId() > 0 && all[i].ParentID != uint64(req.GetParentId()) {
				continue
			}
			list = append(list, categoryToProto(&all[i], counts[all[i].ID]))
		}
		return &productv1.ListCategoriesResponse{Categories: list}, nil
	}

	// 构建两级分类树（一级 + 二级）
	childrenMap := make(map[uint64][]*productv1.Category)
	for i := range all {
		c := categoryToProto(&all[i], counts[all[i].ID])
		if all[i].ParentID == 0 {
			continue
		}
		childrenMap[all[i].ParentID] = append(childrenMap[all[i].ParentID], c)
	}

	roots := make([]*productv1.Category, 0, len(all))
	for i := range all {
		if all[i].ParentID != 0 {
			continue
		}
		c := categoryToProto(&all[i], counts[all[i].ID])
		c.Children = childrenMap[all[i].ID]
		roots = append(roots, c)
	}
	return &productv1.ListCategoriesResponse{Categories: roots}, nil
}

// CreateCategory 新增分类。
func (s *Service) CreateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
	if strings.TrimSpace(req.GetName()) == "" {
		return nil, errs.Invalid("分类名称不能为空")
	}
	c := &Category{
		Name:        req.GetName(),
		ParentID:    uint64(req.GetParentId()),
		Icon:        req.GetIcon(),
		Description: req.GetDescription(),
		Sort:        int(req.GetSort()),
		Visible:     req.GetVisible(),
	}
	if err := s.repo.SaveCategory(ctx, c); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建分类失败", err)
	}
	return categoryToProto(c, 0), nil
}

// UpdateCategory 更新分类。
func (s *Service) UpdateCategory(ctx context.Context, req *productv1.SaveCategoryRequest) (*productv1.Category, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("分类 ID 不能为空")
	}
	existing, err := s.repo.FindCategory(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}
	if uint64(req.GetParentId()) == existing.ID {
		return nil, errs.Invalid("分类不能以自身为父级")
	}

	existing.Name = req.GetName()
	existing.ParentID = uint64(req.GetParentId())
	existing.Icon = req.GetIcon()
	existing.Description = req.GetDescription()
	existing.Sort = int(req.GetSort())
	existing.Visible = req.GetVisible()

	if err := s.repo.SaveCategory(ctx, existing); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新分类失败", err)
	}
	return categoryToProto(existing, 0), nil
}

// DeleteCategory 删除分类。
func (s *Service) DeleteCategory(ctx context.Context, id int64) error {
	hasChildren, err := s.repo.CategoryHasChildren(ctx, uint64(id))
	if err != nil {
		return errs.Wrap(errs.CodeInternalError, "检查子分类失败", err)
	}
	if hasChildren {
		return errs.Conflict("该分类下还有子分类，无法删除")
	}
	if err := s.repo.DeleteCategory(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除分类失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 轮播
// ---------------------------------------------------------------------------

// ListBanners 查询轮播位。
func (s *Service) ListBanners(ctx context.Context, req *productv1.ListBannersRequest) (*productv1.ListBannersResponse, error) {
	list, err := s.repo.ListBanners(ctx, req.GetPosition(), true)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询轮播位失败", err)
	}
	out := make([]*productv1.Banner, 0, len(list))
	for i := range list {
		out = append(out, bannerToProto(&list[i]))
	}
	return &productv1.ListBannersResponse{Banners: out}, nil
}

// SaveBanner 新增或更新轮播位。
func (s *Service) SaveBanner(ctx context.Context, req *productv1.SaveBannerRequest) (*productv1.Banner, error) {
	if strings.TrimSpace(req.GetImage()) == "" {
		return nil, errs.Invalid("轮播图片不能为空")
	}
	b := &Banner{
		ID:       uint64(req.GetId()),
		Title:    req.GetTitle(),
		Image:    req.GetImage(),
		Link:     req.GetLink(),
		Sort:     int(req.GetSort()),
		Position: req.GetPosition(),
		Visible:  req.GetVisible(),
	}
	if b.Position == "" {
		b.Position = "home_banner"
	}
	if err := s.repo.SaveBanner(ctx, b); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存轮播位失败", err)
	}
	return bannerToProto(b), nil
}

// DeleteBanner 删除轮播位。
func (s *Service) DeleteBanner(ctx context.Context, id int64) error {
	if err := s.repo.DeleteBanner(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除轮播位失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 评价
// ---------------------------------------------------------------------------

// ListReviews 分页查询评价。
//
// 筛选语义：
//   - 指定 product_id：返回该商品的全部评价（商品详情页场景，登录与否都一样）。
//   - 未指定 product_id 且指定 user_id：返回该用户的评价（「我的评价」场景）。
//   - 未指定 product_id 且未指定 user_id：按当前登录用户过滤；
//     管理员令牌不强制过滤，可查看全量评价。
func (s *Service) ListReviews(ctx context.Context, req *productv1.ListReviewsRequest) (*productv1.ListReviewsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	userID := uint64(req.GetUserId())
	if userID == 0 && req.GetProductId() == 0 && !auth.IsAdmin(ctx) {
		userID = uint64(auth.UserIDFromContext(ctx))
	}

	list, total, err := s.repo.ListReviews(ctx, ReviewQuery{
		ProductID: uint64(req.GetProductId()),
		UserID:    userID,
		Status:    int8(req.GetStatus()),
		Keyword:   strings.TrimSpace(req.GetKeyword()),
		Page:      page,
		PageSize:  pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询评价失败", err)
	}

	out := make([]*productv1.Review, 0, len(list))
	for i := range list {
		out = append(out, reviewToProto(&list[i]))
	}

	totalCount, goodCount, mediumCount, badCount, avg, err := s.repo.ReviewSummary(ctx, uint64(req.GetProductId()))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计评价失败", err)
	}

	return &productv1.ListReviewsResponse{
		Reviews: out,
		Meta:    buildMeta(page, pageSize, total),
		Summary: &productv1.ReviewSummary{
			Total: totalCount,
			Good:  goodCount, Medium: mediumCount, Bad: badCount, Average: avg,
		},
	}, nil
}

// CreateReview 发表评价。
func (s *Service) CreateReview(ctx context.Context, req *productv1.CreateReviewRequest) (*productv1.Review, error) {
	if req.GetProductId() <= 0 {
		return nil, errs.Invalid("商品 ID 不能为空")
	}
	if req.GetRating() < 1 || req.GetRating() > 5 {
		return nil, errs.Invalid("评分必须在 1 到 5 之间")
	}
	if strings.TrimSpace(req.GetContent()) == "" {
		return nil, errs.Invalid("评价内容不能为空")
	}

	product, err := s.repo.FindProduct(ctx, uint64(req.GetProductId()))
	if err != nil {
		return nil, err
	}

	skuText := ""
	if req.GetSkuId() > 0 {
		if sku, sErr := s.repo.FindSku(ctx, uint64(req.GetSkuId())); sErr == nil {
			skuText = sku.SpecText
		}
	}

	rv := &Review{
		ProductID:    product.ID,
		ProductTitle: product.Title,
		UserID:       uint64(req.GetUserId()),
		Rating:       int8(req.GetRating()),
		Content:      req.GetContent(),
		Images:       strings.Join(req.GetImages(), ","),
		SKUID:        uint64(req.GetSkuId()),
		SKUText:      skuText,
		Status:       ReviewPending,
	}
	if err := s.repo.SaveReview(ctx, rv); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "发表评价失败", err)
	}
	return reviewToProto(rv), nil
}

// SetReviewStatus 审核评价。
func (s *Service) SetReviewStatus(ctx context.Context, id int64, status int32, reply string) (*productv1.Review, error) {
	if status != ReviewPending && status != ReviewApproved && status != ReviewRejected {
		return nil, errs.Invalid("非法的评价状态")
	}
	if _, err := s.repo.FindReview(ctx, uint64(id)); err != nil {
		return nil, err
	}
	fields := map[string]any{"status": int8(status)}
	if reply != "" {
		fields["admin_reply"] = reply
	}
	if err := s.repo.UpdateReview(ctx, uint64(id), fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新评价状态失败", err)
	}
	rv, err := s.repo.FindReview(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	return reviewToProto(rv), nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

// categoryNameMap 返回分类 ID 到名称的映射。
func (s *Service) categoryNameMap(ctx context.Context) (map[uint64]string, error) {
	list, err := s.repo.AllCategories(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[uint64]string, len(list))
	for i := range list {
		out[list[i].ID] = list[i].Name
	}
	return out, nil
}

func (s *Service) productToProto(p *Product, categoryNames map[uint64]string) *productv1.Product {
	if p == nil {
		return nil
	}
	return &productv1.Product{
		Id:            int64(p.ID),
		Title:         p.Title,
		Subtitle:      p.Subtitle,
		Cover:         p.Cover,
		CategoryId:    int64(p.CategoryID),
		CategoryName:  categoryNames[p.CategoryID],
		MinPriceCents: p.MinPriceCents,
		MaxPriceCents: p.MaxPriceCents,
		SalesCount:    int64(p.SalesCount),
		StockTotal:    0,
		Status:        commonv1.ProductStatus(p.Status),
		Description:   p.Description,
		Tags:          splitTags(p.Tags),
		CreatedAt:     timestamppb.New(p.CreatedAt),
		UpdatedAt:     timestamppb.New(p.UpdatedAt),
	}
}

func splitTags(tags string) []string {
	if tags == "" {
		return []string{}
	}
	parts := strings.Split(tags, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func skuToProto(s *ProductSku) *productv1.ProductSku {
	if s == nil {
		return nil
	}
	specs := map[string]string{}
	if s.Specs != "" {
		_ = json.Unmarshal([]byte(s.Specs), &specs)
	}
	return &productv1.ProductSku{
		Id:                 int64(s.ID),
		ProductId:          int64(s.ProductID),
		SkuCode:            s.SKUCode,
		SpecText:           s.SpecText,
		Specs:              specs,
		PriceCents:         s.PriceCents,
		OriginalPriceCents: s.OriginalPriceCents,
		Stock:              int32(s.Stock),
		LockedStock:        0,
		Image:              s.Image,
		Sort:               int32(s.Sort),
		SalesCount:         int32(s.SalesCount),
		Enabled:            s.Enabled,
		WeightGrams:        int64(s.WeightGrams),
	}
}

func categoryToProto(c *Category, productCount int32) *productv1.Category {
	if c == nil {
		return nil
	}
	return &productv1.Category{
		Id:           int64(c.ID),
		Name:         c.Name,
		ParentId:     int64(c.ParentID),
		Icon:         c.Icon,
		Description:  c.Description,
		Sort:         int32(c.Sort),
		Visible:      c.Visible,
		ProductCount: productCount,
	}
}

func bannerToProto(b *Banner) *productv1.Banner {
	if b == nil {
		return nil
	}
	return &productv1.Banner{
		Id:        int64(b.ID),
		Title:     b.Title,
		Image:     b.Image,
		Link:      b.Link,
		Sort:      int32(b.Sort),
		Position:  b.Position,
		Visible:   b.Visible,
		CreatedAt: timestamppb.New(b.CreatedAt),
	}
}

func reviewToProto(rv *Review) *productv1.Review {
	if rv == nil {
		return nil
	}
	images := []string{}
	if rv.Images != "" {
		for _, p := range strings.Split(rv.Images, ",") {
			if p = strings.TrimSpace(p); p != "" {
				images = append(images, p)
			}
		}
	}
	return &productv1.Review{
		Id:           int64(rv.ID),
		ProductId:    int64(rv.ProductID),
		ProductTitle: rv.ProductTitle,
		UserId:       int64(rv.UserID),
		UserNickname: rv.UserNickname,
		UserAvatar:   rv.UserAvatar,
		Rating:       int32(rv.Rating),
		Content:      rv.Content,
		Images:       images,
		SkuId:        int32(rv.SKUID),
		SkuText:      rv.SKUText,
		Status:       commonv1.ReviewStatus(rv.Status),
		AdminReply:   rv.AdminReply,
		LikeCount:    int32(rv.LikeCount),
		CreatedAt:    timestamppb.New(rv.CreatedAt),
	}
}

// normalizePage 归一化分页参数。
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

// buildMeta 构造分页元信息。
func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page:       int32(page),
		PageSize:   int32(pageSize),
		Total:      total,
		TotalPages: int32(totalPages),
	}
}

// unusedGuard 保留 time 包的引用，避免在部分构建配置下触发未使用告警。
var _ = time.Now
var _ = strconv.Itoa
