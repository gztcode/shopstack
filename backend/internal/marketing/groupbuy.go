package marketing

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 拼团活动状态
const (
	GroupBuyStatusNotStarted = 0 // 未开始
	GroupBuyStatusRunning    = 1 // 进行中
	GroupBuyStatusFinished   = 2 // 已结束
	GroupBuyStatusOffline    = 3 // 已下线
)

// defaultGroupSize 是新建拼团活动时的默认人数上限。
const defaultGroupSize = 20

// GroupBuy 是拼团活动模型。
type GroupBuy struct {
	ID                 uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name               string    `gorm:"type:varchar(128);not null;default:''" json:"name"`
	Description        string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	PromotionID        uint64    `gorm:"column:promotion_id;not null;default:0" json:"promotion_id"`
	ProductID          uint64    `gorm:"column:product_id;not null;default:0" json:"product_id"`
	ProductTitle       string    `gorm:"column:product_title;type:varchar(255);not null;default:''" json:"product_title"`
	ProductImage       string    `gorm:"column:product_image;type:varchar(512);not null;default:''" json:"product_image"`
	PriceCents         int64     `gorm:"column:price_cents;not null;default:0" json:"price_cents"`
	OriginalPriceCents int64     `gorm:"column:original_price_cents;not null;default:0" json:"original_price_cents"`
	RequiredMembers    int       `gorm:"column:required_members;not null;default:3" json:"required_members"`
	JoinedMembers      int       `gorm:"column:joined_members;not null;default:0" json:"joined_members"`
	GroupSize          int       `gorm:"column:group_size;not null;default:20" json:"group_size"`
	Status             int8      `gorm:"tinyint;not null;default:0;index" json:"status"`
	StartTime          time.Time `gorm:"column:start_time;type:datetime;not null" json:"start_time"`
	EndTime            time.Time `gorm:"column:end_time;type:datetime;not null" json:"end_time"`
	BannerImage        string    `gorm:"column:banner_image;type:varchar(512);not null;default:''" json:"banner_image"`
	CreatedAt          time.Time `json:"created_at"`
}

// TableName 指定表名。
func (GroupBuy) TableName() string { return "group_buys" }

// GroupBuyMember 是拼团成员模型。
type GroupBuyMember struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	GroupBuyID   uint64    `gorm:"column:group_buy_id;not null;index" json:"group_buy_id"`
	UserID       uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	UserNickname string    `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	JoinedAt     time.Time `json:"joined_at"`
}

// TableName 指定表名。
func (GroupBuyMember) TableName() string { return "group_buy_members" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// GroupBuyQuery 是拼团活动列表的查询条件。
type GroupBuyQuery struct {
	Keyword  string
	Status   int32
	Page     int
	PageSize int
}

// ListGroupBuys 分页查询拼团活动。
//
// status 为 0 表示不筛选；指定状态时按活动的真实状态过滤：
// 进行中/已结束由活动时间区间推导，只有已下线的活动按落库状态判断。
func (r *Repo) ListGroupBuys(ctx context.Context, q GroupBuyQuery) ([]GroupBuy, int64, error) {
	tx := r.db.WithContext(ctx).Model(&GroupBuy{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("name LIKE ? OR description LIKE ? OR product_title LIKE ?", like, like, like)
	}
	now := time.Now()
	switch q.Status {
	case GroupBuyStatusRunning:
		tx = tx.Where("status <> ? AND start_time <= ? AND end_time >= ?", GroupBuyStatusOffline, now, now)
	case GroupBuyStatusFinished:
		tx = tx.Where("status <> ? AND end_time < ?", GroupBuyStatusOffline, now)
	case GroupBuyStatusOffline:
		tx = tx.Where("status = ?", GroupBuyStatusOffline)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []GroupBuy
	err := tx.Order("start_time DESC, id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindGroupBuyByID 按 ID 查询拼团活动。
func (r *Repo) FindGroupBuyByID(ctx context.Context, id uint64) (*GroupBuy, error) {
	var g GroupBuy
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "拼团活动不存在")
		}
		return nil, err
	}
	return &g, nil
}

// SaveGroupBuy 新增或更新拼团活动。
func (r *Repo) SaveGroupBuy(ctx context.Context, g *GroupBuy) error {
	if g.ID == 0 {
		return r.db.WithContext(ctx).Create(g).Error
	}
	return r.db.WithContext(ctx).Model(&GroupBuy{}).Where("id = ?", g.ID).
		Updates(map[string]any{
			"name":                 g.Name,
			"description":          g.Description,
			"promotion_id":         g.PromotionID,
			"product_id":           g.ProductID,
			"product_title":        g.ProductTitle,
			"product_image":        g.ProductImage,
			"price_cents":          g.PriceCents,
			"original_price_cents": g.OriginalPriceCents,
			"required_members":     g.RequiredMembers,
			"group_size":           g.GroupSize,
			"status":               g.Status,
			"start_time":           g.StartTime,
			"end_time":             g.EndTime,
			"banner_image":         g.BannerImage,
		}).Error
}

// ListGroupBuyMembers 查询拼团成员列表。
func (r *Repo) ListGroupBuyMembers(ctx context.Context, groupBuyID uint64) ([]GroupBuyMember, error) {
	var list []GroupBuyMember
	err := r.db.WithContext(ctx).Where("group_buy_id = ?", groupBuyID).
		Order("joined_at ASC, id ASC").Find(&list).Error
	return list, err
}

// FindGroupBuyMember 查询用户是否已参与该拼团，不存在时返回 (nil, nil)。
func (r *Repo) FindGroupBuyMember(ctx context.Context, groupBuyID, userID uint64) (*GroupBuyMember, error) {
	var m GroupBuyMember
	err := r.db.WithContext(ctx).Where("group_buy_id = ? AND user_id = ?", groupBuyID, userID).First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// CreateGroupBuyMember 新增拼团成员。
//
// tx 为 nil 时使用仓储自身的数据库句柄；传入事务句柄时与调用方的事务同生共死。
func (r *Repo) CreateGroupBuyMember(ctx context.Context, tx *gorm.DB, m *GroupBuyMember) error {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	return tx.Create(m).Error
}

// IncrementJoinedMembers 原子累加拼团人数，返回受影响的行数。
//
// 条件里带上 group_size 上限校验，保证并发下不会超过团的人数上限；
// 返回 0 表示该团已满。
func (r *Repo) IncrementJoinedMembers(ctx context.Context, tx *gorm.DB, id uint64) (int64, error) {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	res := tx.Model(&GroupBuy{}).Where("id = ? AND joined_members < group_size", id).
		UpdateColumn("joined_members", gorm.Expr("joined_members + 1"))
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListGroupBuys 分页查询拼团活动。
func (s *Service) ListGroupBuys(ctx context.Context, req *marketingv1.ListGroupBuysRequest) (*marketingv1.ListGroupBuysResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListGroupBuys(ctx, GroupBuyQuery{
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		Status:   req.GetStatus(),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询拼团活动失败", err)
	}

	now := time.Now()
	out := make([]*marketingv1.GroupBuy, 0, len(list))
	for i := range list {
		out = append(out, groupBuyToProto(&list[i], now))
	}
	return &marketingv1.ListGroupBuysResponse{GroupBuys: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// GetGroupBuy 查询拼团活动详情与成员列表。
func (s *Service) GetGroupBuy(ctx context.Context, req *marketingv1.GetGroupBuyRequest) (*marketingv1.GetGroupBuyResponse, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("拼团活动 ID 不能为空")
	}
	g, err := s.repo.FindGroupBuyByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}
	members, err := s.repo.ListGroupBuyMembers(ctx, g.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询拼团成员失败", err)
	}

	out := make([]*marketingv1.GroupBuyMember, 0, len(members))
	for i := range members {
		out = append(out, &marketingv1.GroupBuyMember{
			Id:           int64(members[i].ID),
			GroupBuyId:   int64(members[i].GroupBuyID),
			UserId:       int64(members[i].UserID),
			UserNickname: members[i].UserNickname,
			JoinedAt:     timestamppb.New(members[i].JoinedAt),
		})
	}
	return &marketingv1.GetGroupBuyResponse{
		GroupBuy: groupBuyToProto(g, time.Now()),
		Members:  out,
	}, nil
}

// JoinGroupBuy 用户参与拼团。
//
// 校验活动时间窗口、团的人数上限与重复参与；参团成功会累加团的人数，
// 人数达到成团要求即视为成团（joined_members >= required_members）。
func (s *Service) JoinGroupBuy(ctx context.Context, req *marketingv1.JoinGroupBuyRequest) (*marketingv1.GroupBuy, error) {
	userID := uint64(resolveUserID(ctx, 0))
	if userID == 0 {
		return nil, errs.Unauthorized("请先登录后再参团")
	}
	if req.GetId() <= 0 {
		return nil, errs.Invalid("拼团活动 ID 不能为空")
	}

	g, err := s.repo.FindGroupBuyByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if g.Status == GroupBuyStatusOffline {
		return nil, errs.Conflict("拼团活动已下线")
	}
	if now.Before(g.StartTime) {
		return nil, errs.Conflict("拼团活动尚未开始")
	}
	if now.After(g.EndTime) {
		return nil, errs.Conflict("拼团活动已结束")
	}

	quantity := int(req.GetQuantity())
	if quantity <= 0 {
		quantity = 1
	}
	if quantity > g.GroupSize {
		return nil, errs.Invalid("购买数量超过该团的人数上限")
	}

	member, err := s.repo.FindGroupBuyMember(ctx, g.ID, userID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询参团记录失败", err)
	}
	if member != nil {
		return nil, errs.Conflict("您已参与该拼团")
	}

	nickname, err := s.repo.FindUserNickname(ctx, userID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户信息失败", err)
	}

	newMember := &GroupBuyMember{
		GroupBuyID:   g.ID,
		UserID:       userID,
		UserNickname: nickname,
		JoinedAt:     now,
	}

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 先占名额再落成员记录：人数上限由数据库条件保证，避免并发超员。
		rows, err := s.repo.IncrementJoinedMembers(ctx, tx, g.ID)
		if err != nil {
			return err
		}
		if rows == 0 {
			return errs.New(errs.CodeConflict, "该拼团已满，无法参与")
		}
		return s.repo.CreateGroupBuyMember(ctx, tx, newMember)
	})
	if err != nil {
		var bizErr *errs.Error
		if ok := asBizError(err, &bizErr); ok {
			return nil, bizErr
		}
		return nil, errs.Wrap(errs.CodeInternalError, "参与拼团失败", err)
	}

	updated, err := s.repo.FindGroupBuyByID(ctx, g.ID)
	if err != nil {
		return nil, err
	}
	return groupBuyToProto(updated, now), nil
}

// SaveGroupBuy 新增或更新拼团活动。
func (s *Service) SaveGroupBuy(ctx context.Context, req *marketingv1.SaveGroupBuyRequest) (*marketingv1.GroupBuy, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("拼团活动名称不能为空")
	}
	if req.GetPriceCents() <= 0 {
		return nil, errs.Invalid("拼团价格必须大于 0")
	}
	if req.GetRequiredMembers() <= 0 {
		return nil, errs.Invalid("成团人数必须大于 0")
	}
	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
	if err != nil {
		return nil, err
	}

	g := &GroupBuy{
		ID:              uint64(req.GetId()),
		Name:            name,
		Description:     req.GetDescription(),
		PromotionID:     uint64(req.GetPromotionId()),
		ProductID:       uint64(req.GetProductId()),
		PriceCents:      req.GetPriceCents(),
		RequiredMembers: int(req.GetRequiredMembers()),
		StartTime:       start,
		EndTime:         end,
		BannerImage:     req.GetBannerImage(),
	}
	if g.ProductID > 0 {
		product, pErr := s.repo.FindProductSummary(ctx, g.ProductID)
		if pErr != nil {
			return nil, pErr
		}
		g.ProductTitle = product.Title
		g.ProductImage = product.Cover
		g.OriginalPriceCents = product.MaxPriceCents
		if g.OriginalPriceCents == 0 {
			g.OriginalPriceCents = product.MinPriceCents
		}
	}

	if g.ID == 0 {
		g.GroupSize = defaultGroupSize
		g.Status = GroupBuyStatusNotStarted
	} else {
		existing, err := s.repo.FindGroupBuyByID(ctx, g.ID)
		if err != nil {
			return nil, err
		}
		g.GroupSize = existing.GroupSize
		g.Status = existing.Status
	}

	if err := s.repo.SaveGroupBuy(ctx, g); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存拼团活动失败", err)
	}
	saved, err := s.repo.FindGroupBuyByID(ctx, g.ID)
	if err != nil {
		return nil, err
	}
	return groupBuyToProto(saved, time.Now()), nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// realGroupBuyStatus 按当前时间推导拼团活动的真实状态。
func realGroupBuyStatus(g *GroupBuy, now time.Time) int {
	if g.Status == GroupBuyStatusOffline {
		return GroupBuyStatusOffline
	}
	switch {
	case now.Before(g.StartTime):
		return GroupBuyStatusNotStarted
	case now.After(g.EndTime):
		return GroupBuyStatusFinished
	default:
		return GroupBuyStatusRunning
	}
}

func groupBuyToProto(g *GroupBuy, now time.Time) *marketingv1.GroupBuy {
	if g == nil {
		return nil
	}
	return &marketingv1.GroupBuy{
		Id:                 int64(g.ID),
		Name:               g.Name,
		Description:        g.Description,
		PromotionId:        int64(g.PromotionID),
		ProductId:          int64(g.ProductID),
		ProductTitle:       g.ProductTitle,
		ProductImage:       g.ProductImage,
		PriceCents:         g.PriceCents,
		OriginalPriceCents: g.OriginalPriceCents,
		RequiredMembers:    int32(g.RequiredMembers),
		JoinedMembers:      int32(g.JoinedMembers),
		GroupSize:          int32(g.GroupSize),
		Status:             int32(realGroupBuyStatus(g, now)),
		StartTime:          g.StartTime.Unix(),
		EndTime:            g.EndTime.Unix(),
		BannerImage:        g.BannerImage,
	}
}
