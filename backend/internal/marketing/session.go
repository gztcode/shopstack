package marketing

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 活动场次状态
const (
	SessionStatusNotStarted = 0 // 未开始
	SessionStatusRunning    = 1 // 进行中
	SessionStatusFinished   = 2 // 已结束
)

// PromotionSession 是活动场次模型（秒杀场等）。
type PromotionSession struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	PromotionID uint64    `gorm:"column:promotion_id;not null;index" json:"promotion_id"`
	Name        string    `gorm:"type:varchar(64);not null;default:''" json:"name"`
	StartTime   time.Time `gorm:"column:start_time;type:datetime;not null" json:"start_time"`
	EndTime     time.Time `gorm:"column:end_time;type:datetime;not null" json:"end_time"`
	Stock       int       `gorm:"not null;default:0" json:"stock"`
	SoldCount   int       `gorm:"column:sold_count;not null;default:0" json:"sold_count"`
	Status      int8      `gorm:"tinyint;not null;default:0" json:"status"`
}

// TableName 指定表名。
func (PromotionSession) TableName() string { return "promotion_sessions" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListPromotionSessions 分页查询活动场次。
func (r *Repo) ListPromotionSessions(ctx context.Context, promotionID uint64, page, pageSize int) ([]PromotionSession, int64, error) {
	tx := r.db.WithContext(ctx).Model(&PromotionSession{})
	if promotionID > 0 {
		tx = tx.Where("promotion_id = ?", promotionID)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []PromotionSession
	err := tx.Order("start_time ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindPromotionSessionByID 按 ID 查询活动场次。
func (r *Repo) FindPromotionSessionByID(ctx context.Context, id uint64) (*PromotionSession, error) {
	var s PromotionSession
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "活动场次不存在")
		}
		return nil, err
	}
	return &s, nil
}

// FindOverlappingSession 查询与给定时间区间重叠的场次，不存在时返回 (nil, nil)。
//
// excludeID 用于更新场景下排除自身。
func (r *Repo) FindOverlappingSession(ctx context.Context, promotionID uint64, start, end time.Time, excludeID uint64) (*PromotionSession, error) {
	var s PromotionSession
	err := r.db.WithContext(ctx).Where("promotion_id = ?", promotionID).
		Where("start_time < ? AND end_time > ?", end, start).
		Where("id <> ?", excludeID).
		Order("start_time ASC").First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// SavePromotionSession 新增或更新活动场次。
func (r *Repo) SavePromotionSession(ctx context.Context, s *PromotionSession) error {
	if s.ID == 0 {
		return r.db.WithContext(ctx).Create(s).Error
	}
	return r.db.WithContext(ctx).Model(&PromotionSession{}).Where("id = ?", s.ID).
		Updates(map[string]any{
			"promotion_id": s.PromotionID,
			"name":         s.Name,
			"start_time":   s.StartTime,
			"end_time":     s.EndTime,
			"stock":        s.Stock,
			"status":       s.Status,
		}).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListPromotionSessions 分页查询活动场次。
func (s *Service) ListPromotionSessions(ctx context.Context, req *marketingv1.ListPromotionSessionsRequest) (*marketingv1.ListPromotionSessionsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListPromotionSessions(ctx, uint64(req.GetPromotionId()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询活动场次失败", err)
	}

	now := time.Now()
	out := make([]*marketingv1.PromotionSession, 0, len(list))
	for i := range list {
		out = append(out, sessionToProto(&list[i], now))
	}
	return &marketingv1.ListPromotionSessionsResponse{Sessions: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SavePromotionSession 新增或更新活动场次。
//
// 同一活动下的场次时间区间不允许重叠，重叠时返回明确的业务错误。
func (s *Service) SavePromotionSession(ctx context.Context, req *marketingv1.SavePromotionSessionRequest) (*marketingv1.PromotionSession, error) {
	if req.GetPromotionId() <= 0 {
		return nil, errs.Invalid("活动 ID 不能为空")
	}
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("场次名称不能为空")
	}
	if req.GetStock() < 0 {
		return nil, errs.Invalid("场次库存不能为负数")
	}
	start, end, err := parseTimeRange(req.GetStartTime(), req.GetEndTime())
	if err != nil {
		return nil, err
	}

	if _, err := s.repo.FindPromotionByID(ctx, uint64(req.GetPromotionId())); err != nil {
		return nil, err
	}

	excludeID := uint64(req.GetId())
	overlap, err := s.repo.FindOverlappingSession(ctx, uint64(req.GetPromotionId()), start, end, excludeID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "校验场次时间失败", err)
	}
	if overlap != nil {
		return nil, errs.New(errs.CodePromotionInvalid,
			"场次时间与已有场次「"+overlap.Name+"」重叠")
	}

	session := &PromotionSession{
		ID:          excludeID,
		PromotionID: uint64(req.GetPromotionId()),
		Name:        name,
		StartTime:   start,
		EndTime:     end,
		Stock:       int(req.GetStock()),
	}
	if session.ID > 0 {
		existing, err := s.repo.FindPromotionSessionByID(ctx, session.ID)
		if err != nil {
			return nil, err
		}
		session.SoldCount = existing.SoldCount
		session.Status = existing.Status
	}
	if session.ID == 0 {
		session.Status = SessionStatusNotStarted
	}

	if err := s.repo.SavePromotionSession(ctx, session); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存活动场次失败", err)
	}
	saved, err := s.repo.FindPromotionSessionByID(ctx, session.ID)
	if err != nil {
		return nil, err
	}
	return sessionToProto(saved, time.Now()), nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// realSessionStatus 按当前时间推导场次的真实状态。
func realSessionStatus(s *PromotionSession, now time.Time) int {
	switch {
	case now.Before(s.StartTime):
		return SessionStatusNotStarted
	case now.After(s.EndTime):
		return SessionStatusFinished
	default:
		return SessionStatusRunning
	}
}

func sessionToProto(s *PromotionSession, now time.Time) *marketingv1.PromotionSession {
	if s == nil {
		return nil
	}
	return &marketingv1.PromotionSession{
		Id:          int64(s.ID),
		PromotionId: int64(s.PromotionID),
		Name:        s.Name,
		StartTime:   s.StartTime.Unix(),
		EndTime:     s.EndTime.Unix(),
		Stock:       int32(s.Stock),
		SoldCount:   int32(s.SoldCount),
		Status:      int32(realSessionStatus(s, now)),
	}
}
