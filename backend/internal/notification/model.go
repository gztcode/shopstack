// Package notification 实现站内通知、短信验证码与操作审计日志相关的业务能力。
package notification

import (
	"time"
)

// 站内通知类型
const (
	NotificationTypeOrder     = 1 // 订单
	NotificationTypeLogistics = 2 // 物流
	NotificationTypePromotion = 3 // 营销
	NotificationTypeSystem    = 4 // 系统
)

// 短信发送状态
const (
	SmsStatusFailed  = 0
	SmsStatusSuccess = 1
)

// Notification 是站内通知模型。
type Notification struct {
	ID        uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64     `gorm:"bigint unsigned;not null;index:idx_user_read,priority:1" json:"user_id"`
	Type      int8       `gorm:"tinyint;not null;default:1" json:"type"`
	Title     string     `gorm:"type:varchar(200);not null;default:''" json:"title"`
	Content   string     `gorm:"type:varchar(1024);not null;default:''" json:"content"`
	Link      string     `gorm:"type:varchar(512);not null;default:''" json:"link"`
	BizID     uint64     `gorm:"bigint unsigned;not null;default:0" json:"biz_id"`
	Read      bool       `gorm:"tinyint;not null;default:0;index:idx_user_read,priority:2" json:"read"`
	ReadAt    *time.Time `gorm:"type:datetime" json:"read_at"`
	CreatedAt time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
}

// TableName 指定表名。
func (Notification) TableName() string { return "notifications" }

// SmsRecord 是短信发送记录模型。
type SmsRecord struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Phone        string    `gorm:"type:varchar(32);not null;default:'';index:idx_phone" json:"phone"`
	Code         string    `gorm:"type:varchar(16);not null;default:''" json:"code"`
	Scene        string    `gorm:"type:varchar(32);not null;default:''" json:"scene"`
	Status       int8      `gorm:"tinyint;not null;default:1" json:"status"`
	ErrorMessage string    `gorm:"type:varchar(512);not null;default:''" json:"error_message"`
	SendCount    int32     `gorm:"int;not null;default:1" json:"send_count"`
	CreatedAt    time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
}

// TableName 指定表名。
func (SmsRecord) TableName() string { return "sms_records" }

// AuditLog 是后台操作审计日志模型。
type AuditLog struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	AdminID      uint64    `gorm:"bigint unsigned;not null;default:0;index:idx_admin" json:"admin_id"`
	AdminName    string    `gorm:"type:varchar(64);not null;default:''" json:"admin_name"`
	Module       string    `gorm:"type:varchar(64);not null;default:'';index:idx_module_action,priority:1" json:"module"`
	Action       string    `gorm:"type:varchar(64);not null;default:'';index:idx_module_action,priority:2" json:"action"`
	TargetType   string    `gorm:"type:varchar(64);not null;default:''" json:"target_type"`
	TargetID     string    `gorm:"type:varchar(64);not null;default:''" json:"target_id"`
	Detail       string    `gorm:"type:text" json:"detail"`
	IP           string    `gorm:"type:varchar(64);not null;default:''" json:"ip"`
	UserAgent    string    `gorm:"type:varchar(512);not null;default:''" json:"user_agent"`
	Result       int8      `gorm:"tinyint;not null;default:1" json:"result"`
	ErrorMessage string    `gorm:"type:varchar(512);not null;default:''" json:"error_message"`
	CreatedAt    time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_created" json:"created_at"`
}

// TableName 指定表名。
func (AuditLog) TableName() string { return "audit_logs" }

// SystemSetting 是系统配置模型。
type SystemSetting struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Key         string    `gorm:"type:varchar(128);not null;uniqueIndex:uk_key" json:"key"`
	Value       string    `gorm:"type:varchar(1024);not null;default:''" json:"value"`
	Name        string    `gorm:"type:varchar(128);not null;default:''" json:"name"`
	Group       string    `gorm:"type:varchar(64);not null;default:'basic';index:idx_group" json:"group"`
	Description string    `gorm:"type:varchar(255);not null;default:''" json:"description"`
	ValueType   string    `gorm:"type:varchar(16);not null;default:'string'" json:"value_type"`
	CreatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (SystemSetting) TableName() string { return "system_settings" }
