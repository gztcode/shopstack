package order

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	orderv1 "github.com/shopstack/platform/gen/go/order/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// defaultStatsDays 是统计接口未指定周期时使用的默认天数。
const defaultStatsDays = 30

// PayChannel 是支付渠道模型（后台统计与筛选使用，只读）。
type PayChannel struct {
	ID      uint64 `gorm:"column:id;primaryKey" json:"id"`
	Name    string `gorm:"column:name;type:varchar(64);not null;default:''" json:"name"`
	Channel int8   `gorm:"column:channel;not null;default:1" json:"channel"`
	Code    string `gorm:"column:code;type:varchar(32);not null;default:''" json:"code"`
	Enabled bool   `gorm:"column:enabled;not null;default:true" json:"enabled"`
	Sort    int32  `gorm:"column:sort;not null;default:0" json:"sort"`
}

// TableName 指定表名。
func (PayChannel) TableName() string { return "pay_channels" }

// paymentChannelFallback 是支付渠道编号到订单支付方式编码的兜底映射。
//
// 当 pay_channels 表缺少对应渠道时使用，避免历史订单无法筛选。
var paymentChannelFallback = map[int32]string{
	1: "wechat",
	2: "alipay",
	3: "balance",
}

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// AdminOrderQuery 是后台订单列表的筛选条件。
type AdminOrderQuery struct {
	Keyword       string
	Status        int8
	PaymentMethod string
	UserID        uint64
	Start         time.Time
	End           time.Time
	Page          int
	PageSize      int
}

// AdminListOrders 后台分页查询订单，按创建时间倒序。
func (r *Repo) AdminListOrders(ctx context.Context, q AdminOrderQuery) ([]Order, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Order{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("order_no LIKE ? OR receiver LIKE ? OR phone LIKE ?", like, like, like)
	}
	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	if q.PaymentMethod != "" {
		tx = tx.Where("payment_method = ?", q.PaymentMethod)
	}
	if q.UserID > 0 {
		tx = tx.Where("user_id = ?", q.UserID)
	}
	if !q.Start.IsZero() {
		tx = tx.Where("created_at >= ?", q.Start)
	}
	if !q.End.IsZero() {
		tx = tx.Where("created_at <= ?", q.End)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Order
	err := tx.Order("created_at DESC, id DESC").
		Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindPayChannelCode 按支付渠道编号查询订单使用的支付方式编码。
func (r *Repo) FindPayChannelCode(ctx context.Context, channel int32) (string, error) {
	var pc PayChannel
	err := r.db.WithContext(ctx).Where("channel = ?", channel).First(&pc).Error
	if err == nil {
		return pc.Code, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", err
	}
	if code, ok := paymentChannelFallback[channel]; ok {
		return code, nil
	}
	return "", errs.Invalid("支付渠道不存在")
}

// ChannelStat 是按渠道聚合的订单统计。
type ChannelStat struct {
	Channel     int8
	ChannelName string
	OrderCount  int64
	AmountCents int64
}

// OrderStatsByChannel 按订单支付渠道聚合订单数与金额。
//
// 口径：统计窗口内创建的订单，订单数为 COUNT(*)，金额为 SUM(payable_cents)。
func (r *Repo) OrderStatsByChannel(ctx context.Context, since time.Time) ([]ChannelStat, error) {
	type row struct {
		Channel     int8
		ChannelName string
		OrderCount  int64
		AmountCents int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select("COALESCE(pay_channels.channel, 0) AS channel, "+
			"COALESCE(pay_channels.name, orders.payment_method) AS channel_name, "+
			"COUNT(*) AS order_count, COALESCE(SUM(orders.payable_cents), 0) AS amount_cents").
		Joins("LEFT JOIN pay_channels ON pay_channels.code = orders.payment_method").
		Where("orders.created_at >= ?", since).
		Group("COALESCE(pay_channels.channel, 0), COALESCE(pay_channels.name, orders.payment_method)").
		Order("amount_cents DESC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]ChannelStat, 0, len(rows))
	for _, rw := range rows {
		out = append(out, ChannelStat{
			Channel:     rw.Channel,
			ChannelName: rw.ChannelName,
			OrderCount:  rw.OrderCount,
			AmountCents: rw.AmountCents,
		})
	}
	return out, nil
}

// HourStat 是按小时聚合的订单统计。
type HourStat struct {
	Hour        int32
	OrderCount  int64
	AmountCents int64
}

// OrderStatsByHour 按订单创建小时聚合订单数与金额。
//
// 口径：统计窗口内创建的订单，订单数为 COUNT(*)，金额为 SUM(payable_cents)。
func (r *Repo) OrderStatsByHour(ctx context.Context, since time.Time) ([]HourStat, error) {
	type row struct {
		Hour        int32
		OrderCount  int64
		AmountCents int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select("HOUR(created_at) AS hour, COUNT(*) AS order_count, COALESCE(SUM(payable_cents), 0) AS amount_cents").
		Where("created_at >= ?", since).
		Group("HOUR(created_at)").
		Order("hour ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]HourStat, 0, len(rows))
	for _, rw := range rows {
		out = append(out, HourStat{
			Hour:        rw.Hour,
			OrderCount:  rw.OrderCount,
			AmountCents: rw.AmountCents,
		})
	}
	return out, nil
}

// RegionStat 是按收货地区聚合的订单统计。
type RegionStat struct {
	Region      string
	OrderCount  int64
	AmountCents int64
}

// orderRegionExpr 是收货地区表达式：取地址的第一段（省/直辖市），缺省为「未知」。
const orderRegionExpr = "CASE WHEN orders.address IS NULL OR orders.address = '' THEN '未知' " +
	"ELSE TRIM(SUBSTRING_INDEX(orders.address, ' ', 1)) END"

// OrderStatsByRegion 按订单收货省份聚合订单数与金额。
//
// 口径：统计窗口内创建的订单，订单数为 COUNT(*)，金额为 SUM(payable_cents)。
func (r *Repo) OrderStatsByRegion(ctx context.Context, since time.Time) ([]RegionStat, error) {
	type row struct {
		Region      string
		OrderCount  int64
		AmountCents int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Order{}).
		Select(orderRegionExpr+" AS region, COUNT(*) AS order_count, COALESCE(SUM(orders.payable_cents), 0) AS amount_cents").
		Where("orders.created_at >= ?", since).
		Group(orderRegionExpr).
		Order("amount_cents DESC, region ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]RegionStat, 0, len(rows))
	for _, rw := range rows {
		out = append(out, RegionStat{
			Region:      rw.Region,
			OrderCount:  rw.OrderCount,
			AmountCents: rw.AmountCents,
		})
	}
	return out, nil
}

// RecentStatusLogs 查询最近的订单状态流转日志，按时间倒序。
func (r *Repo) RecentStatusLogs(ctx context.Context, limit int) ([]OrderStatusLog, error) {
	if limit <= 0 {
		limit = 100
	}
	var list []OrderStatusLog
	err := r.db.WithContext(ctx).Model(&OrderStatusLog{}).
		Order("created_at DESC, id DESC").Limit(limit).Find(&list).Error
	return list, err
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// AdminListOrders 后台订单列表，支持关键词、状态、支付方式、用户与时间范围筛选。
func (s *Service) AdminListOrders(ctx context.Context, req *orderv1.AdminListOrdersRequest) (*orderv1.ListOrdersResponse, error) {
	pageNum, pageSize := normalizePage(req.GetPage())

	var start, end time.Time
	if req.GetStartTime() > 0 {
		start = time.Unix(req.GetStartTime(), 0)
	}
	if req.GetEndTime() > 0 {
		end = time.Unix(req.GetEndTime(), 0)
	}

	paymentCode := ""
	if req.GetPaymentMethod() > 0 {
		code, err := s.repo.FindPayChannelCode(ctx, req.GetPaymentMethod())
		if err != nil {
			return nil, err
		}
		paymentCode = code
	}

	list, total, err := s.repo.AdminListOrders(ctx, AdminOrderQuery{
		Keyword:       strings.TrimSpace(req.GetKeyword()),
		Status:        int8(req.GetStatus()),
		PaymentMethod: paymentCode,
		UserID:        uint64(req.GetUserId()),
		Start:         start,
		End:           end,
		Page:          pageNum,
		PageSize:      pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单失败", err)
	}

	orders := make([]*orderv1.Order, 0, len(list))
	for i := range list {
		orders = append(orders, orderToProto(&list[i]))
	}

	pendingPayment, _ := s.repo.CountByStatus(ctx, 0, StatusPendingPayment)
	pendingShipment, _ := s.repo.CountByStatus(ctx, 0, StatusPaid)
	pendingReceipt, _ := s.repo.CountByStatus(ctx, 0, StatusShipped)
	refunding, _ := s.repo.CountByStatus(ctx, 0, StatusRefunding)

	return &orderv1.ListOrdersResponse{
		Orders:               orders,
		Meta:                 buildMeta(pageNum, pageSize, total),
		PendingPaymentCount:  pendingPayment,
		PendingShipmentCount: pendingShipment,
		PendingReceiptCount:  pendingReceipt,
		RefundingCount:       refunding,
	}, nil
}

// AdminOrderStatsByChannel 按渠道维度统计订单数与金额。
func (s *Service) AdminOrderStatsByChannel(ctx context.Context, days int32) (*orderv1.AdminOrderStatsByChannelResponse, error) {
	since := statsSince(days)
	stats, err := s.repo.OrderStatsByChannel(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计渠道订单失败", err)
	}
	out := make([]*orderv1.OrderChannelStat, 0, len(stats))
	for _, st := range stats {
		out = append(out, &orderv1.OrderChannelStat{
			Channel:     int32(st.Channel),
			ChannelName: st.ChannelName,
			OrderCount:  st.OrderCount,
			AmountCents: st.AmountCents,
		})
	}
	return &orderv1.AdminOrderStatsByChannelResponse{ChannelStats: out}, nil
}

// AdminOrderStatsByHour 按小时维度统计订单数与金额。
func (s *Service) AdminOrderStatsByHour(ctx context.Context, days int32) (*orderv1.AdminOrderStatsByHourResponse, error) {
	since := statsSince(days)
	stats, err := s.repo.OrderStatsByHour(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计时段订单失败", err)
	}
	out := make([]*orderv1.OrderHourStat, 0, len(stats))
	for _, st := range stats {
		out = append(out, &orderv1.OrderHourStat{
			Hour:        st.Hour,
			OrderCount:  st.OrderCount,
			AmountCents: st.AmountCents,
		})
	}
	return &orderv1.AdminOrderStatsByHourResponse{HourStats: out}, nil
}

// AdminOrderStatsByRegion 按收货地区维度统计订单数与金额。
func (s *Service) AdminOrderStatsByRegion(ctx context.Context, days int32) (*orderv1.AdminOrderStatsByRegionResponse, error) {
	since := statsSince(days)
	stats, err := s.repo.OrderStatsByRegion(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计地区订单失败", err)
	}
	out := make([]*orderv1.OrderRegionStat, 0, len(stats))
	for _, st := range stats {
		out = append(out, &orderv1.OrderRegionStat{
			Region:      st.Region,
			OrderCount:  st.OrderCount,
			AmountCents: st.AmountCents,
		})
	}
	return &orderv1.AdminOrderStatsByRegionResponse{RegionStats: out}, nil
}

// AdminListOrderLogs 后台订单操作日志。
//
// 指定 order_id 时返回该订单的全部流转日志，否则返回最近的订单日志。
func (s *Service) AdminListOrderLogs(ctx context.Context, orderID int64) (*orderv1.ListOrderLogsResponse, error) {
	var logs []OrderStatusLog
	var err error
	if orderID > 0 {
		logs, err = s.repo.StatusLogs(ctx, uint64(orderID))
	} else {
		logs, err = s.repo.RecentStatusLogs(ctx, 200)
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单日志失败", err)
	}
	out := make([]*orderv1.OrderStatusLog, 0, len(logs))
	for i := range logs {
		out = append(out, statusLogToProto(&logs[i]))
	}
	return &orderv1.ListOrderLogsResponse{Logs: out}, nil
}

// statsSince 返回统计窗口起点：最近 days 天（含今天），days 非法时使用默认值。
func statsSince(days int32) time.Time {
	if days <= 0 {
		days = defaultStatsDays
	}
	return time.Now().AddDate(0, 0, -int(days)).Truncate(24 * time.Hour)
}
