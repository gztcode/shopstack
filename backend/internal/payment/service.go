package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
	"github.com/shopstack/platform/backend/internal/thirdparty"
)

// Service 承载支付域的业务逻辑。
type Service struct {
	repo      *Repo
	registry  *client.Registry
	providers *thirdparty.Providers
	mq        *mq.Client
}

// NewService 构造支付服务。
func NewService(repo *Repo, registry *client.Registry, providers *thirdparty.Providers, mqClient *mq.Client) *Service {
	return &Service{repo: repo, registry: registry, providers: providers, mq: mqClient}
}

// CreatePayment 创建支付单并唤起支付。
func (s *Service) CreatePayment(ctx context.Context, req *paymentv1.CreatePaymentRequest) (*paymentv1.Payment, error) {
	userID := req.GetUserId()
	if userID <= 0 {
		userID = auth.UserIDFromContext(ctx)
	}
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	if req.GetOrderId() <= 0 {
		return nil, errs.Invalid("订单 ID 不能为空")
	}

	channel := int8(req.GetChannel())
	if channel == 0 {
		channel = ChannelWeChat
	}

	// 幂等：同一订单存在待支付流水则直接复用
	existing, err := s.repo.FindPaymentByOrder(ctx, uint64(req.GetOrderId()))
	if err == nil && existing.Status == StatusPending {
		return paymentToProto(existing), nil
	}

	// 查询订单确认金额
	order, oErr := s.fetchOrder(ctx, req.GetOrderId())
	if oErr != nil {
		return nil, oErr
	}
	if userID != order.GetUserId() {
		return nil, errs.New(errs.CodeForbidden, "无权支付该订单")
	}
	if order.GetPayableCents() <= 0 {
		return nil, errs.Invalid("订单金额异常")
	}

	p := &Payment{
		PaymentNo:   generatePaymentNo(time.Now()),
		OrderID:     uint64(order.GetId()),
		OrderNo:     order.GetOrderNo(),
		UserID:      uint64(userID),
		AmountCents: order.GetPayableCents(),
		Status:      StatusPending,
		Channel:     channel,
	}
	if err := s.repo.CreatePayment(ctx, p); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建支付单失败", err)
	}

	// 唤起支付
	payload, payErr := s.providers.WeChat.CreatePay(ctx, thirdparty.PayParams{
		OrderNo:     p.PaymentNo,
		AmountCents: p.AmountCents,
		Description: "订单 " + p.OrderNo,
		NotifyURL:   "",
		TradeType:   "JSAPI",
	})
	if payErr != nil {
		_ = s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
			"status":      StatusFailed,
			"fail_reason": payErr.Error(),
		})
		return nil, errs.Wrap(errs.CodePaymentFailed, "发起支付失败", payErr)
	}

	params := map[string]string{
		"appId":     payload.AppID,
		"timeStamp": payload.TimeStamp,
		"nonceStr":  payload.NonceStr,
		"package":   payload.Package,
		"signType":  payload.SignType,
		"paySign":   payload.PaySign,
		"prepayId":  payload.PrepayID,
	}
	for k, v := range payload.Extra {
		params[k] = v
	}
	raw, _ := json.Marshal(params)

	if err := s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
		"prepay_id":  payload.PrepayID,
		"pay_params": string(raw),
	}); err != nil {
		logger.L().Warn("更新支付参数失败", zap.Error(err))
	}

	// 演示环境下 Mock 支付会直接回调，避免前端卡在支付中
	if s.providers.WeChat.Mock() {
		go s.mockSettle(ctx, p.ID, p.PaymentNo)
	}

	updated, err := s.repo.FindPaymentByID(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return paymentToProto(updated), nil
}

// mockSettle 模拟支付成功回调（仅 Mock 通道生效）。
func (s *Service) mockSettle(ctx context.Context, paymentID uint64, paymentNo string) {
	time.Sleep(1200 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.settle(ctx, paymentID, paymentNo, "MOCK_"+paymentNo, 2); err != nil {
		logger.L().Error("模拟支付结算失败", zap.Uint64("支付ID", paymentID), zap.Error(err))
	}
}

// QueryPayment 查询支付单。
func (s *Service) QueryPayment(ctx context.Context, paymentID, orderID, userID int64) (*paymentv1.Payment, error) {
	var (
		p   *Payment
		err error
	)
	switch {
	case paymentID > 0:
		p, err = s.repo.FindPaymentByID(ctx, uint64(paymentID))
	case orderID > 0:
		p, err = s.repo.FindPaymentByOrder(ctx, uint64(orderID))
	default:
		return nil, errs.Invalid("请指定支付单 ID 或订单 ID")
	}
	if err != nil {
		return nil, err
	}
	if userID > 0 && uint64(userID) != p.UserID {
		return nil, errs.New(errs.CodeForbidden, "无权查看该支付单")
	}
	return paymentToProto(p), nil
}

// Notify 处理支付回调。
func (s *Service) Notify(ctx context.Context, req *paymentv1.PaymentCallbackRequest) error {
	if req.GetPaymentNo() == "" {
		return errs.Invalid("缺少支付单号")
	}
	status := int8(req.GetStatus())
	if status == 0 {
		status = StatusSuccess
	}

	// 充值单回调：按充值单号结算并把金额计入用户余额
	rc, rcErr := s.repo.FindRechargeByNo(ctx, req.GetPaymentNo())
	if rcErr != nil {
		return errs.Wrap(errs.CodeInternalError, "查询充值单失败", rcErr)
	}
	if rc != nil {
		if status != StatusSuccess {
			return s.repo.UpdateRechargeStatus(ctx, rc.ID, RechargeStatusCancelled, nil)
		}
		return s.settleRecharge(ctx, rc.ID, rc.RechargeNo)
	}

	return s.settle(ctx, 0, req.GetPaymentNo(), req.GetTransactionId(), status)
}

// settle 完成支付结算。
func (s *Service) settle(ctx context.Context, paymentID uint64, paymentNo, transactionID string, status int8) error {
	var (
		p   *Payment
		err error
	)
	if paymentID > 0 {
		p, err = s.repo.FindPaymentByID(ctx, paymentID)
	} else {
		p, err = s.repo.FindPaymentByNo(ctx, paymentNo)
	}
	if err != nil {
		return err
	}

	if status != StatusSuccess {
		_ = s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
			"status":      status,
			"fail_reason": "支付未完成",
		})
		return nil
	}

	now := time.Now()
	updated, err := s.repo.MarkSuccess(ctx, p.ID, transactionID, now)
	if err != nil {
		return errs.Wrap(errs.CodeInternalError, "更新支付状态失败", err)
	}
	if !updated {
		// 已经是成功状态，幂等返回
		logger.L().Info("支付单已处于成功状态，忽略重复回调",
			zap.String("支付单号", p.PaymentNo))
		return nil
	}

	logger.L().Info("支付成功",
		zap.String("支付单号", p.PaymentNo),
		zap.String("订单号", p.OrderNo),
		zap.Int64("金额", p.AmountCents))

	// 发布支付成功事件，驱动订单状态流转
	if s.mq != nil {
		s.mq.PublishAsync(mq.NewEvent(mq.EventPaymentSuccess, "payment-service", "", map[string]any{
			"payment_id":     int64(p.ID),
			"payment_no":     p.PaymentNo,
			"order_id":       int64(p.OrderID),
			"order_no":       p.OrderNo,
			"user_id":        int64(p.UserID),
			"amount":         p.AmountCents,
			"transaction_id": transactionID,
		}))
	}
	return nil
}

// CreateRefund 发起退款。
func (s *Service) CreateRefund(ctx context.Context, req *paymentv1.CreateRefundRequest) (*paymentv1.PaymentRefund, error) {
	if req.GetAmountCents() <= 0 {
		return nil, errs.Invalid("退款金额必须大于 0")
	}
	if req.GetPaymentId() <= 0 && req.GetOrderId() <= 0 {
		return nil, errs.Invalid("请指定支付单或订单")
	}

	var p *Payment
	var err error
	if req.GetPaymentId() > 0 {
		p, err = s.repo.FindPaymentByID(ctx, uint64(req.GetPaymentId()))
	} else {
		p, err = s.repo.FindPaymentByOrder(ctx, uint64(req.GetOrderId()))
	}
	if err != nil {
		return nil, err
	}
	if p.Status != StatusSuccess {
		return nil, errs.New(errs.CodeRefundFailed, "该支付单尚未支付成功，无法退款")
	}
	remain := p.AmountCents - p.RefundedCents
	if req.GetAmountCents() > remain {
		return nil, errs.New(errs.CodeRefundFailed, "退款金额超过可退金额")
	}

	rf := &PaymentRefund{
		RefundNo:      "PR" + generatePaymentNo(time.Now()),
		PaymentID:     p.ID,
		OrderID:       p.OrderID,
		AmountCents:   req.GetAmountCents(),
		Status:        1,
		Reason:        req.GetReason(),
		TransactionID: "MOCK_REFUND_" + p.PaymentNo,
	}
	if err := s.repo.CreateRefund(ctx, rf); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建退款记录失败", err)
	}

	if err := s.repo.UpdatePaymentFields(ctx, p.ID, map[string]any{
		"refunded_cents": p.RefundedCents + req.GetAmountCents(),
	}); err != nil {
		logger.L().Warn("更新支付单退款金额失败", zap.Error(err))
	}

	return paymentRefundToProto(rf), nil
}

// ListPayments 分页查询支付流水。
func (s *Service) ListPayments(ctx context.Context, status, channel int32, keyword string, userID int64, start, end time.Time, page *commonv1.PageRequest) (*paymentv1.ListPaymentsResponse, error) {
	pageNum, pageSize := normalizePage(page)

	list, total, err := s.repo.ListPayments(ctx, int8(status), int8(channel), keyword,
		uint64(userID), start, end, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询支付流水失败", err)
	}

	out := make([]*paymentv1.Payment, 0, len(list))
	for i := range list {
		out = append(out, paymentToProto(&list[i]))
	}

	_, totalAmount, totalRefunded, _ := s.repo.Totals(ctx, time.Time{}, time.Time{})

	return &paymentv1.ListPaymentsResponse{
		Payments:           out,
		Meta:               buildMeta(pageNum, pageSize, total),
		TotalAmountCents:   totalAmount,
		TotalRefundedCents: totalRefunded,
	}, nil
}

// Summary 支付统计汇总。
func (s *Service) Summary(ctx context.Context, days int32) (*paymentv1.PaymentSummaryResponse, error) {
	if days <= 0 {
		days = 30
	}
	now := time.Now()
	start := now.AddDate(0, 0, -int(days))
	todayStart := now.Truncate(24 * time.Hour)

	totalCount, totalAmount, refunded, err := s.repo.Totals(ctx, start, now)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计支付数据失败", err)
	}
	todayCount, todayAmount, _, err := s.repo.Totals(ctx, todayStart, now)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计今日支付数据失败", err)
	}

	// 成功率：成功笔数 / 总创建笔数
	var created int64
	if cErr := s.repo.DB().WithContext(ctx).Model(&Payment{}).
		Where("created_at >= ?", start).Count(&created).Error; cErr == nil {
		_ = cErr
	}
	successRate := int64(0)
	if created > 0 {
		successRate = totalCount * 100 / created
	}

	trend, err := s.repo.DailyPaymentTrend(ctx, start, now)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计支付趋势失败", err)
	}
	trendOut := make([]*paymentv1.PaymentTrendPoint, 0, len(trend))
	for _, t := range trend {
		trendOut = append(trendOut, &paymentv1.PaymentTrendPoint{
			Date: t.Date, Count: t.Count, AmountCents: t.AmountCents,
		})
	}

	return &paymentv1.PaymentSummaryResponse{
		TodayCount:          todayCount,
		TodayAmountCents:    todayAmount,
		TotalCount:          totalCount,
		TotalAmountCents:    totalAmount,
		RefundedAmountCents: refunded,
		SuccessRate:         successRate,
		Trend:               trendOut,
	}, nil
}

// fetchOrder 从订单服务读取订单信息。
func (s *Service) fetchOrder(ctx context.Context, orderID int64) (*orderv1.Order, error) {
	conn, err := s.registry.Conn(ctx, "order")
	if err != nil {
		return nil, errs.Wrap(errs.CodeUnavailable, "订单服务暂不可用", err)
	}
	orderClient := orderv1.NewOrderServiceClient(conn)

	detail, err := orderClient.GetOrder(ctx, &orderv1.GetOrderRequest{Id: orderID})
	if err != nil {
		return nil, errs.Wrap(errs.CodeOrderNotFound, "订单不存在", err)
	}
	return detail.GetOrder(), nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func paymentToProto(p *Payment) *paymentv1.Payment {
	if p == nil {
		return nil
	}
	params := map[string]string{}
	if p.PayParams != "" {
		_ = json.Unmarshal([]byte(p.PayParams), &params)
	}
	return &paymentv1.Payment{
		Id:            int64(p.ID),
		PaymentNo:     p.PaymentNo,
		OrderId:       int64(p.OrderID),
		OrderNo:       p.OrderNo,
		UserId:        int64(p.UserID),
		AmountCents:   p.AmountCents,
		RefundedCents: p.RefundedCents,
		Status:        commonv1.PaymentStatus(p.Status),
		Channel:       commonv1.PaymentChannel(p.Channel),
		TransactionId: p.TransactionID,
		PrepayId:      p.PrepayID,
		PayParams:     params,
		FailReason:    p.FailReason,
		PaidAt:        tsPtr(p.PaidAt),
		CreatedAt:     timestamppb.New(p.CreatedAt),
		UpdatedAt:     timestamppb.New(p.UpdatedAt),
	}
}

func paymentRefundToProto(rf *PaymentRefund) *paymentv1.PaymentRefund {
	if rf == nil {
		return nil
	}
	return &paymentv1.PaymentRefund{
		Id:            int64(rf.ID),
		RefundNo:      rf.RefundNo,
		PaymentId:     int64(rf.PaymentID),
		OrderId:       int64(rf.OrderID),
		AmountCents:   rf.AmountCents,
		Status:        int32(rf.Status),
		Reason:        rf.Reason,
		TransactionId: rf.TransactionID,
		CreatedAt:     timestamppb.New(rf.CreatedAt),
	}
}

func generatePaymentNo(t time.Time) string {
	return t.Format("20060102150405") + strconv.Itoa(rand.Intn(1000000))
}

func tsPtr(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}
	return timestamppb.New(*t)
}

func normalizePage(page *commonv1.PageRequest) (int, int) {
	pageNum := int(page.GetPage())
	pageSize := int(page.GetPageSize())
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return pageNum, pageSize
}

func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page: int32(page), PageSize: int32(pageSize),
		Total: total, TotalPages: int32(totalPages),
	}
}

var _ = fmt.Sprintf
