package marketing

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/shopstack/platform/backend/internal/errs"
)

// SignInConfigModel 是签到活动配置模型。
//
// 该表为单行表，id 固定为 1：后台「签到配置」页维护的是全局规则，
// 不是每个用户一份。
type SignInConfigModel struct {
	ID uint64 `gorm:"primaryKey;autoIncrement:false" json:"id"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled              bool      `gorm:"column:enabled;not null" json:"enabled"`
	PointsAwarded        int       `gorm:"column:points_awarded;not null;default:5" json:"points_awarded"`
	ContinuousStep       int       `gorm:"column:continuous_step;not null;default:1" json:"continuous_step"`
	MaxPoints            int       `gorm:"column:max_points;not null;default:20" json:"max_points"`
	ContinuousDaysNeeded int       `gorm:"column:continuous_days_required;not null;default:7" json:"continuous_days_required"`
	CalendarDays         int       `gorm:"column:calendar_days;not null;default:7" json:"calendar_days"`
	Description          string    `gorm:"column:description;not null;default:''" json:"description"`
	UpdatedAt            time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName 指定表名。
func (SignInConfigModel) TableName() string { return "sign_in_configs" }

// signInConfigID 是单行配置表的主键。
const signInConfigID = 1

// 默认配置：配置行缺失时使用，保证功能在未灌种子时仍可运行。
func defaultSignInConfig() *SignInConfigModel {
	return &SignInConfigModel{
		ID:                   signInConfigID,
		Enabled:              true,
		PointsAwarded:        signInBasePoints,
		ContinuousStep:       signInContinuousStep,
		MaxPoints:            signInMaxPoints,
		ContinuousDaysNeeded: 7,
		CalendarDays:         7,
		Description:          "每日签到得基础积分，连续签到每多一天额外增加积分。",
	}
}

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// GetSignInConfig 读取签到配置；配置行不存在时返回默认配置。
func (r *Repo) GetSignInConfig(ctx context.Context) (*SignInConfigModel, error) {
	var cfg SignInConfigModel
	err := r.db.WithContext(ctx).Where("id = ?", signInConfigID).First(&cfg).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return defaultSignInConfig(), nil
		}
		return nil, err
	}
	return &cfg, nil
}

// SaveSignInConfig 覆盖写入签到配置。
func (r *Repo) SaveSignInConfig(ctx context.Context, cfg *SignInConfigModel) error {
	cfg.ID = signInConfigID
	return r.db.WithContext(ctx).Save(cfg).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetSignInConfig 查询签到配置。
func (s *Service) GetSignInConfig(ctx context.Context, _ *marketingv1.GetSignInConfigRequest) (*marketingv1.SignInConfig, error) {
	cfg, err := s.repo.GetSignInConfig(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询签到配置失败", err)
	}
	return signInConfigToProto(cfg), nil
}

// SaveSignInConfig 保存签到配置。
func (s *Service) SaveSignInConfig(ctx context.Context, req *marketingv1.SaveSignInConfigRequest) (*marketingv1.SignInConfig, error) {
	if req.GetPointsAwarded() < 0 {
		return nil, errs.Invalid("每日签到积分不能为负数")
	}
	if req.GetMaxPoints() > 0 && req.GetMaxPoints() < req.GetPointsAwarded() {
		return nil, errs.Invalid("单次签到积分上限不能小于每日基础积分")
	}
	if req.GetContinuousStep() < 0 {
		return nil, errs.Invalid("连续签到额外积分不能为负数")
	}
	if req.GetContinuousDaysRequired() < 0 {
		return nil, errs.Invalid("连续签到要求天数不能为负数")
	}
	if req.GetCalendarDays() <= 0 {
		return nil, errs.Invalid("签到日历天数必须大于 0")
	}

	cfg := &SignInConfigModel{
		ID:                   signInConfigID,
		Enabled:              req.GetEnabled(),
		PointsAwarded:        int(req.GetPointsAwarded()),
		ContinuousStep:       int(req.GetContinuousStep()),
		MaxPoints:            int(req.GetMaxPoints()),
		ContinuousDaysNeeded: int(req.GetContinuousDaysRequired()),
		CalendarDays:         int(req.GetCalendarDays()),
		Description:          req.GetDescription(),
	}
	if err := s.repo.SaveSignInConfig(ctx, cfg); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存签到配置失败", err)
	}
	return signInConfigToProto(cfg), nil
}

// signInConfigToProto 把配置模型转成 proto 消息。
func signInConfigToProto(cfg *SignInConfigModel) *marketingv1.SignInConfig {
	return &marketingv1.SignInConfig{
		Enabled:                cfg.Enabled,
		PointsAwarded:          int32(cfg.PointsAwarded),
		ContinuousStep:         int32(cfg.ContinuousStep),
		MaxPoints:              int32(cfg.MaxPoints),
		ContinuousDaysRequired: int32(cfg.ContinuousDaysNeeded),
		CalendarDays:           int32(cfg.CalendarDays),
		Description:            cfg.Description,
		UpdatedAt:              timestamppb.New(cfg.UpdatedAt),
	}
}
