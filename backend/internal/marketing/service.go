package marketing

import (
	"context"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// 结算试算的默认运费规则：满 9900 分（99 元）包邮，否则运费 1000 分（10 元）。
const (
	defaultFreeFreightAmountCents = 9900
	defaultFreightCents           = 1000
)

// 积分抵扣规则：100 积分抵扣 100 分（1 元），且抵扣不超过商品总额的 50%。
const pointsPerCent = 1

// Service 承载营销域的业务逻辑。
type Service struct {
	repo *Repo
}

// NewService 构造营销服务。
func NewService(repo *Repo) *Service {
	return &Service{repo: repo}
}

// ---------------------------------------------------------------------------
// 优惠券
// ---------------------------------------------------------------------------

// ListCoupons 分页查询优惠券。
func (s *Service) ListCoupons(ctx context.Context, req *marketingv1.ListCouponsRequest) (*marketingv1.ListCouponsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListCoupons(ctx, CouponQuery{
		Keyword:   strings.TrimSpace(req.GetKeyword()),
		Type:      req.GetType(),
		Enabled:   req.GetEnabled(),
		Available: req.GetAvailable(),
		Page:      page,
		PageSize:  pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券失败", err)
	}
	out := make([]*marketingv1.Coupon, 0, len(list))
	for i := range list {
		out = append(out, couponToProto(&list[i]))
	}
	return &marketingv1.ListCouponsResponse{Coupons: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveCoupon 新增或更新优惠券。
func (s *Service) SaveCoupon(ctx context.Context, req *marketingv1.SaveCouponRequest) (*marketingv1.Coupon, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "优惠券名称不能为空")
	}
	code := strings.TrimSpace(req.GetCode())
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "优惠券编码不能为空")
	}
	couponType := req.GetType()
	switch couponType {
	case CouponTypeFixed:
		if req.GetFaceValueCents() <= 0 {
			return nil, errs.New(errs.CodeInvalidParam, "满减券面额必须大于 0")
		}
	case CouponTypePercent:
		if req.GetPercent() <= 0 || req.GetPercent() >= 100 {
			return nil, errs.New(errs.CodeInvalidParam, "折扣券折扣需在 1-99 之间")
		}
	case CouponTypeShipping:
	default:
		return nil, errs.New(errs.CodeInvalidParam, "优惠券类型不合法")
	}
	if req.GetTotalQuantity() <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "发放总量必须大于 0")
	}
	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
	if err != nil {
		return nil, err
	}

	c := &Coupon{
		ID:               uint64(req.GetId()),
		Name:             name,
		Code:             code,
		Type:             int8(couponType),
		FaceValueCents:   req.GetFaceValueCents(),
		Percent:          req.GetPercent(),
		MinAmountCents:   req.GetMinAmountCents(),
		MaxDiscountCents: req.GetMaxDiscountCents(),
		TotalQuantity:    req.GetTotalQuantity(),
		PerUserLimit:     req.GetPerUserLimit(),
		StartTime:        start,
		EndTime:          end,
		CategoryID:       uint64(req.GetCategoryId()),
		Enabled:          req.GetEnabled(),
	}
	if c.PerUserLimit <= 0 {
		c.PerUserLimit = 1
	}
	if c.Type == CouponTypeShipping {
		c.Percent = 100
	}
	if c.Type == CouponTypeFixed {
		c.Percent = 100
	}

	if err := s.repo.SaveCoupon(ctx, c); err != nil {
		if isDuplicateKey(err) {
			return nil, errs.New(errs.CodeConflict, "优惠券编码已存在")
		}
		return nil, errs.Wrap(errs.CodeInternalError, "保存优惠券失败", err)
	}
	saved, err := s.repo.FindCouponByID(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	return couponToProto(saved), nil
}

// DeleteCoupon 删除优惠券及其发放记录。
func (s *Service) DeleteCoupon(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "优惠券 ID 不合法")
	}
	if _, err := s.repo.FindCouponByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteCoupon(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除优惠券失败", err)
	}
	return nil
}

// ReceiveCoupon 用户领取优惠券。
func (s *Service) ReceiveCoupon(ctx context.Context, req *marketingv1.ReceiveCouponRequest) (*marketingv1.UserCoupon, error) {
	userID := uint64(resolveUserID(ctx, req.GetUserId()))
	couponID := uint64(req.GetCouponId())
	if userID == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	if couponID == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "优惠券 ID 不能为空")
	}

	coupon, err := s.repo.FindCouponByID(ctx, couponID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if !coupon.Enabled {
		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券未启用")
	}
	if now.Before(coupon.StartTime) {
		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券尚未开始领取")
	}
	if now.After(coupon.EndTime) {
		return nil, errs.New(errs.CodeCouponExpired, "优惠券已过期")
	}
	if coupon.TotalQuantity > 0 && coupon.ReceivedQuantity >= coupon.TotalQuantity {
		return nil, errs.New(errs.CodeCouponUnavailable, "优惠券已被领完")
	}

	existing, err := s.repo.FindUserCoupon(ctx, userID, couponID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
	}
	if existing != nil {
		return nil, errs.New(errs.CodeConflict, "您已领取过该优惠券")
	}

	limit := coupon.PerUserLimit
	if limit <= 0 {
		limit = 1
	}
	count, err := s.repo.CountUserCoupons(ctx, userID, couponID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
	}
	if count >= limit {
		return nil, errs.New(errs.CodeCouponUnavailable, "已达该优惠券的每人限领数量")
	}

	uc := &UserCoupon{
		UserID:     userID,
		CouponID:   couponID,
		Status:     UserCouponStatusUnused,
		ReceivedAt: now,
	}
	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(uc).Error; err != nil {
			return err
		}
		res := tx.Model(&Coupon{}).Where("id = ?", couponID).
			Where("total_quantity <= 0 OR received_quantity < total_quantity").
			UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.New(errs.CodeCouponUnavailable, "优惠券已被领完")
		}
		return nil
	})
	if err != nil {
		if isDuplicateKey(err) {
			// 唯一键兜底：并发重复领取
			return nil, errs.New(errs.CodeConflict, "您已领取过该优惠券")
		}
		var bizErr *errs.Error
		if ok := asBizError(err, &bizErr); ok {
			return nil, bizErr
		}
		return nil, errs.Wrap(errs.CodeInternalError, "领取优惠券失败", err)
	}

	return &marketingv1.UserCoupon{
		Id:         int64(uc.ID),
		UserId:     int64(uc.UserID),
		CouponId:   int64(uc.CouponID),
		Coupon:     couponToProto(coupon),
		Status:     commonv1.UserCouponStatus_USER_COUPON_STATUS_UNUSED,
		OrderId:    0,
		ReceivedAt: timestamppb.New(uc.ReceivedAt),
	}, nil
}

// ListUserCoupons 用户优惠券列表。
func (s *Service) ListUserCoupons(ctx context.Context, req *marketingv1.ListUserCouponsRequest) (*marketingv1.ListUserCouponsResponse, error) {
	userID := uint64(resolveUserID(ctx, req.GetUserId()))
	if userID == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	page, pageSize := normalizePage(req.GetPage())
	now := time.Now()

	// 先把过期的未使用券落库为已过期，保证统计与列表一致
	if err := s.repo.ExpireUserCoupons(ctx, userID, now); err != nil {
		logger.L().Warn("更新过期优惠券失败", zap.Error(err))
	}

	list, total, err := s.repo.ListUserCoupons(ctx, userID, req.GetStatus(), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
	}
	coupons, err := s.couponMap(ctx, list)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券详情失败", err)
	}

	out := make([]*marketingv1.UserCoupon, 0, len(list))
	for i := range list {
		out = append(out, userCouponToProto(&list[i], coupons[list[i].CouponID]))
	}

	available, err := s.repo.CountAvailableUserCoupons(ctx, userID, now)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计可用优惠券失败", err)
	}

	return &marketingv1.ListUserCouponsResponse{
		Coupons:        out,
		Meta:           buildMeta(page, pageSize, total),
		AvailableCount: int32(available),
	}, nil
}

// ---------------------------------------------------------------------------
// 促销活动
// ---------------------------------------------------------------------------

// ListPromotions 分页查询促销活动。
func (s *Service) ListPromotions(ctx context.Context, req *marketingv1.ListPromotionsRequest) (*marketingv1.ListPromotionsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListPromotions(ctx, PromotionQuery{
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		Type:     req.GetType(),
		Status:   req.GetStatus(),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询促销活动失败", err)
	}
	now := time.Now()
	out := make([]*marketingv1.Promotion, 0, len(list))
	for i := range list {
		out = append(out, promotionToProto(&list[i], now))
	}
	return &marketingv1.ListPromotionsResponse{Promotions: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SavePromotion 新增或更新促销活动。
func (s *Service) SavePromotion(ctx context.Context, req *marketingv1.SavePromotionRequest) (*marketingv1.Promotion, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.New(errs.CodePromotionInvalid, "活动名称不能为空")
	}
	promoType := req.GetType()
	if promoType < PromotionTypeFullReduction || promoType > PromotionTypeGroupBuy {
		return nil, errs.New(errs.CodePromotionInvalid, "活动类型不合法")
	}
	status := req.GetStatus()
	if status < PromotionStatusNotStarted || status > PromotionStatusOffline {
		return nil, errs.New(errs.CodePromotionInvalid, "活动状态不合法")
	}
	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
	if err != nil {
		return nil, errs.New(errs.CodePromotionInvalid, err.Error())
	}

	p := &Promotion{
		ID:             uint64(req.GetId()),
		Name:           name,
		Description:    req.GetDescription(),
		Type:           int8(promoType),
		Status:         int8(status),
		StartTime:      start,
		EndTime:        end,
		MinAmountCents: req.GetMinAmountCents(),
		DiscountCents:  req.GetDiscountCents(),
		Percent:        req.GetPercent(),
		ProductID:      uint64(req.GetProductId()),
		LimitPerUser:   req.GetLimitPerUser(),
		BannerImage:    req.GetBannerImage(),
	}
	if p.Percent <= 0 {
		p.Percent = 100
	}

	if err := s.repo.SavePromotion(ctx, p); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存促销活动失败", err)
	}
	saved, err := s.repo.FindPromotionByID(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return promotionToProto(saved, time.Now()), nil
}

// DeletePromotion 删除促销活动。
func (s *Service) DeletePromotion(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "活动 ID 不合法")
	}
	if _, err := s.repo.FindPromotionByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeletePromotion(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除促销活动失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 结算试算
// ---------------------------------------------------------------------------

// PreviewCheckout 结算试算：计算可用券、优惠与最终应付金额。
func (s *Service) PreviewCheckout(ctx context.Context, req *marketingv1.PreviewCheckoutRequest) (*marketingv1.PreviewCheckoutResponse, error) {
	items := req.GetItems()
	if len(items) == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "结算商品不能为空")
	}

	var totalAmount int64
	for _, item := range items {
		if item.GetQuantity() <= 0 {
			continue
		}
		if item.GetPriceCents() < 0 {
			return nil, errs.New(errs.CodeInvalidParam, "商品价格不合法")
		}
		totalAmount += item.GetPriceCents() * int64(item.GetQuantity())
	}
	if totalAmount <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "商品总额必须大于 0")
	}

	now := time.Now()

	// 运费
	freight, err := s.calcFreight(ctx, totalAmount)
	if err != nil {
		return nil, err
	}

	// 优惠券抵扣
	couponDiscount, freeShipping, err := s.calcCoupon(ctx, uint64(resolveUserID(ctx, req.GetUserId())), uint64(req.GetCouponId()), totalAmount, now)
	if err != nil {
		return nil, err
	}
	if freeShipping {
		freight = 0
	}

	// 积分抵扣：100 积分 = 100 分（1 元），且不超过商品总额的 50%
	pointsDiscount := req.GetPointsUsed() * pointsPerCent
	if pointsDiscount < 0 {
		pointsDiscount = 0
	}
	if maxPoints := totalAmount / 2; pointsDiscount > maxPoints {
		pointsDiscount = maxPoints
	}
	if pointsDiscount > totalAmount {
		pointsDiscount = totalAmount
	}

	payable := totalAmount - couponDiscount - pointsDiscount + freight
	if payable < 0 {
		payable = 0
	}

	availableCoupons, err := s.availableUserCoupons(ctx, uint64(resolveUserID(ctx, req.GetUserId())), now)
	if err != nil {
		return nil, err
	}
	promotions, err := s.repo.ListRunningPromotions(ctx, now)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询进行中的活动失败", err)
	}
	activePromotions := make([]*marketingv1.Promotion, 0, len(promotions))
	for i := range promotions {
		activePromotions = append(activePromotions, promotionToProto(&promotions[i], now))
	}

	return &marketingv1.PreviewCheckoutResponse{
		TotalAmountCents:    totalAmount,
		DiscountCents:       couponDiscount + pointsDiscount,
		CouponDiscountCents: couponDiscount,
		PointsDiscountCents: pointsDiscount,
		FreightCents:        freight,
		PayableCents:        payable,
		AvailableCoupons:    availableCoupons,
		ActivePromotions:    activePromotions,
	}, nil
}

// calcFreight 计算运费。
//
// 规则：
//  1. 有启用的运费模板时，按 sort 升序取第一个"适用"的模板：
//     模板门槛取 free_freight_amount_cents，为 0 表示全场适用；
//     门槛大于 0 且商品总额达到门槛时该模板免运费，否则按模板的 freight_cents 计费。
//  2. 没有启用的运费模板时使用默认规则：满 9900 分包邮，否则运费 1000 分。
func (s *Service) calcFreight(ctx context.Context, totalAmount int64) (int64, error) {
	templates, err := s.repo.ListEnabledTemplates(ctx)
	if err != nil {
		return 0, errs.Wrap(errs.CodeInternalError, "查询运费模板失败", err)
	}
	for i := range templates {
		tpl := templates[i]
		if tpl.FreeFreightAmountCents > 0 {
			if totalAmount < tpl.FreeFreightAmountCents {
				continue
			}
			return 0, nil
		}
		return tpl.FreightCents, nil
	}
	if totalAmount >= defaultFreeFreightAmountCents {
		return 0, nil
	}
	return defaultFreightCents, nil
}

// calcCoupon 计算优惠券抵扣。
//
// 返回抵扣金额与是否免运费；免运费券的抵扣体现在运费上，抵扣金额记为 0。
func (s *Service) calcCoupon(ctx context.Context, userID, couponID uint64, totalAmount int64, now time.Time) (int64, bool, error) {
	if userID == 0 || couponID == 0 {
		return 0, false, nil
	}
	uc, err := s.repo.FindUserCoupon(ctx, userID, couponID)
	if err != nil {
		return 0, false, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
	}
	if uc == nil {
		return 0, false, errs.New(errs.CodeCouponUnavailable, "该优惠券不属于当前用户")
	}
	if uc.Status != UserCouponStatusUnused {
		return 0, false, errs.New(errs.CodeCouponUnavailable, "该优惠券已使用")
	}
	coupon, err := s.repo.FindCouponByID(ctx, couponID)
	if err != nil {
		return 0, false, err
	}
	if now.After(coupon.EndTime) {
		return 0, false, errs.New(errs.CodeCouponExpired, "该优惠券已过期")
	}
	if totalAmount < coupon.MinAmountCents {
		return 0, false, errs.New(errs.CodeCouponUnavailable, "未达到该优惠券的使用门槛")
	}

	switch coupon.Type {
	case CouponTypeFixed:
		discount := coupon.FaceValueCents
		if discount > totalAmount {
			discount = totalAmount
		}
		return discount, false, nil
	case CouponTypePercent:
		discount := totalAmount - totalAmount*int64(coupon.Percent)/100
		if coupon.MaxDiscountCents > 0 && discount > coupon.MaxDiscountCents {
			discount = coupon.MaxDiscountCents
		}
		if discount > totalAmount {
			discount = totalAmount
		}
		return discount, false, nil
	case CouponTypeShipping:
		return 0, true, nil
	default:
		return 0, false, errs.New(errs.CodeCouponUnavailable, "优惠券类型不支持")
	}
}

// availableUserCoupons 返回用户当前可用的优惠券（未使用且未过期）。
func (s *Service) availableUserCoupons(ctx context.Context, userID uint64, now time.Time) ([]*marketingv1.UserCoupon, error) {
	if userID == 0 {
		return []*marketingv1.UserCoupon{}, nil
	}
	list, _, err := s.repo.ListUserCoupons(ctx, userID, UserCouponStatusUnused, 1, 100)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户优惠券失败", err)
	}
	coupons, err := s.couponMap(ctx, list)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询优惠券详情失败", err)
	}
	out := make([]*marketingv1.UserCoupon, 0, len(list))
	for i := range list {
		coupon := coupons[list[i].CouponID]
		if coupon == nil || now.After(coupon.EndTime) {
			continue
		}
		out = append(out, userCouponToProto(&list[i], coupon))
	}
	return out, nil
}

// couponMap 批量加载券详情。
func (s *Service) couponMap(ctx context.Context, list []UserCoupon) (map[uint64]*Coupon, error) {
	ids := make([]uint64, 0, len(list))
	for i := range list {
		ids = append(ids, list[i].CouponID)
	}
	return s.repo.ListCouponsByIDs(ctx, ids)
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func couponToProto(c *Coupon) *marketingv1.Coupon {
	if c == nil {
		return nil
	}
	return &marketingv1.Coupon{
		Id:               int64(c.ID),
		Name:             c.Name,
		Code:             c.Code,
		Type:             commonv1.CouponType(c.Type),
		FaceValueCents:   c.FaceValueCents,
		Percent:          c.Percent,
		MinAmountCents:   c.MinAmountCents,
		MaxDiscountCents: c.MaxDiscountCents,
		TotalQuantity:    c.TotalQuantity,
		ReceivedQuantity: c.ReceivedQuantity,
		UsedQuantity:     c.UsedQuantity,
		PerUserLimit:     c.PerUserLimit,
		StartTime:        c.StartTime.Unix(),
		EndTime:          c.EndTime.Unix(),
		CategoryId:       int64(c.CategoryID),
		Enabled:          c.Enabled,
		CreatedAt:        timestamppb.New(c.CreatedAt),
	}
}

func userCouponToProto(uc *UserCoupon, coupon *Coupon) *marketingv1.UserCoupon {
	if uc == nil {
		return nil
	}
	out := &marketingv1.UserCoupon{
		Id:         int64(uc.ID),
		UserId:     int64(uc.UserID),
		CouponId:   int64(uc.CouponID),
		Coupon:     couponToProto(coupon),
		Status:     commonv1.UserCouponStatus(uc.Status),
		OrderId:    int64(uc.OrderID),
		ReceivedAt: timestamppb.New(uc.ReceivedAt),
	}
	if uc.UsedAt != nil {
		out.UsedAt = timestamppb.New(*uc.UsedAt)
	}
	return out
}

func promotionToProto(p *Promotion, now time.Time) *marketingv1.Promotion {
	if p == nil {
		return nil
	}
	return &marketingv1.Promotion{
		Id:             int64(p.ID),
		Name:           p.Name,
		Description:    p.Description,
		Type:           int32(p.Type),
		Status:         int32(realPromotionStatus(p, now)),
		StartTime:      p.StartTime.Unix(),
		EndTime:        p.EndTime.Unix(),
		MinAmountCents: p.MinAmountCents,
		DiscountCents:  p.DiscountCents,
		Percent:        p.Percent,
		ProductId:      int64(p.ProductID),
		LimitPerUser:   p.LimitPerUser,
		SoldCount:      p.SoldCount,
		BannerImage:    p.BannerImage,
		CreatedAt:      timestamppb.New(p.CreatedAt),
	}
}

// realPromotionStatus 按当前时间推导活动的真实状态。
//
// 已下线的活动保持下线状态，其余按时间区间推导为未开始/进行中/已结束。
func realPromotionStatus(p *Promotion, now time.Time) int {
	if p.Status == PromotionStatusOffline {
		return PromotionStatusOffline
	}
	switch {
	case now.Before(p.StartTime):
		return PromotionStatusNotStarted
	case now.After(p.EndTime):
		return PromotionStatusFinished
	default:
		return PromotionStatusRunning
	}
}

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

func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page: int32(page), PageSize: int32(pageSize),
		Total: total, TotalPages: int32(totalPages),
	}
}

// parseTimeRange 解析 Unix 秒时间戳区间。
func parseTimeRange(start, end int64) (time.Time, time.Time, error) {
	if start <= 0 || end <= 0 {
		return time.Time{}, time.Time{}, errs.New(errs.CodeInvalidParam, "活动时间不能为空")
	}
	if start >= end {
		return time.Time{}, time.Time{}, errs.New(errs.CodeInvalidParam, "活动开始时间必须早于结束时间")
	}
	return time.Unix(start, 0), time.Unix(end, 0), nil
}
