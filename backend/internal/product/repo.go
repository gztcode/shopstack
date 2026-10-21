package product

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Repo 封装商品域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// ---------------------------------------------------------------------------
// 分类
// ---------------------------------------------------------------------------

// ListCategories 查询分类列表。
func (r *Repo) ListCategories(ctx context.Context, parentID uint64, onlyVisible bool) ([]Category, error) {
	q := r.db.WithContext(ctx).Model(&Category{})
	if parentID > 0 {
		q = q.Where("parent_id = ?", parentID)
	}
	if onlyVisible {
		q = q.Where("visible = ?", true)
	}
	var list []Category
	err := q.Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// AllCategories 查询全部分类（用于构建树）。
func (r *Repo) AllCategories(ctx context.Context) ([]Category, error) {
	var list []Category
	err := r.db.WithContext(ctx).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// FindCategory 按 ID 查询分类。
func (r *Repo) FindCategory(ctx context.Context, id uint64) (*Category, error) {
	var c Category
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "分类不存在")
		}
		return nil, err
	}
	return &c, nil
}

// SaveCategory 新增或更新分类。
func (r *Repo) SaveCategory(ctx context.Context, c *Category) error {
	return r.db.WithContext(ctx).Save(c).Error
}

// CategoryHasChildren 判断分类下是否有子分类。
func (r *Repo) CategoryHasChildren(ctx context.Context, id uint64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Category{}).
		Where("parent_id = ?", id).Count(&count).Error
	return count > 0, err
}

// DeleteCategory 删除分类。
func (r *Repo) DeleteCategory(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Category{}, id).Error
}

// CategoryProductCounts 统计各分类下的商品数量。
func (r *Repo) CategoryProductCounts(ctx context.Context) (map[uint64]int32, error) {
	type row struct {
		CategoryID uint64
		Count      int32
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Product{}).
		Select("category_id, COUNT(*) AS count").
		Where("status = ?", StatusOnShelf).
		Group("category_id").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint64]int32, len(rows))
	for _, rw := range rows {
		out[rw.CategoryID] = rw.Count
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 商品
// ---------------------------------------------------------------------------

// ProductQuery 描述商品查询条件。
type ProductQuery struct {
	Keyword       string
	CategoryID    uint64
	Status        int8
	MinPriceCents int64
	MaxPriceCents int64
	OnlyInStock   bool
	Tags          []string
	Sort          string
	Page          int
	PageSize      int
}

// ListProducts 分页查询商品。
func (r *Repo) ListProducts(ctx context.Context, q ProductQuery) ([]Product, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Product{})

	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("title LIKE ? OR subtitle LIKE ? OR description LIKE ?", like, like, like)
	}
	if q.CategoryID > 0 {
		// 分类包含其子分类
		tx = tx.Where("category_id = ? OR category_id IN (?)", q.CategoryID,
			r.db.WithContext(ctx).Model(&Category{}).
				Select("id").Where("parent_id = ?", q.CategoryID))
	}
	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	if q.MinPriceCents > 0 {
		tx = tx.Where("max_price_cents >= ?", q.MinPriceCents)
	}
	if q.MaxPriceCents > 0 {
		tx = tx.Where("min_price_cents <= ?", q.MaxPriceCents)
	}
	for _, tag := range q.Tags {
		if tag = strings.TrimSpace(tag); tag != "" {
			tx = tx.Where("FIND_IN_SET(?, tags)", tag)
		}
	}
	if q.OnlyInStock {
		tx = tx.Where("id IN (?)", r.db.WithContext(ctx).Model(&ProductSku{}).
			Select("product_id").Where("stock > ?", 0).Group("product_id"))
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	switch q.Sort {
	case "sales":
		tx = tx.Order("sales_count DESC, id DESC")
	case "price_asc":
		tx = tx.Order("min_price_cents ASC, id DESC")
	case "price_desc":
		tx = tx.Order("min_price_cents DESC, id DESC")
	case "newest":
		tx = tx.Order("id DESC")
	default:
		tx = tx.Order("status DESC, sales_count DESC, id DESC")
	}

	var list []Product
	err := tx.Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindProduct 按 ID 查询商品。
func (r *Repo) FindProduct(ctx context.Context, id uint64) (*Product, error) {
	var p Product
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeProductNotFound, "商品不存在或已下架")
		}
		return nil, err
	}
	return &p, nil
}

// SaveProduct 新增或更新商品主信息。
func (r *Repo) SaveProduct(ctx context.Context, p *Product) error {
	return r.db.WithContext(ctx).Save(p).Error
}

// UpdateProductFields 更新商品的指定字段。
func (r *Repo) UpdateProductFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Product{}).Where("id = ?", id).Updates(fields).Error
}

// DeleteProduct 删除商品。
func (r *Repo) DeleteProduct(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", id).Delete(&ProductSku{}).Error; err != nil {
			return err
		}
		if err := tx.Where("product_id = ?", id).Delete(&ProductImage{}).Error; err != nil {
			return err
		}
		if err := tx.Where("product_id = ?", id).Delete(&ProductAttribute{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Product{}, id).Error
	})
}

// ProductCounts 统计商品数量。
func (r *Repo) ProductCounts(ctx context.Context) (total int64, onShelf int64, err error) {
	if err = r.db.WithContext(ctx).Model(&Product{}).Count(&total).Error; err != nil {
		return
	}
	err = r.db.WithContext(ctx).Model(&Product{}).Where("status = ?", StatusOnShelf).Count(&onShelf).Error
	return
}

// ---------------------------------------------------------------------------
// SKU
// ---------------------------------------------------------------------------

// ProductSkus 查询商品的规格列表。
func (r *Repo) ProductSkus(ctx context.Context, productID uint64) ([]ProductSku, error) {
	var list []ProductSku
	err := r.db.WithContext(ctx).Where("product_id = ?", productID).
		Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// SkusByIDs 按 ID 批量查询规格。
func (r *Repo) SkusByIDs(ctx context.Context, ids []uint64) ([]ProductSku, error) {
	if len(ids) == 0 {
		return []ProductSku{}, nil
	}
	var list []ProductSku
	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}

// FindSku 按 ID 查询规格。
func (r *Repo) FindSku(ctx context.Context, id uint64) (*ProductSku, error) {
	var s ProductSku
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeSkuNotFound, "商品规格不存在")
		}
		return nil, err
	}
	return &s, nil
}

// SaveSku 新增或更新规格。
func (r *Repo) SaveSku(ctx context.Context, s *ProductSku) error {
	return r.db.WithContext(ctx).Save(s).Error
}

// DeleteSku 删除规格。
func (r *Repo) DeleteSku(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&ProductSku{}, id).Error
}

// RecalculateProductPrice 根据 SKU 重算商品价格区间。
func (r *Repo) RecalculateProductPrice(ctx context.Context, productID uint64) error {
	type agg struct {
		Min int64
		Max int64
	}
	var result agg
	err := r.db.WithContext(ctx).Model(&ProductSku{}).
		Select("COALESCE(MIN(price_cents),0) AS min, COALESCE(MAX(price_cents),0) AS max").
		Where("product_id = ? AND enabled = ?", productID, true).
		Scan(&result).Error
	if err != nil {
		return err
	}
	return r.UpdateProductFields(ctx, productID, map[string]any{
		"min_price_cents": result.Min,
		"max_price_cents": result.Max,
	})
}

// IncrementSales 增加商品销量。
func (r *Repo) IncrementSales(ctx context.Context, productID uint64, delta int) error {
	return r.db.WithContext(ctx).Model(&Product{}).Where("id = ?", productID).
		UpdateColumn("sales_count", gorm.Expr("GREATEST(sales_count + ?, 0)", delta)).Error
}

// ---------------------------------------------------------------------------
// 图集与参数
// ---------------------------------------------------------------------------

// ProductImages 查询商品图集。
func (r *Repo) ProductImages(ctx context.Context, productID uint64) ([]ProductImage, error) {
	var list []ProductImage
	err := r.db.WithContext(ctx).Where("product_id = ?", productID).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// ReplaceProductImages 覆盖式更新商品图集。
func (r *Repo) ReplaceProductImages(ctx context.Context, productID uint64, images []ProductImage) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", productID).Delete(&ProductImage{}).Error; err != nil {
			return err
		}
		if len(images) == 0 {
			return nil
		}
		for i := range images {
			images[i].ProductID = productID
		}
		return tx.Create(&images).Error
	})
}

// ProductAttributes 查询商品参数。
func (r *Repo) ProductAttributes(ctx context.Context, productID uint64) ([]ProductAttribute, error) {
	var list []ProductAttribute
	err := r.db.WithContext(ctx).Where("product_id = ?", productID).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// ReplaceProductAttributes 覆盖式更新商品参数。
func (r *Repo) ReplaceProductAttributes(ctx context.Context, productID uint64, attrs []ProductAttribute) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", productID).Delete(&ProductAttribute{}).Error; err != nil {
			return err
		}
		if len(attrs) == 0 {
			return nil
		}
		for i := range attrs {
			attrs[i].ProductID = productID
		}
		return tx.Create(&attrs).Error
	})
}

// ---------------------------------------------------------------------------
// 轮播
// ---------------------------------------------------------------------------

// ListBanners 查询轮播位。
func (r *Repo) ListBanners(ctx context.Context, position string, onlyVisible bool) ([]Banner, error) {
	q := r.db.WithContext(ctx).Model(&Banner{})
	if position != "" {
		q = q.Where("position = ?", position)
	}
	if onlyVisible {
		q = q.Where("visible = ?", true)
	}
	var list []Banner
	err := q.Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// SaveBanner 新增或更新轮播位。
func (r *Repo) SaveBanner(ctx context.Context, b *Banner) error {
	return r.db.WithContext(ctx).Save(b).Error
}

// DeleteBanner 删除轮播位。
func (r *Repo) DeleteBanner(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Banner{}, id).Error
}

// ---------------------------------------------------------------------------
// 评价
// ---------------------------------------------------------------------------

// ReviewQuery 描述评价查询条件。
type ReviewQuery struct {
	ProductID uint64
	UserID    uint64
	Status    int8
	Keyword   string
	Page      int
	PageSize  int
}

// ListReviews 分页查询评价。
func (r *Repo) ListReviews(ctx context.Context, q ReviewQuery) ([]Review, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Review{})
	if q.ProductID > 0 {
		tx = tx.Where("product_id = ?", q.ProductID)
	}
	if q.UserID > 0 {
		tx = tx.Where("user_id = ?", q.UserID)
	}
	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("content LIKE ? OR product_title LIKE ? OR user_nickname LIKE ?", like, like, like)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []Review
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindReview 按 ID 查询评价。
func (r *Repo) FindReview(ctx context.Context, id uint64) (*Review, error) {
	var rv Review
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&rv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "评价不存在")
		}
		return nil, err
	}
	return &rv, nil
}

// SaveReview 新增评价。
func (r *Repo) SaveReview(ctx context.Context, rv *Review) error {
	return r.db.WithContext(ctx).Create(rv).Error
}

// UpdateReview 更新评价。
func (r *Repo) UpdateReview(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Review{}).Where("id = ?", id).Updates(fields).Error
}

// ReviewSummary 统计评价分布。
func (r *Repo) ReviewSummary(ctx context.Context, productID uint64) (total, good, medium, bad int32, avg float64, err error) {
	type row struct {
		Rating int8
		Count  int32
	}
	var rows []row
	q := r.db.WithContext(ctx).Model(&Review{}).Where("status = ?", ReviewApproved)
	if productID > 0 {
		q = q.Where("product_id = ?", productID)
	}
	if err = q.Select("rating, COUNT(*) AS count").Group("rating").Scan(&rows).Error; err != nil {
		return
	}
	var sum int64
	for _, rw := range rows {
		total += rw.Count
		sum += int64(rw.Rating) * int64(rw.Count)
		switch {
		case rw.Rating >= 4:
			good += rw.Count
		case rw.Rating == 3:
			medium += rw.Count
		default:
			bad += rw.Count
		}
	}
	if total > 0 {
		avg = float64(sum) / float64(total)
	}
	return
}

// ProductByIDs 按 ID 批量查询商品。
func (r *Repo) ProductByIDs(ctx context.Context, ids []uint64) ([]Product, error) {
	if len(ids) == 0 {
		return []Product{}, nil
	}
	var list []Product
	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}
