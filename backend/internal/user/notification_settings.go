package user

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// NotificationSetting 是用户通知订阅偏好模型。
type NotificationSetting struct {
	UserID          uint64    `gorm:"primaryKey;column:user_id" json:"user_id"`
	OrderNotice     bool      `gorm:"column:order_notice;not null;default:true" json:"order_notice"`
	LogisticsNotice bool      `gorm:"column:logistics_notice;not null;default:true" json:"logistics_notice"`
	MarketingNotice bool      `gorm:"column:marketing_notice;not null;default:false" json:"marketing_notice"`
	SystemNotice    bool      `gorm:"column:system_notice;not null;default:true" json:"system_notice"`
	SmsNotice       bool      `gorm:"column:sms_notice;not null;default:true" json:"sms_notice"`
	EmailNotice     bool      `gorm:"column:email_notice;not null;default:false" json:"email_notice"`
	WechatNotice    bool      `gorm:"column:wechat_notice;not null;default:false" json:"wechat_notice"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (NotificationSetting) TableName() string { return "user_notification_settings" }

// defaultNotificationSetting 返回首次访问时使用的默认通知偏好。
func defaultNotificationSetting(userID uint64) *NotificationSetting {
	return &NotificationSetting{
		UserID:          userID,
		OrderNotice:     true,
		LogisticsNotice: true,
		MarketingNotice: false,
		SystemNotice:    true,
		SmsNotice:       true,
		EmailNotice:     false,
		WechatNotice:    false,
	}
}

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// FindNotificationSetting 按用户 ID 查询通知偏好。
func (r *Repo) FindNotificationSetting(ctx context.Context, userID uint64) (*NotificationSetting, error) {
	var s NotificationSetting
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "通知设置不存在")
		}
		return nil, err
	}
	return &s, nil
}

// SaveNotificationSetting 新增或更新通知偏好。
func (r *Repo) SaveNotificationSetting(ctx context.Context, s *NotificationSetting) error {
	fields := map[string]any{
		"order_notice":     s.OrderNotice,
		"logistics_notice": s.LogisticsNotice,
		"marketing_notice": s.MarketingNotice,
		"system_notice":    s.SystemNotice,
		"sms_notice":       s.SmsNotice,
		"email_notice":     s.EmailNotice,
		"wechat_notice":    s.WechatNotice,
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&NotificationSetting{}).
			Where("user_id = ?", s.UserID).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return tx.Create(s).Error
		}
		return tx.Model(&NotificationSetting{}).
			Where("user_id = ?", s.UserID).Updates(fields).Error
	})
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetNotificationSettings 查询用户的通知订阅偏好。
//
// 用户首次查询时按默认偏好落库，保证后续更新与展示口径一致。
func (s *Service) GetNotificationSettings(ctx context.Context, userID int64) (*userv1.UserNotificationSettings, error) {
	setting, err := s.repo.FindNotificationSetting(ctx, uint64(userID))
	if err == nil {
		return notificationSettingToProto(setting), nil
	}
	if !errs.IsCode(err, errs.CodeNotFound) {
		return nil, err
	}

	setting = defaultNotificationSetting(uint64(userID))
	if err := s.repo.SaveNotificationSetting(ctx, setting); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "初始化通知设置失败", err)
	}
	return notificationSettingToProto(setting), nil
}

// UpdateNotificationSettings 更新用户的通知订阅偏好。
func (s *Service) UpdateNotificationSettings(ctx context.Context, userID int64, req *userv1.UpdateNotificationSettingsRequest) (*userv1.UserNotificationSettings, error) {
	setting := &NotificationSetting{
		UserID:          uint64(userID),
		OrderNotice:     req.GetOrderNotice(),
		LogisticsNotice: req.GetLogisticsNotice(),
		MarketingNotice: req.GetMarketingNotice(),
		SystemNotice:    req.GetSystemNotice(),
		SmsNotice:       req.GetSmsNotice(),
		EmailNotice:     req.GetEmailNotice(),
		WechatNotice:    req.GetWechatNotice(),
	}
	if err := s.repo.SaveNotificationSetting(ctx, setting); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新通知设置失败", err)
	}
	updated, err := s.repo.FindNotificationSetting(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	return notificationSettingToProto(updated), nil
}
