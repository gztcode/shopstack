package product

import (
	"context"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// ListProductParams 查询商品参数（商品属性）。
//
// 参数来源于 product_attributes 表：商品在创建/更新时写入的属性行，
// 这里按 sort、id 排序返回，供商品详情页的"规格参数"区块使用。
// 历史数据中可能存在同名同值的重复行，这里按"名称 + 取值"去重，只保留第一条。
func (s *Service) ListProductParams(ctx context.Context, req *productv1.ListProductParamsRequest) (*productv1.ListProductParamsResponse, error) {
	if req.GetProductId() <= 0 {
		return nil, errs.Invalid("商品 ID 不能为空")
	}
	if _, err := s.repo.FindProduct(ctx, uint64(req.GetProductId())); err != nil {
		return nil, err
	}

	attrs, err := s.repo.ProductAttributes(ctx, uint64(req.GetProductId()))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品参数失败", err)
	}

	seen := make(map[string]bool, len(attrs))
	params := make([]*productv1.ProductAttribute, 0, len(attrs))
	for i := range attrs {
		key := attrs[i].Name + "\x00" + attrs[i].Value
		if seen[key] {
			continue
		}
		seen[key] = true
		params = append(params, &productv1.ProductAttribute{
			Id:        int64(attrs[i].ID),
			ProductId: int64(attrs[i].ProductID),
			Name:      attrs[i].Name,
			Value:     attrs[i].Value,
			Sort:      int32(attrs[i].Sort),
		})
	}
	return &productv1.ListProductParamsResponse{Params: params}, nil
}
