package marketing

import (
	"context"
	"time"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListPromotionProductIDs 返回活动关联的商品 ID 列表。
//
// 活动的商品来源有两处：活动自身绑定的商品，以及挂在该活动下的拼团商品。
func (r *Repo) ListPromotionProductIDs(ctx context.Context, promotionID uint64) ([]uint64, error) {
	var ids []uint64

	type productIDRow struct {
		ProductID uint64 `gorm:"column:product_id"`
	}

	var promoRows []productIDRow
	err := r.db.WithContext(ctx).Model(&Promotion{}).
		Where("id = ? AND product_id > 0", promotionID).
		Select("product_id").Scan(&promoRows).Error
	if err != nil {
		return nil, err
	}
	for _, rw := range promoRows {
		ids = append(ids, rw.ProductID)
	}

	var groupBuyRows []productIDRow
	err = r.db.WithContext(ctx).Model(&GroupBuy{}).
		Where("promotion_id = ? AND product_id > 0", promotionID).
		Select("product_id").Scan(&groupBuyRows).Error
	if err != nil {
		return nil, err
	}
	for _, rw := range groupBuyRows {
		ids = append(ids, rw.ProductID)
	}

	return dedupeIDs(ids), nil
}

// ListProductSummaries 按 ID 批量查询商品摘要。
func (r *Repo) ListProductSummaries(ctx context.Context, ids []uint64) ([]ProductSummary, error) {
	if len(ids) == 0 {
		return []ProductSummary{}, nil
	}
	var list []ProductSummary
	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}

// ProductStockTotals 批量统计商品启用规格的总库存。
func (r *Repo) ProductStockTotals(ctx context.Context, productIDs []uint64) (map[uint64]int, error) {
	out := make(map[uint64]int, len(productIDs))
	if len(productIDs) == 0 {
		return out, nil
	}
	type row struct {
		ProductID uint64
		Total     int
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&ProductSkuSummary{}).
		Where("product_id IN ? AND enabled = ?", productIDs, true).
		Select("product_id, COALESCE(SUM(stock), 0) AS total").
		Group("product_id").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, rw := range rows {
		out[rw.ProductID] = rw.Total
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetPromotion 查询活动详情：活动本身、参与商品与活动场次。
func (s *Service) GetPromotion(ctx context.Context, req *marketingv1.GetPromotionRequest) (*marketingv1.GetPromotionResponse, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("活动 ID 不能为空")
	}
	promo, err := s.repo.FindPromotionByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	now := time.Now()
	products, err := s.promotionProducts(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	sessions, _, err := s.repo.ListPromotionSessions(ctx, uint64(req.GetId()), 1, 100)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询活动场次失败", err)
	}
	sessionProtos := make([]*marketingv1.PromotionSession, 0, len(sessions))
	for i := range sessions {
		sessionProtos = append(sessionProtos, sessionToProto(&sessions[i], now))
	}

	return &marketingv1.GetPromotionResponse{
		Promotion: promotionToProto(promo, now),
		Products:  products,
		Sessions:  sessionProtos,
	}, nil
}

// ListPromotionProducts 分页查询活动参与的商品。
func (s *Service) ListPromotionProducts(ctx context.Context, req *marketingv1.ListPromotionProductsRequest) (*marketingv1.ListPromotionProductsResponse, error) {
	if req.GetPromotionId() <= 0 {
		return nil, errs.Invalid("活动 ID 不能为空")
	}
	if _, err := s.repo.FindPromotionByID(ctx, uint64(req.GetPromotionId())); err != nil {
		return nil, err
	}

	page, pageSize := normalizePage(req.GetPage())
	products, err := s.promotionProducts(ctx, uint64(req.GetPromotionId()))
	if err != nil {
		return nil, err
	}

	total := int64(len(products))
	start := (page - 1) * pageSize
	if start > len(products) {
		start = len(products)
	}
	end := start + pageSize
	if end > len(products) {
		end = len(products)
	}

	return &marketingv1.ListPromotionProductsResponse{
		Products: products[start:end],
		Meta:     buildMeta(page, pageSize, total),
	}, nil
}

// promotionProducts 组装活动关联的商品摘要列表。
func (s *Service) promotionProducts(ctx context.Context, promotionID uint64) ([]*marketingv1.PromotionProduct, error) {
	ids, err := s.repo.ListPromotionProductIDs(ctx, promotionID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询活动商品失败", err)
	}
	if len(ids) == 0 {
		return []*marketingv1.PromotionProduct{}, nil
	}

	summaries, err := s.repo.ListProductSummaries(ctx, ids)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询活动商品失败", err)
	}
	stocks, err := s.repo.ProductStockTotals(ctx, ids)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询活动商品库存失败", err)
	}

	out := make([]*marketingv1.PromotionProduct, 0, len(summaries))
	for i := range summaries {
		p := &summaries[i]
		out = append(out, &marketingv1.PromotionProduct{
			Id:            int64(p.ID),
			Title:         p.Title,
			Image:         p.Cover,
			MinPriceCents: p.MinPriceCents,
			MaxPriceCents: p.MaxPriceCents,
			StockTotal:    int32(stocks[p.ID]),
			Sales:         int32(p.SalesCount),
			Status:        int32(p.Status),
		})
	}
	return out, nil
}

// dedupeIDs 去重并保持顺序。
func dedupeIDs(ids []uint64) []uint64 {
	seen := make(map[uint64]bool, len(ids))
	out := make([]uint64, 0, len(ids))
	for _, id := range ids {
		if id == 0 || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}
