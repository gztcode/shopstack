package cart

import (
	"context"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"
	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// Service 承载购物车业务逻辑。
type Service struct {
	repo     *Repo
	registry *client.Registry
}

// NewService 构造购物车服务。
func NewService(repo *Repo, registry *client.Registry) *Service {
	return &Service{repo: repo, registry: registry}
}

// productInfo 是从商品服务取到的实时商品信息。
type productInfo struct {
	title     string
	specText  string
	image     string
	price     int64
	stock     int32
	available bool
}

// GetCart 查询购物车。
func (s *Service) GetCart(ctx context.Context, userID int64) (*cartv1.Cart, error) {
	items, err := s.repo.ListItems(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询购物车失败", err)
	}
	return s.buildCart(ctx, userID, items)
}

// buildCart 组装购物车视图（含实时商品信息与金额汇总）。
func (s *Service) buildCart(ctx context.Context, userID int64, items []CartItem) (*cartv1.Cart, error) {
	cart := &cartv1.Cart{UserId: userID, Items: make([]*cartv1.CartItem, 0, len(items))}

	infos, err := s.fetchProductInfos(ctx, items)
	if err != nil {
		logger.L().Warn("获取商品信息失败，购物车将展示缓存快照", zap.Error(err))
	}

	var totalCount, selectedCount int32
	var selectedAmount, selectedDiscount int64

	for i := range items {
		item := &items[i]
		info := infos[item.SKUID]

		proto := &cartv1.CartItem{
			Id:            int64(item.ID),
			UserId:        userID,
			ProductId:     int64(item.ProductID),
			SkuId:         int64(item.SKUID),
			ProductTitle:  info.title,
			SpecText:      info.specText,
			Image:         info.image,
			PriceCents:    info.price,
			Quantity:      int32(item.Quantity),
			Stock:         info.stock,
			Selected:      item.Selected,
			Available:     info.available && info.stock > 0,
			SubtotalCents: info.price * int64(item.Quantity),
			CreatedAt:     timestamppb.New(item.CreatedAt),
			UpdatedAt:     timestamppb.New(item.UpdatedAt),
		}
		if proto.Quantity > info.stock && info.stock > 0 {
			proto.Available = false
		}

		cart.Items = append(cart.Items, proto)
		totalCount += proto.Quantity
		if item.Selected && proto.Available {
			selectedCount += proto.Quantity
			selectedAmount += proto.SubtotalCents
		}
	}

	cart.TotalCount = totalCount
	cart.SelectedCount = selectedCount
	cart.SelectedAmountCents = selectedAmount
	cart.SelectedDiscountCents = selectedDiscount
	cart.SelectedPayableCents = selectedAmount - selectedDiscount
	return cart, nil
}

// fetchProductInfos 从商品服务批量拉取实时商品信息。
func (s *Service) fetchProductInfos(ctx context.Context, items []CartItem) (map[uint64]productInfo, error) {
	out := make(map[uint64]productInfo, len(items))
	if len(items) == 0 {
		return out, nil
	}

	conn, err := s.registry.Conn(ctx, "product")
	if err != nil {
		return out, err
	}
	client := productv1.NewProductServiceClient(conn)

	skuIDs := make([]int64, 0, len(items))
	for i := range items {
		skuIDs = append(skuIDs, int64(items[i].SKUID))
	}

	// 逐个查询规格（商品服务暂未提供按 SKU 批量查询接口）
	for i := range items {
		skuID := int64(items[i].SKUID)
		detail, dErr := client.GetProduct(ctx, &productv1.GetProductRequest{Id: int64(items[i].ProductID)})
		if dErr != nil {
			out[items[i].SKUID] = productInfo{available: false}
			continue
		}
		for _, sku := range detail.GetSkus() {
			if sku.GetId() != skuID {
				continue
			}
			out[items[i].SKUID] = productInfo{
				title:     detail.GetProduct().GetTitle(),
				specText:  sku.GetSpecText(),
				image:     firstNonEmpty(sku.GetImage(), detail.GetProduct().GetCover()),
				price:     sku.GetPriceCents(),
				stock:     sku.GetStock(),
				available: detail.GetProduct().GetStatus() == commonv1.ProductStatus_PRODUCT_STATUS_ON_SHELF,
			}
			break
		}
	}
	return out, nil
}

// AddToCart 加入购物车。
func (s *Service) AddToCart(ctx context.Context, userID, productID, skuID int64, quantity int32, selected bool) (*cartv1.Cart, error) {
	if productID <= 0 || skuID <= 0 {
		return nil, errs.Invalid("商品与规格不能为空")
	}
	if quantity <= 0 {
		quantity = 1
	}
	if quantity > 999 {
		return nil, errs.Invalid("单次加购数量不能超过 999")
	}

	// 校验商品状态与库存
	info, err := s.fetchOneProductInfo(ctx, productID, skuID)
	if err != nil {
		return nil, err
	}
	if !info.available {
		return nil, errs.New(errs.CodeProductOffShelf, "商品已下架")
	}
	if info.stock <= 0 {
		return nil, errs.New(errs.CodeStockInsufficient, "商品库存不足")
	}

	existing, err := s.repo.FindBySKU(ctx, uint64(userID), uint64(skuID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询购物车失败", err)
	}

	if existing != nil {
		newQty := existing.Quantity + int(quantity)
		if int32(newQty) > info.stock {
			newQty = int(info.stock)
		}
		if err := s.repo.UpdateItemFields(ctx, existing.ID, map[string]any{
			"quantity":   newQty,
			"selected":   selected || existing.Selected,
			"updated_at": time.Now(),
		}); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "更新购物车失败", err)
		}
	} else {
		item := &CartItem{
			UserID:    uint64(userID),
			ProductID: uint64(productID),
			SKUID:     uint64(skuID),
			Quantity:  int(quantity),
			Selected:  selected,
		}
		if err := s.repo.SaveItem(ctx, item); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "加入购物车失败", err)
		}
	}

	return s.GetCart(ctx, userID)
}

// fetchOneProductInfo 查询单个 SKU 的商品信息。
func (s *Service) fetchOneProductInfo(ctx context.Context, productID, skuID int64) (productInfo, error) {
	conn, err := s.registry.Conn(ctx, "product")
	if err != nil {
		return productInfo{}, errs.Wrap(errs.CodeUnavailable, "商品服务暂不可用", err)
	}
	client := productv1.NewProductServiceClient(conn)

	detail, err := client.GetProduct(ctx, &productv1.GetProductRequest{Id: productID})
	if err != nil {
		return productInfo{}, errs.Wrap(errs.CodeProductNotFound, "商品不存在或已下架", err)
	}
	for _, sku := range detail.GetSkus() {
		if sku.GetId() == skuID {
			return productInfo{
				title:     detail.GetProduct().GetTitle(),
				specText:  sku.GetSpecText(),
				image:     firstNonEmpty(sku.GetImage(), detail.GetProduct().GetCover()),
				price:     sku.GetPriceCents(),
				stock:     sku.GetStock(),
				available: detail.GetProduct().GetStatus() == commonv1.ProductStatus_PRODUCT_STATUS_ON_SHELF,
			}, nil
		}
	}
	return productInfo{}, errs.New(errs.CodeSkuNotFound, "商品规格不存在")
}

// UpdateCartItem 更新购物车条目。
func (s *Service) UpdateCartItem(ctx context.Context, userID, itemID int64, quantity int32, selected *bool) (*cartv1.Cart, error) {
	item, err := s.repo.FindItem(ctx, uint64(userID), uint64(itemID))
	if err != nil {
		return nil, err
	}

	fields := map[string]any{"updated_at": time.Now()}
	if quantity > 0 {
		if quantity > 999 {
			return nil, errs.Invalid("单次购买数量不能超过 999")
		}
		info, iErr := s.fetchOneProductInfo(ctx, int64(item.ProductID), int64(item.SKUID))
		if iErr == nil && info.stock > 0 && quantity > info.stock {
			return nil, errs.New(errs.CodeStockInsufficient, "库存不足")
		}
		fields["quantity"] = int(quantity)
	}
	if selected != nil {
		fields["selected"] = *selected
	}

	if err := s.repo.UpdateItemFields(ctx, item.ID, fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新购物车失败", err)
	}
	return s.GetCart(ctx, userID)
}

// RemoveCartItem 删除购物车条目。
func (s *Service) RemoveCartItem(ctx context.Context, userID, itemID int64) error {
	if _, err := s.repo.FindItem(ctx, uint64(userID), uint64(itemID)); err != nil {
		return err
	}
	if err := s.repo.DeleteItem(ctx, uint64(userID), uint64(itemID)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除购物车条目失败", err)
	}
	return nil
}

// ClearCart 清空购物车。
func (s *Service) ClearCart(ctx context.Context, userID int64) error {
	if err := s.repo.Clear(ctx, uint64(userID)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "清空购物车失败", err)
	}
	return nil
}

// SetAllSelected 全选/取消全选。
func (s *Service) SetAllSelected(ctx context.Context, userID int64, selected bool) (*cartv1.Cart, error) {
	if err := s.repo.SetAllSelected(ctx, uint64(userID), selected); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "设置全选状态失败", err)
	}
	return s.GetCart(ctx, userID)
}

// GetCount 查询购物车条目数量（用于角标）。
func (s *Service) GetCount(ctx context.Context, userID int64) (int32, error) {
	count, err := s.repo.CountItems(ctx, uint64(userID))
	if err != nil {
		return 0, errs.Wrap(errs.CodeInternalError, "查询购物车数量失败", err)
	}
	return count, nil
}

// RemoveItems 批量删除条目（下单成功后清理）。
func (s *Service) RemoveItems(ctx context.Context, userID int64, itemIDs []uint64) error {
	if err := s.repo.DeleteItems(ctx, uint64(userID), itemIDs); err != nil {
		return errs.Wrap(errs.CodeInternalError, "清理购物车失败", err)
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
