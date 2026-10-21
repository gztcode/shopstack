// Package payment 实现支付服务，负责下单、支付回调、退款与支付统计。
package payment

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 支付状态
const (
	StatusPending = 1
	StatusSuccess = 2
	StatusFailed  = 3
	StatusClosed  = 4
)

// 支付渠道
const (
	ChannelWeChat  = 1
	ChannelAlipay  = 2
	ChannelBalance = 3
)

// Payment 是支付流水模型。
type Payment struct {
	ID            uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	PaymentNo     string     `gorm:"column:payment_no;type:varchar(32);not null;uniqueIndex" json:"payment_no"`
	OrderID       uint64     `gorm:"column:order_id;not null;index" json:"order_id"`
	OrderNo       string     `gorm:"column:order_no;type:varchar(32);not null;default:''" json:"order_no"`
	UserID        uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	AmountCents   int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	RefundedCents int64      `gorm:"column:refunded_cents;not null;default:0" json:"refunded_cents"`
	Status        int8       `gorm:"not null;default:1;index" json:"status"`
	Channel       int8       `gorm:"not null;default:1" json:"channel"`
	TransactionID string     `gorm:"column:transaction_id;type:varchar(64);not null;default:''" json:"transaction_id"`
	PrepayID      string     `gorm:"column:prepay_id;type:varchar(128);not null;default:''" json:"prepay_id"`
	PayParams     string     `gorm:"column:pay_params;type:text" json:"pay_params"`
	FailReason    string     `gorm:"column:fail_reason;type:varchar(255);not null;default:''" json:"fail_reason"`
	PaidAt        *time.Time `json:"paid_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TableName 指定表名。
func (Payment) TableName() string { return "payments" }

// PaymentRefund 是支付侧退款记录模型。
type PaymentRefund struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	RefundNo      string    `gorm:"column:refund_no;type:varchar(32);not null;uniqueIndex" json:"refund_no"`
	PaymentID     uint64    `gorm:"column:payment_id;not null;index" json:"payment_id"`
	OrderID       uint64    `gorm:"column:order_id;not null;index" json:"order_id"`
	AmountCents   int64     `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	Status        int8      `gorm:"not null;default:0" json:"status"`
	Reason        string    `gorm:"type:varchar(255);not null;default:''" json:"reason"`
	TransactionID string    `gorm:"column:transaction_id;type:varchar(64);not null;default:''" json:"transaction_id"`
	CreatedAt     time.Time `json:"created_at"`
}

// TableName 指定表名。
func (PaymentRefund) TableName() string { return "payment_refunds" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// Repo 封装支付域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// CreatePayment 创建支付流水。
func (r *Repo) CreatePayment(ctx context.Context, p *Payment) error {
	return r.db.WithContext(ctx).Create(p).Error
}

// FindPaymentByID 按 ID 查询。
func (r *Repo) FindPaymentByID(ctx context.Context, id uint64) (*Payment, error) {
	var p Payment
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodePaymentNotFound, "支付单不存在")
		}
		return nil, err
	}
	return &p, nil
}

// FindPaymentByNo 按支付单号查询。
func (r *Repo) FindPaymentByNo(ctx context.Context, paymentNo string) (*Payment, error) {
	var p Payment
	if err := r.db.WithContext(ctx).Where("payment_no = ?", paymentNo).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodePaymentNotFound, "支付单不存在")
		}
		return nil, err
	}
	return &p, nil
}

// FindPaymentByOrder 按订单号查询最新支付单。
func (r *Repo) FindPaymentByOrder(ctx context.Context, orderID uint64) (*Payment, error) {
	var p Payment
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).
		Order("id DESC").First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodePaymentNotFound, "该订单还没有支付单")
		}
		return nil, err
	}
	return &p, nil
}

// UpdatePaymentFields 更新支付流水字段。
func (r *Repo) UpdatePaymentFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Payment{}).Where("id = ?", id).Updates(fields).Error
}

// MarkSuccess 原子地把待支付流水置为支付成功，避免重复回调导致重复入账。
func (r *Repo) MarkSuccess(ctx context.Context, id uint64, transactionID string, paidAt time.Time) (bool, error) {
	res := r.db.WithContext(ctx).Model(&Payment{}).
		Where("id = ? AND status = ?", id, StatusPending).
		Updates(map[string]any{
			"status":         StatusSuccess,
			"transaction_id": transactionID,
			"paid_at":        &paidAt,
		})
	return res.RowsAffected > 0, res.Error
}

// CreateRefund 创建支付退款记录。
func (r *Repo) CreateRefund(ctx context.Context, rf *PaymentRefund) error {
	return r.db.WithContext(ctx).Create(rf).Error
}

// UpdatePaymentRefund 更新退款记录。
func (r *Repo) UpdatePaymentRefund(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&PaymentRefund{}).Where("id = ?", id).Updates(fields).Error
}

// FindPaymentRefund 按支付单号查询退款记录。
func (r *Repo) FindPaymentRefund(ctx context.Context, refundNo string) (*PaymentRefund, error) {
	var rf PaymentRefund
	if err := r.db.WithContext(ctx).Where("refund_no = ?", refundNo).First(&rf).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeRefundFailed, "退款记录不存在")
		}
		return nil, err
	}
	return &rf, nil
}

// ListPayments 分页查询支付流水。
func (r *Repo) ListPayments(ctx context.Context, status, channel int8, keyword string, userID uint64, start, end time.Time, page, pageSize int) ([]Payment, int64, error) {
	q := r.db.WithContext(ctx).Model(&Payment{})
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if channel > 0 {
		q = q.Where("channel = ?", channel)
	}
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("payment_no LIKE ? OR order_no LIKE ? OR transaction_id LIKE ?", like, like, like)
	}
	if !start.IsZero() {
		q = q.Where("created_at >= ?", start)
	}
	if !end.IsZero() {
		q = q.Where("created_at <= ?", end)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Payment
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// Totals 统计支付总笔数与总金额。
func (r *Repo) Totals(ctx context.Context, start, end time.Time) (count int64, amount int64, refunded int64, err error) {
	q := r.db.WithContext(ctx).Model(&Payment{}).Where("status = ?", StatusSuccess)
	if !start.IsZero() {
		q = q.Where("created_at >= ?", start)
	}
	if !end.IsZero() {
		q = q.Where("created_at <= ?", end)
	}
	if err = q.Count(&count).Error; err != nil {
		return
	}
	var sum *int64
	if err = r.db.WithContext(ctx).Model(&Payment{}).
		Select("COALESCE(SUM(amount_cents),0)").Where("status = ?", StatusSuccess).Scan(&sum).Error; err != nil {
		return
	}
	if sum != nil {
		amount = *sum
	}
	var rsum *int64
	if err = r.db.WithContext(ctx).Model(&Payment{}).
		Select("COALESCE(SUM(refunded_cents),0)").Scan(&rsum).Error; err != nil {
		return
	}
	if rsum != nil {
		refunded = *rsum
	}
	return
}

// DailyPaymentTrend 返回按天聚合的支付统计。
func (r *Repo) DailyPaymentTrend(ctx context.Context, start, end time.Time) ([]DailyPoint, error) {
	type row struct {
		Date   string
		Count  int64
		Amount int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Payment{}).
		Select("DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(amount_cents),0) AS amount").
		Where("status = ? AND created_at >= ? AND created_at <= ?", StatusSuccess, start, end).
		Group("DATE(created_at)").Order("date ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]DailyPoint, 0, len(rows))
	for _, rw := range rows {
		out = append(out, DailyPoint{Date: rw.Date, Count: rw.Count, AmountCents: rw.Amount})
	}
	return out, nil
}

// DailyPoint 是按天聚合的支付数据。
type DailyPoint struct {
	Date        string
	Count       int64
	AmountCents int64
}
