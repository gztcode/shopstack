// Package order 实现订单服务，负责下单、状态流转、售后退款与经营统计。
package order

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 订单状态
const (
	StatusPendingPayment = 1
	StatusPaid           = 2
	StatusShipped        = 3
	StatusCompleted      = 4
	StatusCancelled      = 5
	StatusRefunding      = 6
	StatusRefunded       = 7
	StatusClosed         = 8
)

// 退款单状态
const (
	RefundPending  = 0
	RefundApproved = 1
	RefundRejected = 2
	RefundDone     = 3
)

// Order 是订单主表模型。
type Order struct {
	ID               uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderNo          string     `gorm:"column:order_no;type:varchar(32);not null;uniqueIndex" json:"order_no"`
	UserID           uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	UserNickname     string     `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	Status           int8       `gorm:"not null;default:1;index" json:"status"`
	TotalAmountCents int64      `gorm:"column:total_amount_cents;not null;default:0" json:"total_amount_cents"`
	DiscountCents    int64      `gorm:"column:discount_cents;not null;default:0" json:"discount_cents"`
	FreightCents     int64      `gorm:"column:freight_cents;not null;default:0" json:"freight_cents"`
	PayableCents     int64      `gorm:"column:payable_cents;not null;default:0" json:"payable_cents"`
	PaidCents        int64      `gorm:"column:paid_cents;not null;default:0" json:"paid_cents"`
	RefundedCents    int64      `gorm:"column:refunded_cents;not null;default:0" json:"refunded_cents"`
	ItemCount        int        `gorm:"column:item_count;not null;default:0" json:"item_count"`
	TotalQuantity    int        `gorm:"column:total_quantity;not null;default:0" json:"total_quantity"`
	Receiver         string     `gorm:"type:varchar(64);not null;default:''" json:"receiver"`
	Phone            string     `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Address          string     `gorm:"type:varchar(512);not null;default:''" json:"address"`
	Remark           string     `gorm:"type:varchar(255);not null;default:''" json:"remark"`
	AdminRemark      string     `gorm:"column:admin_remark;type:varchar(512);not null;default:''" json:"admin_remark"`
	PaymentMethod    string     `gorm:"column:payment_method;type:varchar(32);not null;default:''" json:"payment_method"`
	CouponID         uint64     `gorm:"column:coupon_id;not null;default:0" json:"coupon_id"`
	ShipmentID       uint64     `gorm:"column:shipment_id;not null;default:0" json:"shipment_id"`
	PointsUsed       int        `gorm:"column:points_used;not null;default:0" json:"points_used"`
	PaidAt           *time.Time `json:"paid_at"`
	ShippedAt        *time.Time `json:"shipped_at"`
	CompletedAt      *time.Time `json:"completed_at"`
	CancelledAt      *time.Time `json:"cancelled_at"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// TableName 指定表名。
func (Order) TableName() string { return "orders" }

// OrderItem 是订单商品模型。
type OrderItem struct {
	ID            uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID       uint64 `gorm:"column:order_id;not null;index" json:"order_id"`
	ProductID     uint64 `gorm:"column:product_id;not null" json:"product_id"`
	SKUID         uint64 `gorm:"column:sku_id;not null" json:"sku_id"`
	ProductTitle  string `gorm:"column:product_title;type:varchar(200);not null;default:''" json:"product_title"`
	SpecText      string `gorm:"column:spec_text;type:varchar(255);not null;default:''" json:"spec_text"`
	Image         string `gorm:"type:varchar(512);not null;default:''" json:"image"`
	PriceCents    int64  `gorm:"column:price_cents;not null;default:0" json:"price_cents"`
	Quantity      int    `gorm:"not null;default:1" json:"quantity"`
	SubtotalCents int64  `gorm:"column:subtotal_cents;not null;default:0" json:"subtotal_cents"`
	RefundedCents int64  `gorm:"column:refunded_cents;not null;default:0" json:"refunded_cents"`
	Reviewed      bool   `gorm:"not null;default:false" json:"reviewed"`
	CategoryID    uint64 `gorm:"column:category_id;not null;default:0" json:"category_id"`
	ProductCover  string `gorm:"column:product_cover;type:varchar(512);not null;default:''" json:"product_cover"`
}

// TableName 指定表名。
func (OrderItem) TableName() string { return "order_items" }

// OrderStatusLog 是订单状态流转日志模型。
type OrderStatusLog struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID    uint64    `gorm:"column:order_id;not null;index" json:"order_id"`
	FromStatus int8      `gorm:"column:from_status;not null;default:0" json:"from_status"`
	ToStatus   int8      `gorm:"column:to_status;not null;default:0" json:"to_status"`
	Action     string    `gorm:"type:varchar(64);not null;default:''" json:"action"`
	Operator   string    `gorm:"type:varchar(64);not null;default:''" json:"operator"`
	Remark     string    `gorm:"type:varchar(512);not null;default:''" json:"remark"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName 指定表名。
func (OrderStatusLog) TableName() string { return "order_status_logs" }

// Refund 是退款单模型。
type Refund struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	RefundNo    string     `gorm:"column:refund_no;type:varchar(32);not null;uniqueIndex" json:"refund_no"`
	OrderID     uint64     `gorm:"column:order_id;not null;index" json:"order_id"`
	OrderNo     string     `gorm:"column:order_no;type:varchar(32);not null;default:''" json:"order_no"`
	UserID      uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	AmountCents int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	Reason      string     `gorm:"type:varchar(64);not null;default:''" json:"reason"`
	Description string     `gorm:"type:varchar(1024);not null;default:''" json:"description"`
	ItemIDs     string     `gorm:"column:item_ids;type:varchar(255);not null;default:''" json:"item_ids"`
	Status      int8       `gorm:"not null;default:0;index" json:"status"`
	AdminRemark string     `gorm:"column:admin_remark;type:varchar(512);not null;default:''" json:"admin_remark"`
	CreatedAt   time.Time  `json:"created_at"`
	ProcessedAt *time.Time `json:"processed_at"`
}

// TableName 指定表名。
func (Refund) TableName() string { return "refunds" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// Repo 封装订单域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// CreateOrder 创建订单及商品明细（事务）。
func (r *Repo) CreateOrder(ctx context.Context, order *Order, items []OrderItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
		}
		if len(items) == 0 {
			return nil
		}
		return tx.Create(&items).Error
	})
}

// FindOrder 按 ID 查询订单。
func (r *Repo) FindOrder(ctx context.Context, id uint64) (*Order, error) {
	var o Order
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&o).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeOrderNotFound, "订单不存在")
		}
		return nil, err
	}
	return &o, nil
}

// FindOrderByNo 按订单号查询。
func (r *Repo) FindOrderByNo(ctx context.Context, orderNo string) (*Order, error) {
	var o Order
	if err := r.db.WithContext(ctx).Where("order_no = ?", orderNo).First(&o).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeOrderNotFound, "订单不存在")
		}
		return nil, err
	}
	return &o, nil
}

// OrderItems 查询订单商品。
func (r *Repo) OrderItems(ctx context.Context, orderID uint64) ([]OrderItem, error) {
	var list []OrderItem
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).Order("id ASC").Find(&list).Error
	return list, err
}

// UpdateOrderFields 更新订单字段。
func (r *Repo) UpdateOrderFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Order{}).Where("id = ?", id).Updates(fields).Error
}

// AddStatusLog 记录状态流转日志。
func (r *Repo) AddStatusLog(ctx context.Context, log *OrderStatusLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// StatusLogs 查询订单状态流转日志。
func (r *Repo) StatusLogs(ctx context.Context, orderID uint64) ([]OrderStatusLog, error) {
	var list []OrderStatusLog
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).Order("id ASC").Find(&list).Error
	return list, err
}

// ListOrders 分页查询订单。
func (r *Repo) ListOrders(ctx context.Context, userID uint64, status int8, keyword string, start, end time.Time, page, pageSize int) ([]Order, int64, error) {
	q := r.db.WithContext(ctx).Model(&Order{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("order_no LIKE ? OR receiver LIKE ? OR phone LIKE ?", like, like, like)
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
	var list []Order
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// CountByStatus 统计指定状态订单数。
func (r *Repo) CountByStatus(ctx context.Context, userID uint64, status int8) (int64, error) {
	q := r.db.WithContext(ctx).Model(&Order{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var count int64
	err := q.Count(&count).Error
	return count, err
}

// CreateRefund 创建退款单。
func (r *Repo) CreateRefund(ctx context.Context, refund *Refund) error {
	return r.db.WithContext(ctx).Create(refund).Error
}

// FindRefund 按 ID 查询退款单。
func (r *Repo) FindRefund(ctx context.Context, id uint64) (*Refund, error) {
	var rf Refund
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&rf).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeRefundNotFound, "退款单不存在")
		}
		return nil, err
	}
	return &rf, nil
}

// UpdateRefundFields 更新退款单字段。
func (r *Repo) UpdateRefundFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Refund{}).Where("id = ?", id).Updates(fields).Error
}

// ListRefunds 分页查询退款单。
func (r *Repo) ListRefunds(ctx context.Context, status int8, userID uint64, keyword string, page, pageSize int) ([]Refund, int64, error) {
	q := r.db.WithContext(ctx).Model(&Refund{})
	if status >= 0 {
		q = q.Where("status = ?", status)
	}
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("refund_no LIKE ? OR order_no LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Refund
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ---------------------------------------------------------------------------
// 统计
// ---------------------------------------------------------------------------

// StatusCount 是一个状态对应的订单数量。
type StatusCount struct {
	Status int8
	Count  int64
}

// CountsByStatus 统计各状态订单数。
func (r *Repo) CountsByStatus(ctx context.Context, since time.Time) (map[int8]int64, error) {
	type row struct {
		Status int8
		Count  int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select("status, COUNT(*) AS count").
		Where("created_at >= ?", since).
		Group("status").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[int8]int64, len(rows))
	for _, rw := range rows {
		out[rw.Status] = rw.Count
	}
	return out, nil
}

// RevenueSum 统计区间内的成交金额。
func (r *Repo) RevenueSum(ctx context.Context, since time.Time) (int64, error) {
	var total *int64
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select("COALESCE(SUM(paid_cents),0)").
		Where("status IN ? AND created_at >= ?", []int8{StatusPaid, StatusShipped, StatusCompleted}, since).
		Scan(&total).Error
	if err != nil || total == nil {
		return 0, err
	}
	return *total, nil
}

// TrendPoint 是按天聚合的经营数据。
type TrendPoint struct {
	Date         string
	OrderCount   int64
	RevenueCents int64
}

// DailyTrend 返回按天聚合的订单量与成交额。
func (r *Repo) DailyTrend(ctx context.Context, since time.Time) ([]TrendPoint, error) {
	type row struct {
		Date    string
		Count   int64
		Revenue int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select("DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(paid_cents),0) AS revenue").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Order("date ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]TrendPoint, 0, len(rows))
	for _, rw := range rows {
		out = append(out, TrendPoint{Date: rw.Date, OrderCount: rw.Count, RevenueCents: rw.Revenue})
	}
	return out, nil
}

// CategoryStat 是分类维度的销售统计。
type CategoryStat struct {
	CategoryID   uint64
	CategoryName string
	SalesCount   int64
	RevenueCents int64
}

// CategorySales 统计分类维度的销量与销售额。
func (r *Repo) CategorySales(ctx context.Context, since time.Time) ([]CategoryStat, error) {
	type row struct {
		CategoryID   uint64
		SalesCount   int64
		RevenueCents int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&OrderItem{}).
		Select("category_id, SUM(quantity) AS sales_count, SUM(subtotal_cents) AS revenue_cents").
		Where("order_id IN (?)", r.db.WithContext(ctx).Model(&Order{}).
			Select("id").Where("created_at >= ?", since)).
		Group("category_id").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]CategoryStat, 0, len(rows))
	for _, rw := range rows {
		out = append(out, CategoryStat{
			CategoryID: rw.CategoryID, SalesCount: rw.SalesCount, RevenueCents: rw.RevenueCents,
		})
	}
	return out, nil
}

// TopProduct 是热销商品统计。
type TopProduct struct {
	ProductID    uint64
	Title        string
	Cover        string
	SalesCount   int64
	RevenueCents int64
}

// TopProducts 查询热销商品 Top N。
func (r *Repo) TopProducts(ctx context.Context, since time.Time, limit int) ([]TopProduct, error) {
	type row struct {
		ProductID    uint64
		Title        string
		Cover        string
		SalesCount   int64
		RevenueCents int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&OrderItem{}).
		Select("product_id, MAX(product_title) AS title, MAX(product_cover) AS cover, "+
			"SUM(quantity) AS sales_count, SUM(subtotal_cents) AS revenue_cents").
		Where("order_id IN (?)", r.db.WithContext(ctx).Model(&Order{}).
			Select("id").Where("created_at >= ?", since)).
		Group("product_id").Order("sales_count DESC").Limit(limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]TopProduct, 0, len(rows))
	for _, rw := range rows {
		out = append(out, TopProduct{
			ProductID: rw.ProductID, Title: rw.Title, Cover: rw.Cover,
			SalesCount: rw.SalesCount, RevenueCents: rw.RevenueCents,
		})
	}
	return out, nil
}
