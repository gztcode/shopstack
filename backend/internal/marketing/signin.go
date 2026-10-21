package marketing

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 签到积分规则
const (
	// signInBasePoints 是每日签到的基础积分。
	signInBasePoints = 5
	// signInContinuousStep 是连续签到每多一天额外增加的积分。
	signInContinuousStep = 1
	// signInMaxPoints 是单次签到可获得积分的上限。
	signInMaxPoints = 20
)

// signInDateLayout 是签到日期的格式。
const signInDateLayout = "2006-01-02"

// SignInRecord 是用户签到记录模型。
type SignInRecord struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	SignDate       time.Time `gorm:"column:sign_date;type:date;not null" json:"sign_date"`
	ContinuousDays int       `gorm:"column:continuous_days;not null;default:1" json:"continuous_days"`
	PointsAwarded  int       `gorm:"column:points_awarded;not null;default:0" json:"points_awarded"`
	CreatedAt      time.Time `json:"created_at"`
}

// TableName 指定表名。
func (SignInRecord) TableName() string { return "sign_in_records" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// FindSignInRecordByDate 查询用户在指定日期的签到记录，记录不存在时返回 (nil, nil)。
func (r *Repo) FindSignInRecordByDate(ctx context.Context, userID uint64, date string) (*SignInRecord, error) {
	var rec SignInRecord
	err := r.db.WithContext(ctx).Where("user_id = ? AND sign_date = ?", userID, date).First(&rec).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rec, nil
}

// ListSignInRecords 查询用户的全部签到记录（按日期升序）。
func (r *Repo) ListSignInRecords(ctx context.Context, userID uint64) ([]SignInRecord, error) {
	var list []SignInRecord
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("sign_date ASC, id ASC").Find(&list).Error
	return list, err
}

// CreateSignInRecord 新增签到记录。
//
// tx 为 nil 时使用仓储自身的数据库句柄；传入事务句柄时与调用方的事务同生共死。
func (r *Repo) CreateSignInRecord(ctx context.Context, tx *gorm.DB, rec *SignInRecord) error {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	return tx.Create(rec).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// SignIn 每日签到。
//
// 同一天重复签到会直接返回业务错误，不会重复发放积分；
// 连续签到天数基于历史签到记录计算，断签后重新从 1 开始。
func (s *Service) SignIn(ctx context.Context, req *marketingv1.SignInRequest) (*marketingv1.GetSignInStatusResponse, error) {
	userID := uint64(resolveUserID(ctx, 0))
	if userID == 0 {
		return nil, errs.Unauthorized("请先登录后再签到")
	}

	now := time.Now()
	today := now.Format(signInDateLayout)

	existing, err := s.repo.FindSignInRecordByDate(ctx, userID, today)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到记录失败", err)
	}
	if existing != nil {
		return nil, errs.Conflict("今日已签到，请明天再来")
	}

	// 连续签到天数：昨天签到过则延续，否则重新计数
	continuousDays := 1
	yesterday := now.AddDate(0, 0, -1).Format(signInDateLayout)
	if prev, err := s.repo.FindSignInRecordByDate(ctx, userID, yesterday); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到记录失败", err)
	} else if prev != nil {
		continuousDays = prev.ContinuousDays + 1
	}

	// 读取签到配置，配置缺失时回退到内置默认值。
	cfg, cfgErr := s.repo.GetSignInConfig(ctx)
	if cfgErr != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到配置失败", cfgErr)
	}
	if !cfg.Enabled {
		return nil, errs.Invalid("签到活动已关闭")
	}

	points := signInPoints(cfg, continuousDays)
	rec := &SignInRecord{
		UserID:         userID,
		SignDate:       truncateToDate(now),
		ContinuousDays: continuousDays,
		PointsAwarded:  points,
	}

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateSignInRecord(ctx, tx, rec); err != nil {
			return err
		}
		return s.repo.AddPoints(ctx, tx, userID, points, "每日签到", PointsBizTypeSignIn, today)
	})
	if err != nil {
		if isDuplicateKey(err) {
			return nil, errs.Conflict("今日已签到，请明天再来")
		}
		var bizErr *errs.Error
		if ok := asBizError(err, &bizErr); ok {
			return nil, bizErr
		}
		return nil, errs.Wrap(errs.CodeInternalError, "签到失败", err)
	}

	return s.signInStatus(ctx, userID, now)
}

// GetSignInStatus 查询签到状态。
func (s *Service) GetSignInStatus(ctx context.Context, req *marketingv1.GetSignInStatusRequest) (*marketingv1.GetSignInStatusResponse, error) {
	userID := uint64(resolveUserID(ctx, 0))
	if userID == 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	return s.signInStatus(ctx, userID, time.Now())
}

// signInStatus 汇总用户的签到状态。
//
// continuous_days 为当前连续签到天数（今日已签到则取今日记录的连续天数，
// 否则取截至昨天的连续天数，未签到过则为 0）；
// points_awarded 为今日签到获得的积分（今日未签到为 0）；
// next_points 为下一次签到（明天）可获得的积分。
func (s *Service) signInStatus(ctx context.Context, userID uint64, now time.Time) (*marketingv1.GetSignInStatusResponse, error) {
	records, err := s.repo.ListSignInRecords(ctx, userID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到记录失败", err)
	}

	byDate := make(map[string]*SignInRecord, len(records))
	for i := range records {
		byDate[records[i].SignDate.Format(signInDateLayout)] = &records[i]
	}

	today := now.Format(signInDateLayout)
	todayRec := byDate[today]
	signedToday := todayRec != nil

	continuousDays := 0
	if todayRec != nil {
		continuousDays = todayRec.ContinuousDays
	} else if prev := byDate[now.AddDate(0, 0, -1).Format(signInDateLayout)]; prev != nil {
		continuousDays = prev.ContinuousDays
	}

	pointsAwarded := 0
	if todayRec != nil {
		pointsAwarded = todayRec.PointsAwarded
	}

	// 读取签到配置用于计算下一次签到可得积分；配置缺失时回退到内置默认值。
	cfg, cfgErr := s.repo.GetSignInConfig(ctx)
	if cfgErr != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到配置失败", cfgErr)
	}

	return &marketingv1.GetSignInStatusResponse{
		SignedToday:    signedToday,
		ContinuousDays: int32(continuousDays),
		TotalDays:      int32(len(records)),
		PointsAwarded:  int32(pointsAwarded),
		NextPoints:     int32(signInPoints(cfg, continuousDays+1)),
		Calendar:       buildSignInCalendar(now, byDate),
	}, nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// signInPoints 按连续签到天数计算本次签到可获得的积分。
// signInPoints 按配置计算第 continuousDays 天签到可获得的积分。
//
// base/step/max 来自后台「签到配置」，配置缺失时回退到内置默认值。
func signInPoints(cfg *SignInConfigModel, continuousDays int) int {
	if continuousDays <= 0 {
		continuousDays = 1
	}
	base, step, max := signInBasePoints, signInContinuousStep, signInMaxPoints
	if cfg != nil {
		if cfg.PointsAwarded > 0 {
			base = cfg.PointsAwarded
		}
		if cfg.ContinuousStep >= 0 {
			step = cfg.ContinuousStep
		}
		if cfg.MaxPoints > 0 {
			max = cfg.MaxPoints
		}
	}
	points := base + (continuousDays-1)*step
	if points > max {
		points = max
	}
	if points < 0 {
		points = 0
	}
	return points
}

// truncateToDate 截断到自然日。
func truncateToDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// buildSignInCalendar 构造当月的签到日历。
func buildSignInCalendar(now time.Time, byDate map[string]*SignInRecord) []*marketingv1.SignInCalendarDay {
	year, month := now.Year(), now.Month()
	first := time.Date(year, month, 1, 0, 0, 0, 0, now.Location())
	last := first.AddDate(0, 1, -1)

	days := last.Day()
	calendar := make([]*marketingv1.SignInCalendarDay, 0, days)
	for d := 1; d <= days; d++ {
		date := first.AddDate(0, 0, d-1).Format(signInDateLayout)
		day := &marketingv1.SignInCalendarDay{Date: date}
		if rec := byDate[date]; rec != nil {
			day.Signed = true
			day.Points = int32(rec.PointsAwarded)
		}
		calendar = append(calendar, day)
	}
	return calendar
}
