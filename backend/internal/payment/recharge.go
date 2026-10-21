package payment

import (
	"context"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// 充值单状态
const (
	// RechargeStatusPending 待支付。
	RechargeStatusPending = 0
	// RechargeStatusPaid 已支付（余额已入账）。
	RechargeStatusPaid = 1
	// RechargeStatusCancelled 已取消。
	RechargeStatusCancelled = 2
)

// 充值配置在 system_settings 中的分组与配置键。
const (
	rechargeSettingGroup = "recharge"

	settingKeyRechargeMinAmount      = "recharge.min_amount_cents"
	settingKeyRechargeMaxAmount      = "recharge.max_amount_cents"
	settingKeyRechargePresetAmounts  = "recharge.preset_amounts"
	settingKeyRechargeRegisterBonus  = "recharge.register_bonus_cents"
	settingKeyRechargeFirstBonusDesc = "recharge.first_recharge_bonus_desc"
	settingKeyRechargeBonusRateBPS   = "recharge.bonus_rate_bps"
	rechargeBizType                  = "recharge"
	rechargeBalanceLogTitle          = "余额充值"
)

// 充值配置默认值：配置表缺少对应配置项时使用。
const (
	defaultRechargeMinAmountCents = int64(100)      // 最低充值 1 元
	defaultRechargeMaxAmountCents = int64(10000000) // 最高充值 10 万元
	defaultRechargeBonusRateBPS   = int64(0)        // 默认不赠送
)

// defaultRechargePresetAmounts 是默认充值档位（单位：分）。
var defaultRechargePresetAmounts = []int64{1000, 5000, 10000, 50000, 100000}

// RechargeOrder 是充值单模型。
type RechargeOrder struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	RechargeNo  string     `gorm:"column:recharge_no;type:varchar(64);not null;uniqueIndex" json:"recharge_no"`
	UserID      uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	AmountCents int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	BonusCents  int64      `gorm:"column:bonus_cents;not null;default:0" json:"bonus_cents"`
	Status      int8       `gorm:"column:status;not null;default:0;index" json:"status"`
	Channel     int8       `gorm:"column:channel;not null;default:1" json:"channel"`
	PaymentNo   string     `gorm:"column:payment_no;type:varchar(64);not null;default:''" json:"payment_no"`
	PaidAt      *time.Time `gorm:"column:paid_at" json:"paid_at"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (RechargeOrder) TableName() string { return "recharge_orders" }

// systemSetting 是系统配置表的只读投影。
type systemSetting struct {
	Key   string `gorm:"column:key;primaryKey" json:"key"`
	Value string `gorm:"column:value" json:"value"`
}

// TableName 指定表名。
func (systemSetting) TableName() string { return "system_settings" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListRechargeSettings 读取指定分组的系统配置。
func (r *Repo) ListRechargeSettings(ctx context.Context, group string) ([]systemSetting, error) {
	var list []systemSetting
	err := r.db.WithContext(ctx).Model(&systemSetting{}).
		Where("`group` = ?", group).Find(&list).Error
	return list, err
}

// CreateRechargeOrder 新增充值单。
func (r *Repo) CreateRechargeOrder(ctx context.Context, rc *RechargeOrder) error {
	if err := r.db.WithContext(ctx).Create(rc).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodePaymentDuplicated, "充值单号重复，请重试")
		}
		return err
	}
	return nil
}

// FindRechargeByNo 按充值单号查询充值单，不存在时返回 (nil, nil)。
func (r *Repo) FindRechargeByNo(ctx context.Context, rechargeNo string) (*RechargeOrder, error) {
	if strings.TrimSpace(rechargeNo) == "" {
		return nil, nil
	}
	var rc RechargeOrder
	err := r.db.WithContext(ctx).Where("recharge_no = ?", rechargeNo).Limit(1).Find(&rc).Error
	if err != nil {
		return nil, err
	}
	if rc.ID == 0 {
		return nil, nil
	}
	return &rc, nil
}

// FindPendingRecharge 查询用户同金额、同渠道的待支付充值单。
func (r *Repo) FindPendingRecharge(ctx context.Context, userID uint64, amountCents int64, channel int8) (*RechargeOrder, error) {
	var rc RechargeOrder
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND amount_cents = ? AND channel = ? AND status = ?",
			userID, amountCents, channel, RechargeStatusPending).
		Order("id DESC").Limit(1).Find(&rc).Error
	if err != nil {
		return nil, err
	}
	if rc.ID == 0 {
		return nil, nil
	}
	return &rc, nil
}

// ListRecharges 分页查询充值单。
//
// userID 为 0 表示不限用户（后台管理端查看全量）。
func (r *Repo) ListRecharges(ctx context.Context, userID uint64, status int32, page, pageSize int) ([]RechargeOrder, int64, error) {
	q := r.db.WithContext(ctx).Model(&RechargeOrder{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []RechargeOrder
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// UpdateRechargeStatus 更新充值单状态。
func (r *Repo) UpdateRechargeStatus(ctx context.Context, id uint64, status int8, paidAt *time.Time) error {
	fields := map[string]any{"status": status}
	if paidAt != nil {
		fields["paid_at"] = paidAt
	}
	return r.db.WithContext(ctx).Model(&RechargeOrder{}).Where("id = ?", id).Updates(fields).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetRechargeConfig 查询充值配置。
//
// 配置来自 system_settings 的 recharge 分组，
// 缺少配置项时回退到内置默认档位。
func (s *Service) GetRechargeConfig(ctx context.Context) (*paymentv1.RechargeConfig, error) {
	cfg, err := s.loadRechargeConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &paymentv1.RechargeConfig{
		MinAmountCents:         cfg.minAmountCents,
		MaxAmountCents:         cfg.maxAmountCents,
		PresetAmounts:          cfg.presetAmounts,
		RegisterBonusCents:     cfg.registerBonusCents,
		FirstRechargeBonusDesc: cfg.firstRechargeBonusDesc,
	}, nil
}

// CreateRecharge 创建余额充值单。
//
// 充值单初始状态为「待支付」，用户完成第三方支付后由支付回调触发余额入账。
func (s *Service) CreateRecharge(ctx context.Context, req *paymentv1.CreateRechargeRequest) (*paymentv1.RechargeOrder, error) {
	userID := auth.UserIDFromContext(ctx)
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	amount := req.GetAmountCents()
	if amount <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "充值金额必须大于 0")
	}

	cfg, err := s.loadRechargeConfig(ctx)
	if err != nil {
		return nil, err
	}
	if amount < cfg.minAmountCents || amount > cfg.maxAmountCents {
		return nil, errs.New(errs.CodeInvalidParam, "充值金额需在 "+
			strconv.FormatInt(cfg.minAmountCents, 10)+" ~ "+
			strconv.FormatInt(cfg.maxAmountCents, 10)+" 分之间")
	}

	channel := int8(req.GetChannel())
	if channel == 0 {
		channel = ChannelWeChat
	}
	if channel == ChannelBalance {
		return nil, errs.New(errs.CodeInvalidParam, "余额渠道不能用于充值")
	}
	if channel != ChannelWeChat && channel != ChannelAlipay {
		return nil, errs.New(errs.CodeInvalidParam, "不支持的充值渠道")
	}
	if _, err := s.repo.FindEnabledPayChannelByType(ctx, channel); err != nil {
		return nil, err
	}

	// 幂等：同用户、同金额、同渠道存在待支付充值单时直接复用
	existing, err := s.repo.FindPendingRecharge(ctx, uint64(userID), amount, channel)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询充值单失败", err)
	}
	if existing != nil {
		return rechargeToProto(existing), nil
	}

	bonus := amount * cfg.bonusRateBPS / 10000
	rechargeNo := "RC" + generatePaymentNo(time.Now())
	rc := &RechargeOrder{
		RechargeNo:  rechargeNo,
		UserID:      uint64(userID),
		AmountCents: amount,
		BonusCents:  bonus,
		Status:      RechargeStatusPending,
		Channel:     channel,
		// 充值单自身的单号同时作为支付回调的支付单号
		PaymentNo: rechargeNo,
	}
	if err := s.repo.CreateRechargeOrder(ctx, rc); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建充值单失败", err)
	}

	// Mock 通道下模拟支付回调，便于本地联调
	if channel == ChannelWeChat && s.providers != nil && s.providers.WeChat != nil && s.providers.WeChat.Mock() {
		go s.mockSettleRecharge(rc.ID, rc.RechargeNo)
	}

	return rechargeToProto(rc), nil
}

// ListRecharges 查询当前用户的充值单列表。
func (s *Service) ListRecharges(ctx context.Context, req *paymentv1.ListRechargesRequest) (*paymentv1.ListRechargesResponse, error) {
	userID, err := resolveOwnerUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	pageNum, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListRecharges(ctx, uint64(userID), req.GetStatus(), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询充值单失败", err)
	}
	out := make([]*paymentv1.RechargeOrder, 0, len(list))
	for i := range list {
		out = append(out, rechargeToProto(&list[i]))
	}
	return &paymentv1.ListRechargesResponse{Recharges: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// mockSettleRecharge 模拟充值支付回调（仅 Mock 通道生效）。
func (s *Service) mockSettleRecharge(rechargeID uint64, rechargeNo string) {
	time.Sleep(1200 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.settleRecharge(ctx, rechargeID, rechargeNo); err != nil {
		logger.L().Error("模拟充值结算失败", zap.Uint64("充值单ID", rechargeID), zap.Error(err))
	}
}

// settleRecharge 充值入账：把充值金额与赠送金额计入用户余额并写入余额流水。
//
// 幂等：充值单状态从「待支付」原子流转到「已支付」后才入账，
// 重复回调不会重复加钱。
func (s *Service) settleRecharge(ctx context.Context, rechargeID uint64, rechargeNo string) error {
	rc, err := s.repo.FindRechargeByNo(ctx, rechargeNo)
	if err != nil {
		return errs.Wrap(errs.CodeInternalError, "查询充值单失败", err)
	}
	if rc == nil {
		return errs.New(errs.CodeNotFound, "充值单不存在")
	}
	if rc.ID != rechargeID {
		rechargeID = rc.ID
	}
	if rc.Status != RechargeStatusPending {
		// 已处理过的充值单直接返回，保证回调幂等
		return nil
	}

	now := time.Now()
	credited, err := s.repo.ApplyRechargeCredit(ctx, rc.ID, rc.UserID,
		rc.AmountCents+rc.BonusCents, rechargeBalanceLogTitle, rechargeBizType, now)
	if err != nil {
		return errs.Wrap(errs.CodePaymentFailed, "充值入账失败", err)
	}
	if !credited {
		return nil
	}

	logger.L().Info("充值入账成功",
		zap.String("充值单号", rc.RechargeNo),
		zap.Int64("充值金额", rc.AmountCents),
		zap.Int64("赠送金额", rc.BonusCents))
	return nil
}

// ---------------------------------------------------------------------------
// 充值配置
// ---------------------------------------------------------------------------

// rechargeConfig 是充值配置的内部表示。
type rechargeConfig struct {
	minAmountCents         int64
	maxAmountCents         int64
	presetAmounts          []int64
	registerBonusCents     int64
	firstRechargeBonusDesc string
	bonusRateBPS           int64
}

// loadRechargeConfig 读取充值配置，缺失项回退默认值。
func (s *Service) loadRechargeConfig(ctx context.Context) (*rechargeConfig, error) {
	cfg := &rechargeConfig{
		minAmountCents: defaultRechargeMinAmountCents,
		maxAmountCents: defaultRechargeMaxAmountCents,
		presetAmounts:  append([]int64(nil), defaultRechargePresetAmounts...),
		bonusRateBPS:   defaultRechargeBonusRateBPS,
	}

	settings, err := s.repo.ListRechargeSettings(ctx, rechargeSettingGroup)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "读取充值配置失败", err)
	}
	for _, item := range settings {
		switch item.Key {
		case settingKeyRechargeMinAmount:
			if v, err := strconv.ParseInt(strings.TrimSpace(item.Value), 10, 64); err == nil && v > 0 {
				cfg.minAmountCents = v
			}
		case settingKeyRechargeMaxAmount:
			if v, err := strconv.ParseInt(strings.TrimSpace(item.Value), 10, 64); err == nil && v > 0 {
				cfg.maxAmountCents = v
			}
		case settingKeyRechargePresetAmounts:
			if presets := parseAmountList(item.Value); len(presets) > 0 {
				cfg.presetAmounts = presets
			}
		case settingKeyRechargeRegisterBonus:
			if v, err := strconv.ParseInt(strings.TrimSpace(item.Value), 10, 64); err == nil && v >= 0 {
				cfg.registerBonusCents = v
			}
		case settingKeyRechargeFirstBonusDesc:
			cfg.firstRechargeBonusDesc = strings.TrimSpace(item.Value)
		case settingKeyRechargeBonusRateBPS:
			if v, err := strconv.ParseInt(strings.TrimSpace(item.Value), 10, 64); err == nil && v >= 0 {
				cfg.bonusRateBPS = v
			}
		}
	}
	if cfg.maxAmountCents < cfg.minAmountCents {
		cfg.maxAmountCents = cfg.minAmountCents
	}
	return cfg, nil
}

// parseAmountList 解析逗号分隔的金额列表（单位：分）。
func parseAmountList(raw string) []int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]int64, 0, len(parts))
	for _, p := range parts {
		v, err := strconv.ParseInt(strings.TrimSpace(p), 10, 64)
		if err != nil || v <= 0 {
			continue
		}
		out = append(out, v)
	}
	return out
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func rechargeToProto(rc *RechargeOrder) *paymentv1.RechargeOrder {
	if rc == nil {
		return nil
	}
	out := &paymentv1.RechargeOrder{
		Id:          int64(rc.ID),
		RechargeNo:  rc.RechargeNo,
		UserId:      int64(rc.UserID),
		AmountCents: rc.AmountCents,
		BonusCents:  rc.BonusCents,
		Status:      int32(rc.Status),
		Channel:     int32(rc.Channel),
		PaymentNo:   rc.PaymentNo,
		CreatedAt:   timestamppb.New(rc.CreatedAt),
	}
	if rc.PaidAt != nil {
		out.PaidAt = timestamppb.New(*rc.PaidAt)
	}
	return out
}

// resolveOwnerUserID 解析数据归属用户。
//
// 普通用户只能查看自己的数据；后台管理端令牌可以查看全量（返回 0 表示不限用户），
// 也可以通过 requested 指定某个用户。
func resolveOwnerUserID(ctx context.Context, requested int64) (int64, error) {
	if auth.IsAdmin(ctx) {
		if requested > 0 {
			return requested, nil
		}
		return 0, nil
	}
	owner := auth.UserIDFromContext(ctx)
	if owner <= 0 {
		return 0, errs.Unauthorized("请先登录")
	}
	if requested > 0 && requested != owner {
		return 0, errs.Forbidden("无权查看他人的数据")
	}
	return owner, nil
}
