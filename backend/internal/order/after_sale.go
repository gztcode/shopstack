package order

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// ---------------------------------------------------------------------------
// 售后工单状态
//
// 0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成
// ---------------------------------------------------------------------------

const (
	AfterSalePending   = 0
	AfterSaleApproved  = 1
	AfterSaleRejected  = 2
	AfterSaleRefunded  = 3
	AfterSaleCompleted = 4
)

// 售后类型
const (
	AfterSaleTypeRefund   = 1 // 仅退款
	AfterSaleTypeReturn   = 2 // 退货退款
	AfterSaleTypeExchange = 3 // 换货
)

// afterSaleTransitions 定义售后单允许的状态流转。
//
// 待审核 → 审核通过 / 审核驳回；审核通过 → 已退款；已退款 → 已完成。
// 审核驳回与已完成是终态。
var afterSaleTransitions = map[int8][]int8{
	AfterSalePending:   {AfterSaleApproved, AfterSaleRejected},
	AfterSaleApproved:  {AfterSaleRefunded},
	AfterSaleRefunded:  {AfterSaleCompleted},
	AfterSaleRejected:  {},
	AfterSaleCompleted: {},
}

// AfterSale 是售后工单模型。
type AfterSale struct {
	ID           uint64     `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	AfterSaleNo  string     `gorm:"column:after_sale_no;type:varchar(64);not null;default:'';uniqueIndex" json:"after_sale_no"`
	OrderID      uint64     `gorm:"column:order_id;not null;index" json:"order_id"`
	OrderNo      string     `gorm:"column:order_no;type:varchar(64);not null;default:''" json:"order_no"`
	UserID       uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	UserNickname string     `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	Type         int8       `gorm:"column:type;not null;default:1;index" json:"type"`
	AmountCents  int64      `gorm:"column:amount_cents;not null;default:0" json:"amount_cents"`
	Reason       string     `gorm:"column:reason;type:varchar(128);not null;default:''" json:"reason"`
	Description  string     `gorm:"column:description;type:varchar(512);not null;default:''" json:"description"`
	ItemIDs      string     `gorm:"column:item_ids;type:varchar(512);not null;default:''" json:"item_ids"`
	Status       int8       `gorm:"column:status;not null;default:0;index" json:"status"`
	AdminRemark  string     `gorm:"column:admin_remark;type:varchar(512);not null;default:''" json:"admin_remark"`
	RefundID     uint64     `gorm:"column:refund_id;not null;default:0" json:"refund_id"`
	CreatedAt    time.Time  `gorm:"column:created_at" json:"created_at"`
	ProcessedAt  *time.Time `gorm:"column:processed_at" json:"processed_at"`
}

// TableName 指定表名。
func (AfterSale) TableName() string { return "after_sales" }

// RefundReason 是退款原因模型。
type RefundReason struct {
	ID      uint64 `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name    string `gorm:"column:name;type:varchar(64);not null;default:''" json:"name"`
	Type    int8   `gorm:"column:type;not null;default:1" json:"type"`
	Sort    int32  `gorm:"column:sort;not null;default:0" json:"sort"`
	Enabled bool   `gorm:"column:enabled;not null;default:true" json:"enabled"`
}

// TableName 指定表名。
func (RefundReason) TableName() string { return "refund_reasons" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// AfterSaleQuery 是售后工单列表的查询条件。
type AfterSaleQuery struct {
	UserID   uint64
	Status   int8
	Type     int8
	Keyword  string
	Page     int
	PageSize int
}

// ListAfterSales 分页查询售后工单。
func (r *Repo) ListAfterSales(ctx context.Context, q AfterSaleQuery) ([]AfterSale, int64, error) {
	tx := r.db.WithContext(ctx).Model(&AfterSale{})
	if q.UserID > 0 {
		tx = tx.Where("user_id = ?", q.UserID)
	}
	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	if q.Type > 0 {
		tx = tx.Where("type = ?", q.Type)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("after_sale_no LIKE ? OR order_no LIKE ? OR user_nickname LIKE ? OR reason LIKE ?",
			like, like, like, like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []AfterSale
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindAfterSale 按 ID 查询售后工单。
func (r *Repo) FindAfterSale(ctx context.Context, id uint64) (*AfterSale, error) {
	var a AfterSale
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "售后单不存在")
		}
		return nil, err
	}
	return &a, nil
}

// UpdateAfterSaleFields 更新售后工单字段。
func (r *Repo) UpdateAfterSaleFields(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&AfterSale{}).Where("id = ?", id).Updates(fields).Error
}

// ListRefundReasons 查询退款原因列表。
func (r *Repo) ListRefundReasons(ctx context.Context, reasonType int8, onlyEnabled bool) ([]RefundReason, error) {
	tx := r.db.WithContext(ctx).Model(&RefundReason{})
	if reasonType > 0 {
		tx = tx.Where("type = ?", reasonType)
	}
	if onlyEnabled {
		tx = tx.Where("enabled = ?", true)
	}
	var list []RefundReason
	err := tx.Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// FindRefundReason 按 ID 查询退款原因。
func (r *Repo) FindRefundReason(ctx context.Context, id uint64) (*RefundReason, error) {
	var rr RefundReason
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&rr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "退款原因不存在")
		}
		return nil, err
	}
	return &rr, nil
}

// FindRefundReasonByName 按名称与类型查询退款原因，用于查重。
func (r *Repo) FindRefundReasonByName(ctx context.Context, name string, reasonType int8, excludeID uint64) (*RefundReason, error) {
	tx := r.db.WithContext(ctx).Model(&RefundReason{}).Where("name = ?", name)
	if reasonType > 0 {
		tx = tx.Where("type = ?", reasonType)
	}
	if excludeID > 0 {
		tx = tx.Where("id <> ?", excludeID)
	}
	var rr RefundReason
	if err := tx.First(&rr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rr, nil
}

// SaveRefundReason 新增或更新退款原因。
func (r *Repo) SaveRefundReason(ctx context.Context, rr *RefundReason) error {
	if rr.ID == 0 {
		return r.db.WithContext(ctx).Create(rr).Error
	}
	return r.db.WithContext(ctx).Model(&RefundReason{}).Where("id = ?", rr.ID).
		Updates(map[string]any{
			"name":    rr.Name,
			"type":    rr.Type,
			"sort":    rr.Sort,
			"enabled": rr.Enabled,
		}).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListAfterSales 用户售后工单列表，只返回当前登录用户自己的售后单。
func (s *Service) ListAfterSales(ctx context.Context, userID int64, status, afterSaleType int32, page *commonv1.PageRequest) (*orderv1.ListAfterSalesResponse, error) {
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListAfterSales(ctx, AfterSaleQuery{
		UserID:   uint64(userID),
		Status:   int8(status),
		Type:     int8(afterSaleType),
		Page:     pageNum,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询售后单失败", err)
	}
	out := make([]*orderv1.AfterSale, 0, len(list))
	for i := range list {
		out = append(out, afterSaleToProto(&list[i]))
	}
	return &orderv1.ListAfterSalesResponse{AfterSales: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// GetAfterSale 查询售后工单详情，只允许查看自己的售后单。
func (s *Service) GetAfterSale(ctx context.Context, id, userID int64) (*orderv1.AfterSale, error) {
	if id <= 0 {
		return nil, errs.Invalid("售后单 ID 不能为空")
	}
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	afterSale, err := s.repo.FindAfterSale(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	if afterSale.UserID != uint64(userID) {
		return nil, errs.Forbidden("无权查看该售后单")
	}
	return afterSaleToProto(afterSale), nil
}

// ListRefundReasons 查询退款原因列表。
func (s *Service) ListRefundReasons(ctx context.Context, reasonType int32) (*orderv1.ListRefundReasonsResponse, error) {
	list, err := s.repo.ListRefundReasons(ctx, int8(reasonType), true)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询退款原因失败", err)
	}
	out := make([]*orderv1.RefundReason, 0, len(list))
	for i := range list {
		out = append(out, refundReasonToProto(&list[i]))
	}
	return &orderv1.ListRefundReasonsResponse{Reasons: out}, nil
}

// AdminListAfterSales 后台售后工单列表。
func (s *Service) AdminListAfterSales(ctx context.Context, status, afterSaleType int32, keyword string, page *commonv1.PageRequest) (*orderv1.ListAfterSalesResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListAfterSales(ctx, AfterSaleQuery{
		Status:   int8(status),
		Type:     int8(afterSaleType),
		Keyword:  strings.TrimSpace(keyword),
		Page:     pageNum,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询售后单失败", err)
	}
	out := make([]*orderv1.AfterSale, 0, len(list))
	for i := range list {
		out = append(out, afterSaleToProto(&list[i]))
	}
	return &orderv1.ListAfterSalesResponse{AfterSales: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// SetAfterSaleStatus 后台审核售后单，按状态机流转。
//
// 允许的流转：待审核 → 审核通过 / 审核驳回，审核通过 → 已退款，已退款 → 已完成。
// 重复设置同一状态按幂等处理；其余流转一律拒绝。
func (s *Service) SetAfterSaleStatus(ctx context.Context, id int64, status int32, adminRemark string) (*orderv1.AfterSale, error) {
	if id <= 0 {
		return nil, errs.Invalid("售后单 ID 不能为空")
	}
	target := int8(status)
	switch target {
	case AfterSalePending, AfterSaleApproved, AfterSaleRejected, AfterSaleRefunded, AfterSaleCompleted:
	default:
		return nil, errs.Invalid("售后单状态不合法")
	}

	afterSale, err := s.repo.FindAfterSale(ctx, uint64(id))
	if err != nil {
		return nil, err
	}

	changed := target != afterSale.Status
	if changed {
		allowed := afterSaleTransitions[afterSale.Status]
		ok := false
		for _, next := range allowed {
			if next == target {
				ok = true
				break
			}
		}
		if !ok {
			return nil, errs.New(errs.CodeOrderStatusInvalid,
				"售后单当前状态不允许流转到目标状态")
		}
	}

	now := time.Now()
	fields := map[string]any{"status": target}
	remark := strings.TrimSpace(adminRemark)
	if remark != "" {
		fields["admin_remark"] = remark
	}
	if target != AfterSalePending {
		fields["processed_at"] = &now
	}
	if err := s.repo.UpdateAfterSaleFields(ctx, afterSale.ID, fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新售后单失败", err)
	}

	// 审核结果同步到关联订单：审核通过进入退款中，已退款则累计退款金额并置为已退款。
	// 重复提交同一状态时不重复同步订单，避免退款金额被重复累计。
	if changed {
		s.syncAfterSaleToOrder(ctx, afterSale, target, remark)
	}

	updated, err := s.repo.FindAfterSale(ctx, afterSale.ID)
	if err != nil {
		return nil, err
	}
	return afterSaleToProto(updated), nil
}

// syncAfterSaleToOrder 把售后单状态同步到关联订单并记录状态流转日志。
func (s *Service) syncAfterSaleToOrder(ctx context.Context, afterSale *AfterSale, target int8, remark string) {
	order, err := s.repo.FindOrder(ctx, afterSale.OrderID)
	if err != nil {
		return
	}

	action := "after_sale_update"
	orderStatus := order.Status
	orderFields := map[string]any{}

	switch target {
	case AfterSaleApproved:
		action = "after_sale_approved"
		if order.Status == StatusPaid || order.Status == StatusShipped || order.Status == StatusCompleted {
			orderStatus = StatusRefunding
			orderFields["status"] = orderStatus
		}
	case AfterSaleRejected:
		action = "after_sale_rejected"
		if order.Status == StatusRefunding {
			orderStatus = StatusPaid
			orderFields["status"] = orderStatus
		}
	case AfterSaleRefunded:
		action = "after_sale_refunded"
		refunded := order.RefundedCents + afterSale.AmountCents
		if refunded > order.PayableCents {
			refunded = order.PayableCents
		}
		orderFields["refunded_cents"] = refunded
		orderStatus = StatusRefunded
		orderFields["status"] = orderStatus
	case AfterSaleCompleted:
		action = "after_sale_completed"
	}

	if len(orderFields) > 0 {
		if err := s.repo.UpdateOrderFields(ctx, order.ID, orderFields); err != nil {
			return
		}
	}
	if action == "after_sale_update" {
		return
	}
	logRemark := remark
	if logRemark == "" {
		logRemark = "售后单状态更新：" + afterSaleStatusName(target)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID:    order.ID,
		FromStatus: order.Status,
		ToStatus:   orderStatus,
		Action:     action,
		Operator:   "admin",
		Remark:     logRemark,
	})
}

// SaveRefundReason 保存退款原因（新增或更新）。
func (s *Service) SaveRefundReason(ctx context.Context, req *orderv1.SaveRefundReasonRequest) (*orderv1.RefundReason, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("退款原因名称不能为空")
	}
	reasonType := int8(req.GetType())
	if reasonType <= 0 {
		reasonType = AfterSaleTypeRefund
	}
	if reasonType < AfterSaleTypeRefund || reasonType > AfterSaleTypeExchange {
		return nil, errs.Invalid("退款原因类型不合法")
	}

	id := uint64(req.GetId())
	if id > 0 {
		if _, err := s.repo.FindRefundReason(ctx, id); err != nil {
			return nil, err
		}
	}
	dup, err := s.repo.FindRefundReasonByName(ctx, name, reasonType, id)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询退款原因失败", err)
	}
	if dup != nil {
		return nil, errs.Conflict("同名同类型的退款原因已存在")
	}

	reason := &RefundReason{
		ID:      id,
		Name:    name,
		Type:    reasonType,
		Sort:    req.GetSort(),
		Enabled: req.GetEnabled(),
	}
	if err := s.repo.SaveRefundReason(ctx, reason); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存退款原因失败", err)
	}
	saved, err := s.repo.FindRefundReason(ctx, reason.ID)
	if err != nil {
		return nil, err
	}
	return refundReasonToProto(saved), nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func afterSaleToProto(a *AfterSale) *orderv1.AfterSale {
	if a == nil {
		return nil
	}
	return &orderv1.AfterSale{
		Id:           int64(a.ID),
		AfterSaleNo:  a.AfterSaleNo,
		OrderId:      int64(a.OrderID),
		OrderNo:      a.OrderNo,
		UserId:       int64(a.UserID),
		UserNickname: a.UserNickname,
		Type:         int32(a.Type),
		AmountCents:  a.AmountCents,
		Reason:       a.Reason,
		Description:  a.Description,
		ItemIds:      parseItemIDs(a.ItemIDs),
		Status:       int32(a.Status),
		AdminRemark:  a.AdminRemark,
		RefundId:     int64(a.RefundID),
		CreatedAt:    timestamppb.New(a.CreatedAt),
		ProcessedAt:  tsPtr(a.ProcessedAt),
	}
}

func refundReasonToProto(rr *RefundReason) *orderv1.RefundReason {
	if rr == nil {
		return nil
	}
	return &orderv1.RefundReason{
		Id:      int64(rr.ID),
		Name:    rr.Name,
		Type:    int32(rr.Type),
		Sort:    rr.Sort,
		Enabled: rr.Enabled,
	}
}

// parseItemIDs 解析售后单的商品项 ID 列表，兼容 JSON 数组与逗号分隔两种写法。
func parseItemIDs(raw string) []int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if strings.HasPrefix(raw, "[") {
		var ids []int64
		if err := json.Unmarshal([]byte(raw), &ids); err == nil {
			return ids
		}
	}
	parts := strings.Split(raw, ",")
	out := make([]int64, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		id, err := strconv.ParseInt(p, 10, 64)
		if err != nil {
			continue
		}
		out = append(out, id)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// afterSaleStatusName 返回售后单状态的中文名称。
func afterSaleStatusName(status int8) string {
	switch status {
	case AfterSalePending:
		return "待审核"
	case AfterSaleApproved:
		return "审核通过"
	case AfterSaleRejected:
		return "审核驳回"
	case AfterSaleRefunded:
		return "已退款"
	case AfterSaleCompleted:
		return "已完成"
	default:
		return "未知状态"
	}
}
