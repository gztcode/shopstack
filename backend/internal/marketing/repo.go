package marketing

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Repo 封装营销域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// ---------------------------------------------------------------------------
// 优惠券
// ---------------------------------------------------------------------------

// CouponQuery 是优惠券列表的查询条件。
type CouponQuery struct {
	Keyword   string
	Type      int32
	Enabled   bool
	Available bool
	Page      int
	PageSize  int
}

// ListCoupons 分页查询优惠券。
func (r *Repo) ListCoupons(ctx context.Context, q CouponQuery) ([]Coupon, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Coupon{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("name LIKE ? OR code LIKE ?", like, like)
	}
	if q.Type > 0 {
		tx = tx.Where("type = ?", q.Type)
	}
	if q.Enabled {
		tx = tx.Where("enabled = ?", true)
	}
	if q.Available {
		now := time.Now()
		tx = tx.Where("enabled = ?", true).
			Where("start_time <= ? AND end_time >= ?", now, now).
			Where("total_quantity <= 0 OR received_quantity < total_quantity")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Coupon
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindCouponByID 按 ID 查询优惠券。
func (r *Repo) FindCouponByID(ctx context.Context, id uint64) (*Coupon, error) {
	var c Coupon
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeCouponNotFound, "优惠券不存在")
		}
		return nil, err
	}
	return &c, nil
}

// SaveCoupon 新增或更新优惠券。
func (r *Repo) SaveCoupon(ctx context.Context, c *Coupon) error {
	if c.ID == 0 {
		return r.db.WithContext(ctx).Create(c).Error
	}
	return r.db.WithContext(ctx).Model(&Coupon{}).Where("id = ?", c.ID).
		Updates(map[string]any{
			"name":               c.Name,
			"code":               c.Code,
			"type":               c.Type,
			"face_value_cents":   c.FaceValueCents,
			"percent":            c.Percent,
			"min_amount_cents":   c.MinAmountCents,
			"max_discount_cents": c.MaxDiscountCents,
			"total_quantity":     c.TotalQuantity,
			"per_user_limit":     c.PerUserLimit,
			"start_time":         c.StartTime,
			"end_time":           c.EndTime,
			"category_id":        c.CategoryID,
			"enabled":            c.Enabled,
		}).Error
}

// DeleteCoupon 删除优惠券及其发放记录（事务内完成）。
func (r *Repo) DeleteCoupon(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("coupon_id = ?", id).Delete(&UserCoupon{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Coupon{}, id).Error
	})
}

// IncrementReceived 原子增加发放数量，返回受影响的行数。
//
// 条件里带上 total_quantity 校验，保证并发下不会超发；
// 返回 0 表示券已被领完。
func (r *Repo) IncrementReceived(ctx context.Context, id uint64) (int64, error) {
	res := r.db.WithContext(ctx).Model(&Coupon{}).Where("id = ?", id).
		Where("total_quantity <= 0 OR received_quantity < total_quantity").
		UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

// ---------------------------------------------------------------------------
// 用户优惠券
// ---------------------------------------------------------------------------

// FindUserCoupon 查询用户持有的某张券。
func (r *Repo) FindUserCoupon(ctx context.Context, userID, couponID uint64) (*UserCoupon, error) {
	var uc UserCoupon
	err := r.db.WithContext(ctx).Where("user_id = ? AND coupon_id = ?", userID, couponID).First(&uc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &uc, nil
}

// CountUserCoupons 统计用户已领取指定券的数量。
func (r *Repo) CountUserCoupons(ctx context.Context, userID, couponID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&UserCoupon{}).
		Where("user_id = ? AND coupon_id = ?", userID, couponID).Count(&count).Error
	return count, err
}

// CreateUserCoupon 新增用户优惠券记录。
func (r *Repo) CreateUserCoupon(ctx context.Context, uc *UserCoupon) error {
	return r.db.WithContext(ctx).Create(uc).Error
}

// ListUserCoupons 分页查询用户优惠券。
func (r *Repo) ListUserCoupons(ctx context.Context, userID uint64, status int32, page, pageSize int) ([]UserCoupon, int64, error) {
	tx := r.db.WithContext(ctx).Model(&UserCoupon{}).Where("user_id = ?", userID)
	if status > 0 {
		tx = tx.Where("status = ?", status)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []UserCoupon
	err := tx.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ExpireUserCoupons 把已过期但仍标记为未使用的用户券置为已过期。
func (r *Repo) ExpireUserCoupons(ctx context.Context, userID uint64, now time.Time) error {
	return r.db.WithContext(ctx).Exec(
		"UPDATE user_coupons uc JOIN coupons c ON c.id = uc.coupon_id SET uc.status = ? WHERE uc.user_id = ? AND uc.status = ? AND c.end_time < ?",
		UserCouponStatusExpired, userID, UserCouponStatusUnused, now).Error
}

// CountAvailableUserCoupons 统计用户未使用且未过期的券数量。
func (r *Repo) CountAvailableUserCoupons(ctx context.Context, userID uint64, now time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&UserCoupon{}).
		Joins("JOIN coupons c ON c.id = user_coupons.coupon_id").
		Where("user_coupons.user_id = ? AND user_coupons.status = ? AND c.end_time >= ?",
			userID, UserCouponStatusUnused, now).
		Count(&count).Error
	return count, err
}

// FindUserCouponByID 按 ID 查询用户优惠券。
func (r *Repo) FindUserCouponByID(ctx context.Context, id uint64) (*UserCoupon, error) {
	var uc UserCoupon
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&uc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "用户优惠券不存在")
		}
		return nil, err
	}
	return &uc, nil
}

// MarkUserCouponUsed 核销用户优惠券并累加券的使用次数。
func (r *Repo) MarkUserCouponUsed(ctx context.Context, userID, couponID, orderID uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		res := tx.Model(&UserCoupon{}).
			Where("user_id = ? AND coupon_id = ? AND status = ?", userID, couponID, UserCouponStatusUnused).
			Updates(map[string]any{
				"status":   UserCouponStatusUsed,
				"order_id": orderID,
				"used_at":  &now,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return nil
		}
		return tx.Model(&Coupon{}).Where("id = ?", couponID).
			UpdateColumn("used_quantity", gorm.Expr("used_quantity + 1")).Error
	})
}

// ListCouponsByIDs 按 ID 批量查询优惠券。
func (r *Repo) ListCouponsByIDs(ctx context.Context, ids []uint64) (map[uint64]*Coupon, error) {
	out := make(map[uint64]*Coupon, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	var list []Coupon
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&list).Error; err != nil {
		return nil, err
	}
	for i := range list {
		out[list[i].ID] = &list[i]
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 促销活动
// ---------------------------------------------------------------------------

// PromotionQuery 是促销活动列表的查询条件。
type PromotionQuery struct {
	Keyword  string
	Type     int32
	Status   int32
	Page     int
	PageSize int
}

// ListPromotions 分页查询促销活动。
func (r *Repo) ListPromotions(ctx context.Context, q PromotionQuery) ([]Promotion, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Promotion{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("name LIKE ? OR description LIKE ?", like, like)
	}
	if q.Type > 0 {
		tx = tx.Where("type = ?", q.Type)
	}
	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Promotion
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// ListRunningPromotions 查询当前进行中的促销活动。
func (r *Repo) ListRunningPromotions(ctx context.Context, now time.Time) ([]Promotion, error) {
	var list []Promotion
	err := r.db.WithContext(ctx).Model(&Promotion{}).
		Where("status = ? AND start_time <= ? AND end_time >= ?", PromotionStatusRunning, now, now).
		Order("id DESC").Find(&list).Error
	return list, err
}

// FindPromotionByID 按 ID 查询促销活动。
func (r *Repo) FindPromotionByID(ctx context.Context, id uint64) (*Promotion, error) {
	var p Promotion
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodePromotionInvalid, "促销活动不存在")
		}
		return nil, err
	}
	return &p, nil
}

// SavePromotion 新增或更新促销活动。
func (r *Repo) SavePromotion(ctx context.Context, p *Promotion) error {
	if p.ID == 0 {
		return r.db.WithContext(ctx).Create(p).Error
	}
	return r.db.WithContext(ctx).Model(&Promotion{}).Where("id = ?", p.ID).
		Updates(map[string]any{
			"name":             p.Name,
			"description":      p.Description,
			"type":             p.Type,
			"status":           p.Status,
			"start_time":       p.StartTime,
			"end_time":         p.EndTime,
			"min_amount_cents": p.MinAmountCents,
			"discount_cents":   p.DiscountCents,
			"percent":          p.Percent,
			"product_id":       p.ProductID,
			"limit_per_user":   p.LimitPerUser,
			"banner_image":     p.BannerImage,
		}).Error
}

// DeletePromotion 删除促销活动。
func (r *Repo) DeletePromotion(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Promotion{}, id).Error
}

// ---------------------------------------------------------------------------
// 运费模板
// ---------------------------------------------------------------------------

// ListEnabledTemplates 查询启用的运费模板。
func (r *Repo) ListEnabledTemplates(ctx context.Context) ([]LogisticTemplate, error) {
	var list []LogisticTemplate
	err := r.db.WithContext(ctx).Model(&LogisticTemplate{}).
		Where("enabled = ?", true).
		Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}
