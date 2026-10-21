// Package user 实现用户与后台管理相关的业务能力。
package user

import (
	"time"

	"gorm.io/gorm"
)

// 用户状态
const (
	UserStatusActive   = 1
	UserStatusDisabled = 2
	UserStatusFrozen   = 3
)

// 性别
const (
	GenderUnknown = 0
	GenderMale    = 1
	GenderFemale  = 2
)

// User 是用户表模型。
type User struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Username     string     `gorm:"type:varchar(64);not null;default:''" json:"username"`
	PasswordHash string     `gorm:"column:password_hash;type:varchar(255);not null;default:''" json:"-"`
	Nickname     string     `gorm:"type:varchar(64);not null;default:''" json:"nickname"`
	Avatar       string     `gorm:"type:varchar(512);not null;default:''" json:"avatar"`
	Phone        string     `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Email        string     `gorm:"type:varchar(128);not null;default:''" json:"email"`
	Gender       int8       `gorm:"not null;default:0" json:"gender"`
	Birthday     *time.Time `gorm:"type:date" json:"birthday"`
	Points       int        `gorm:"not null;default:0" json:"points"`
	BalanceCents int64      `gorm:"not null;default:0" json:"balance_cents"`
	Status       int8       `gorm:"not null;default:1" json:"status"`
	WeChatOpenID string     `gorm:"column:wechat_openid;type:varchar(64);not null;default:''" json:"wechat_openid"`
	RealName     string     `gorm:"column:real_name;type:varchar(64);not null;default:''" json:"real_name"`
	// RealnameStatus 实名状态：0 未认证 1 已认证 2 审核中
	RealnameStatus    int8           `gorm:"column:realname_status;not null;default:0" json:"realname_status"`
	PasswordChangedAt *time.Time     `json:"password_changed_at"`
	LastLoginAt       *time.Time     `json:"last_login_at"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (User) TableName() string { return "users" }

// UserAddress 是收货地址模型。
type UserAddress struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint64    `gorm:"not null;index" json:"user_id"`
	Receiver   string    `gorm:"type:varchar(64);not null;default:''" json:"receiver"`
	Phone      string    `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Province   string    `gorm:"type:varchar(64);not null;default:''" json:"province"`
	City       string    `gorm:"type:varchar(64);not null;default:''" json:"city"`
	District   string    `gorm:"type:varchar(64);not null;default:''" json:"district"`
	Detail     string    `gorm:"type:varchar(255);not null;default:''" json:"detail"`
	PostalCode string    `gorm:"column:postal_code;type:varchar(16);not null;default:''" json:"postal_code"`
	Tag        string    `gorm:"type:varchar(16);not null;default:''" json:"tag"`
	IsDefault  bool      `gorm:"not null;default:false" json:"is_default"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (UserAddress) TableName() string { return "user_addresses" }

// UserFavorite 是商品收藏模型。
type UserFavorite struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;uniqueIndex:uk_user_product" json:"user_id"`
	ProductID uint64    `gorm:"not null;uniqueIndex:uk_user_product" json:"product_id"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名。
func (UserFavorite) TableName() string { return "user_favorites" }

// Admin 是后台管理员模型。
type Admin struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Username     string     `gorm:"type:varchar(64);not null;uniqueIndex" json:"username"`
	PasswordHash string     `gorm:"column:password_hash;type:varchar(255);not null" json:"-"`
	RealName     string     `gorm:"type:varchar(64);not null;default:''" json:"real_name"`
	Avatar       string     `gorm:"type:varchar(512);not null;default:''" json:"avatar"`
	Email        string     `gorm:"type:varchar(128);not null;default:''" json:"email"`
	Phone        string     `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Status       int8       `gorm:"not null;default:1" json:"status"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TableName 指定表名。
func (Admin) TableName() string { return "admins" }

// Role 是角色模型。
type Role struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"type:varchar(64);not null" json:"name"`
	Code        string    `gorm:"type:varchar(64);not null;uniqueIndex" json:"code"`
	Description string    `gorm:"type:varchar(255);not null;default:''" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Role) TableName() string { return "roles" }

// Permission 是权限模型。
type Permission struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name       string    `gorm:"type:varchar(64);not null" json:"name"`
	Code       string    `gorm:"type:varchar(128);not null;uniqueIndex" json:"code"`
	Group      string    `gorm:"column:group;type:varchar(64);not null;default:''" json:"group"`
	Type       string    `gorm:"type:varchar(16);not null;default:'action'" json:"type"`
	ParentCode string    `gorm:"column:parent_code;type:varchar(128);not null;default:''" json:"parent_code"`
	Sort       int       `gorm:"not null;default:0" json:"sort"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName 指定表名。
func (Permission) TableName() string { return "permissions" }

// AdminRole 是管理员与角色的关联。
type AdminRole struct {
	AdminID uint64 `gorm:"primaryKey;column:admin_id" json:"admin_id"`
	RoleID  uint64 `gorm:"primaryKey;column:role_id" json:"role_id"`
}

// TableName 指定表名。
func (AdminRole) TableName() string { return "admin_roles" }

// RolePermission 是角色与权限的关联。
type RolePermission struct {
	RoleID       uint64 `gorm:"primaryKey;column:role_id" json:"role_id"`
	PermissionID uint64 `gorm:"primaryKey;column:permission_id" json:"permission_id"`
}

// TableName 指定表名。
func (RolePermission) TableName() string { return "role_permissions" }
