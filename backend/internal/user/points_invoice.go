package user

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// PointsLog 是积分明细模型。
type PointsLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	Change    int       `gorm:"not null;default:0" json:"change"`
	Balance   int       `gorm:"not null;default:0" json:"balance"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	BizID     string    `gorm:"column:biz_id;type:varchar(64);not null;default:''" json:"biz_id"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名。
func (PointsLog) TableName() string { return "user_points_logs" }

// Invoice 是发票申请模型。
type Invoice struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	OrderNo     string    `gorm:"column:order_no;type:varchar(32);not null;default:''" json:"order_no"`
	Title       string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	TaxNo       string    `gorm:"column:tax_no;type:varchar(64);not null;default:''" json:"tax_no"`
	Type        string    `gorm:"type:varchar(16);not null;default:'personal'" json:"type"`
	Email       string    `gorm:"type:varchar(128);not null;default:''" json:"email"`
	AmountCents int64     `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	Status      int8      `gorm:"not null;default:0;index" json:"status"`
	InvoiceURL  string    `gorm:"column:invoice_url;type:varchar(512);not null;default:''" json:"invoice_url"`
	Remark      string    `gorm:"type:varchar(512);not null;default:''" json:"remark"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Invoice) TableName() string { return "user_invoices" }

// 发票状态
const (
	InvoicePending  = 0
	InvoiceIssued   = 1
	InvoiceRejected = 2
)

// ---------------------------------------------------------------------------
// 积分明细
// ---------------------------------------------------------------------------

// ListPointsLogs 分页查询积分明细。
func (r *Repo) ListPointsLogs(ctx context.Context, userID uint64, page, pageSize int) ([]PointsLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&PointsLog{}).Where("user_id = ?", userID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []PointsLog
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// AddPointsLog 记录一笔积分变动，并同步更新用户积分余额。
func (r *Repo) AddPointsLog(ctx context.Context, log *PointsLog) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(log).Error; err != nil {
			return err
		}
		return tx.Model(&User{}).Where("id = ?", log.UserID).
			Update("points", gorm.Expr("GREATEST(points + ?, 0)", log.Change)).Error
	})
}

// ---------------------------------------------------------------------------
// 发票
// ---------------------------------------------------------------------------

// ListInvoices 分页查询发票申请。
func (r *Repo) ListInvoices(ctx context.Context, userID uint64, status int8, page, pageSize int) ([]Invoice, int64, error) {
	q := r.db.WithContext(ctx).Model(&Invoice{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if status >= 0 {
		q = q.Where("status = ?", status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Invoice
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// CreateInvoice 创建发票申请。
func (r *Repo) CreateInvoice(ctx context.Context, inv *Invoice) error {
	return r.db.WithContext(ctx).Create(inv).Error
}

// FindInvoice 按 ID 查询发票。
func (r *Repo) FindInvoice(ctx context.Context, id uint64) (*Invoice, error) {
	var inv Invoice
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&inv).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "发票申请不存在")
		}
		return nil, err
	}
	return &inv, nil
}

// UpdateInvoiceFields 更新发票字段。
func (r *Repo) UpdateInvoiceFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Invoice{}).Where("id = ?", id).Updates(fields).Error
}
