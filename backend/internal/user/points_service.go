package user

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// ListPointsLogs 查询积分明细。
func (s *Service) ListPointsLogs(ctx context.Context, userID int64, page *commonv1.PageRequest) (*userv1.ListPointsLogsResponse, error) {
	if userID <= 0 {
		userID = auth.UserIDFromContext(ctx)
	}
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}

	pageNum, pageSize := normalizePage(page)
	logs, total, err := s.repo.ListPointsLogs(ctx, uint64(userID), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询积分明细失败", err)
	}

	out := make([]*userv1.PointsLog, 0, len(logs))
	for i := range logs {
		out = append(out, &userv1.PointsLog{
			Id:        int64(logs[i].ID),
			UserId:    int64(logs[i].UserID),
			Title:     logs[i].Title,
			Change:    int32(logs[i].Change),
			Balance:   int32(logs[i].Balance),
			BizType:   logs[i].BizType,
			BizId:     logs[i].BizID,
			CreatedAt: timestamppb.New(logs[i].CreatedAt),
		})
	}

	currentPoints := int32(0)
	if u, uErr := s.repo.FindUserByID(ctx, uint64(userID)); uErr == nil {
		currentPoints = int32(u.Points)
	}

	return &userv1.ListPointsLogsResponse{
		Logs:          out,
		Meta:          buildMeta(pageNum, pageSize, total),
		CurrentPoints: currentPoints,
	}, nil
}

// ListInvoices 查询发票申请。
func (s *Service) ListInvoices(ctx context.Context, userID int64, status int32, page *commonv1.PageRequest) (*userv1.ListInvoicesResponse, error) {
	pageNum, pageSize := normalizePage(page)

	list, total, err := s.repo.ListInvoices(ctx, uint64(userID), int8(status), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发票失败", err)
	}
	out := make([]*userv1.Invoice, 0, len(list))
	for i := range list {
		out = append(out, invoiceToProto(&list[i]))
	}
	return &userv1.ListInvoicesResponse{Invoices: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// CreateInvoice 申请开票。
func (s *Service) CreateInvoice(ctx context.Context, req *userv1.CreateInvoiceRequest) (*userv1.Invoice, error) {
	userID := req.GetUserId()
	if userID <= 0 {
		userID = auth.UserIDFromContext(ctx)
	}
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	if strings.TrimSpace(req.GetTitle()) == "" {
		return nil, errs.Invalid("发票抬头不能为空")
	}
	if req.GetType() == "company" && strings.TrimSpace(req.GetTaxNo()) == "" {
		return nil, errs.Invalid("企业发票必须填写纳税人识别号")
	}
	if strings.TrimSpace(req.GetOrderNo()) == "" {
		return nil, errs.Invalid("请选择需要开票的订单")
	}

	inv := &Invoice{
		UserID:      uint64(userID),
		OrderNo:     req.GetOrderNo(),
		Title:       req.GetTitle(),
		TaxNo:       req.GetTaxNo(),
		Type:        req.GetType(),
		Email:       req.GetEmail(),
		AmountCents: req.GetAmountCents(),
		Status:      InvoicePending,
		Remark:      req.GetRemark(),
	}
	if inv.Type == "" {
		inv.Type = "personal"
	}
	if err := s.repo.CreateInvoice(ctx, inv); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "提交开票申请失败", err)
	}
	return invoiceToProto(inv), nil
}

// SetInvoiceStatus 后台处理发票申请。
func (s *Service) SetInvoiceStatus(ctx context.Context, id int64, status int8, invoiceURL, remark string) (*userv1.Invoice, error) {
	if status != InvoicePending && status != InvoiceIssued && status != InvoiceRejected {
		return nil, errs.Invalid("非法的发票状态")
	}
	inv, err := s.repo.FindInvoice(ctx, uint64(id))
	if err != nil {
		return nil, err
	}

	fields := map[string]any{"status": status}
	if status == InvoiceIssued {
		url := invoiceURL
		if url == "" {
			url = fmt.Sprintf("https://example.com/invoice/%d.pdf", inv.ID)
		}
		fields["invoice_url"] = url
	}
	if remark != "" {
		fields["remark"] = remark
	}
	if err := s.repo.UpdateInvoiceFields(ctx, inv.ID, fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新发票状态失败", err)
	}
	updated, err := s.repo.FindInvoice(ctx, inv.ID)
	if err != nil {
		return nil, err
	}
	return invoiceToProto(updated), nil
}

func invoiceToProto(inv *Invoice) *userv1.Invoice {
	if inv == nil {
		return nil
	}
	return &userv1.Invoice{
		Id:          int64(inv.ID),
		UserId:      int64(inv.UserID),
		OrderNo:     inv.OrderNo,
		Title:       inv.Title,
		TaxNo:       inv.TaxNo,
		Type:        inv.Type,
		Email:       inv.Email,
		AmountCents: inv.AmountCents,
		Status:      int32(inv.Status),
		InvoiceUrl:  inv.InvoiceURL,
		Remark:      inv.Remark,
		CreatedAt:   timestamppb.New(inv.CreatedAt),
	}
}
