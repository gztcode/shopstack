package notification

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Repo 封装通知域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// ---------------------------------------------------------------------------
// 站内通知
// ---------------------------------------------------------------------------

// NotificationQuery 是通知列表的查询条件。
type NotificationQuery struct {
	UserID     uint64
	Type       int32
	UnreadOnly bool
	Page       int
	PageSize   int
}

// ListNotifications 分页查询站内通知。
func (r *Repo) ListNotifications(ctx context.Context, q NotificationQuery) ([]Notification, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Notification{}).Where("user_id = ?", q.UserID)
	if q.Type > 0 {
		tx = tx.Where("type = ?", q.Type)
	}
	if q.UnreadOnly {
		// read 是 MySQL 保留字，必须反引号转义
		tx = tx.Where("`read` = ?", false)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Notification
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// CreateNotification 新增站内通知。
func (r *Repo) CreateNotification(ctx context.Context, n *Notification) error {
	return r.db.WithContext(ctx).Create(n).Error
}

// CountUnread 统计用户未读通知数。
func (r *Repo) CountUnread(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&Notification{}).
		Where("user_id = ? AND `read` = ?", userID, false).Count(&count).Error
	return count, err
}

// MarkRead 标记单条通知已读。
func (r *Repo) MarkRead(ctx context.Context, userID, id uint64) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]any{"read": true, "read_at": &now}).Error
}

// MarkAllRead 标记用户全部通知已读。
func (r *Repo) MarkAllRead(ctx context.Context, userID uint64) (int64, error) {
	now := time.Now()
	res := r.db.WithContext(ctx).Model(&Notification{}).
		Where("user_id = ? AND `read` = ?", userID, false).
		Updates(map[string]any{"read": true, "read_at": &now})
	return res.RowsAffected, res.Error
}

// FindNotificationByID 按 ID 查询通知。
func (r *Repo) FindNotificationByID(ctx context.Context, id uint64) (*Notification, error) {
	var n Notification
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&n).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "通知不存在")
		}
		return nil, err
	}
	return &n, nil
}

// ---------------------------------------------------------------------------
// 短信记录
// ---------------------------------------------------------------------------

// SmsRecordQuery 是短信记录列表的查询条件。
type SmsRecordQuery struct {
	Phone    string
	Scene    string
	Page     int
	PageSize int
}

// ListSmsRecords 分页查询短信发送记录。
func (r *Repo) ListSmsRecords(ctx context.Context, q SmsRecordQuery) ([]SmsRecord, int64, error) {
	tx := r.db.WithContext(ctx).Model(&SmsRecord{})
	if q.Phone != "" {
		tx = tx.Where("phone = ?", q.Phone)
	}
	if q.Scene != "" {
		tx = tx.Where("scene = ?", q.Scene)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []SmsRecord
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// CreateSmsRecord 新增短信发送记录。
func (r *Repo) CreateSmsRecord(ctx context.Context, rec *SmsRecord) error {
	return r.db.WithContext(ctx).Create(rec).Error
}

// CountSmsByPhoneScene 统计指定手机号与场景的发送次数。
func (r *Repo) CountSmsByPhoneScene(ctx context.Context, phone, scene string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&SmsRecord{}).
		Where("phone = ? AND scene = ?", phone, scene).Count(&count).Error
	return count, err
}

// ---------------------------------------------------------------------------
// 审计日志
// ---------------------------------------------------------------------------

// AuditLogQuery 是审计日志列表的查询条件。
type AuditLogQuery struct {
	Module    string
	Action    string
	AdminID   int64
	Keyword   string
	StartTime *time.Time
	EndTime   *time.Time
	Page      int
	PageSize  int
}

// ListAuditLogs 分页查询审计日志。
func (r *Repo) ListAuditLogs(ctx context.Context, q AuditLogQuery) ([]AuditLog, int64, error) {
	tx := r.db.WithContext(ctx).Model(&AuditLog{})
	if q.Module != "" {
		tx = tx.Where("module = ?", q.Module)
	}
	if q.Action != "" {
		tx = tx.Where("action = ?", q.Action)
	}
	if q.AdminID > 0 {
		tx = tx.Where("admin_id = ?", q.AdminID)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("admin_name LIKE ? OR target_id LIKE ? OR detail LIKE ? OR ip LIKE ?", like, like, like, like)
	}
	if q.StartTime != nil {
		tx = tx.Where("created_at >= ?", *q.StartTime)
	}
	if q.EndTime != nil {
		tx = tx.Where("created_at <= ?", *q.EndTime)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []AuditLog
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// CreateAuditLog 新增审计日志。
func (r *Repo) CreateAuditLog(ctx context.Context, log *AuditLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// ---------------------------------------------------------------------------
// 系统配置
// ---------------------------------------------------------------------------

// ListSystemSettings 查询系统配置，group 为空时返回全部。
func (r *Repo) ListSystemSettings(ctx context.Context, group string) ([]SystemSetting, error) {
	tx := r.db.WithContext(ctx).Model(&SystemSetting{})
	if group != "" {
		tx = tx.Where("`group` = ?", group)
	}
	var list []SystemSetting
	err := tx.Order("`group` ASC, id ASC").Find(&list).Error
	return list, err
}

// UpdateSystemSetting 按 key 更新配置值。
func (r *Repo) UpdateSystemSetting(ctx context.Context, key, value string) error {
	return r.db.WithContext(ctx).Model(&SystemSetting{}).
		Where("`key` = ?", key).
		Updates(map[string]any{"value": value, "updated_at": time.Now()}).Error
}
