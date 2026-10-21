package user

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 发票抬头类型
const (
	InvoiceTemplatePersonal = "personal"
	InvoiceTemplateCompany  = "company"
)

// InvoiceTemplate 是用户发票抬头模板模型。
type InvoiceTemplate struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Title       string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	TaxNo       string    `gorm:"column:tax_no;type:varchar(64);not null;default:''" json:"tax_no"`
	Type        string    `gorm:"type:varchar(16);not null;default:'personal'" json:"type"`
	Email       string    `gorm:"type:varchar(128);not null;default:''" json:"email"`
	Phone       string    `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Address     string    `gorm:"type:varchar(255);not null;default:''" json:"address"`
	BankName    string    `gorm:"column:bank_name;type:varchar(128);not null;default:''" json:"bank_name"`
	BankAccount string    `gorm:"column:bank_account;type:varchar(64);not null;default:''" json:"bank_account"`
	IsDefault   bool      `gorm:"not null;default:false" json:"is_default"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName 指定表名。
func (InvoiceTemplate) TableName() string { return "user_invoice_templates" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListInvoiceTemplates 查询用户的发票抬头模板，默认模板排在最前。
func (r *Repo) ListInvoiceTemplates(ctx context.Context, userID uint64) ([]InvoiceTemplate, error) {
	var list []InvoiceTemplate
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("is_default DESC, id DESC").Find(&list).Error
	return list, err
}

// FindInvoiceTemplate 按 ID 查询属于指定用户的发票抬头模板。
func (r *Repo) FindInvoiceTemplate(ctx context.Context, userID, id uint64) (*InvoiceTemplate, error) {
	var t InvoiceTemplate
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&t).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "发票抬头模板不存在")
		}
		return nil, err
	}
	return &t, nil
}

// CountInvoiceTemplates 统计用户的发票抬头模板数量。
func (r *Repo) CountInvoiceTemplates(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&InvoiceTemplate{}).
		Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// CreateInvoiceTemplate 新增发票抬头模板。
func (r *Repo) CreateInvoiceTemplate(ctx context.Context, t *InvoiceTemplate) error {
	return r.db.WithContext(ctx).Create(t).Error
}

// UpdateInvoiceTemplate 更新发票抬头模板字段。
func (r *Repo) UpdateInvoiceTemplate(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&InvoiceTemplate{}).Where("id = ?", id).Updates(fields).Error
}

// ClearDefaultInvoiceTemplate 清除用户的默认模板标记。
func (r *Repo) ClearDefaultInvoiceTemplate(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).Model(&InvoiceTemplate{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error
}

// SetDefaultInvoiceTemplate 将指定模板设为默认模板。
func (r *Repo) SetDefaultInvoiceTemplate(ctx context.Context, userID, id uint64) error {
	return r.db.WithContext(ctx).Model(&InvoiceTemplate{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_default", true).Error
}

// DeleteInvoiceTemplate 删除发票抬头模板。
func (r *Repo) DeleteInvoiceTemplate(ctx context.Context, userID, id uint64) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).
		Delete(&InvoiceTemplate{}).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListInvoiceTemplates 查询当前用户的发票抬头模板。
func (s *Service) ListInvoiceTemplates(ctx context.Context, userID int64) (*userv1.ListInvoiceTemplatesResponse, error) {
	list, err := s.repo.ListInvoiceTemplates(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发票抬头模板失败", err)
	}
	out := make([]*userv1.InvoiceTemplate, 0, len(list))
	for i := range list {
		out = append(out, invoiceTemplateToProto(&list[i]))
	}
	return &userv1.ListInvoiceTemplatesResponse{Templates: out}, nil
}

// SaveInvoiceTemplate 新增或更新当前用户的发票抬头模板。
func (s *Service) SaveInvoiceTemplate(ctx context.Context, userID int64, req *userv1.SaveInvoiceTemplateRequest) (*userv1.InvoiceTemplate, error) {
	title := strings.TrimSpace(req.GetTitle())
	if title == "" {
		return nil, errs.Invalid("发票抬头不能为空")
	}
	templateType := strings.TrimSpace(req.GetType())
	switch templateType {
	case "":
		templateType = InvoiceTemplatePersonal
	case InvoiceTemplatePersonal, InvoiceTemplateCompany:
	default:
		return nil, errs.Invalid("发票类型仅支持 personal 或 company")
	}
	if templateType == InvoiceTemplateCompany && strings.TrimSpace(req.GetTaxNo()) == "" {
		return nil, errs.Invalid("企业发票必须填写纳税人识别号")
	}
	if email := strings.TrimSpace(req.GetEmail()); email != "" && !strings.Contains(email, "@") {
		return nil, errs.Invalid("接收发票的邮箱格式不正确")
	}

	template := &InvoiceTemplate{
		UserID:      uint64(userID),
		Title:       title,
		TaxNo:       strings.TrimSpace(req.GetTaxNo()),
		Type:        templateType,
		Email:       strings.TrimSpace(req.GetEmail()),
		Phone:       strings.TrimSpace(req.GetPhone()),
		Address:     strings.TrimSpace(req.GetAddress()),
		BankName:    strings.TrimSpace(req.GetBankName()),
		BankAccount: strings.TrimSpace(req.GetBankAccount()),
	}
	fields := map[string]any{
		"title":        template.Title,
		"tax_no":       template.TaxNo,
		"type":         template.Type,
		"email":        template.Email,
		"phone":        template.Phone,
		"address":      template.Address,
		"bank_name":    template.BankName,
		"bank_account": template.BankAccount,
	}

	db := s.repo.DB().WithContext(ctx)
	if req.GetId() > 0 {
		existing, err := s.repo.FindInvoiceTemplate(ctx, uint64(userID), uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		fields["is_default"] = req.GetIsDefault()
		if err := db.Transaction(func(tx *gorm.DB) error {
			if req.GetIsDefault() {
				if err := tx.Model(&InvoiceTemplate{}).Where("user_id = ?", userID).
					Update("is_default", false).Error; err != nil {
					return err
				}
			}
			return tx.Model(&InvoiceTemplate{}).Where("id = ?", existing.ID).
				Updates(fields).Error
		}); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "保存发票抬头模板失败", err)
		}
		updated, err := s.repo.FindInvoiceTemplate(ctx, uint64(userID), existing.ID)
		if err != nil {
			return nil, err
		}
		return invoiceTemplateToProto(updated), nil
	}

	count, err := s.repo.CountInvoiceTemplates(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发票抬头模板失败", err)
	}
	// 首个模板自动设为默认模板。
	template.IsDefault = req.GetIsDefault() || count == 0

	if err := db.Transaction(func(tx *gorm.DB) error {
		if template.IsDefault {
			if err := tx.Model(&InvoiceTemplate{}).Where("user_id = ?", userID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(template).Error
	}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存发票抬头模板失败", err)
	}
	return invoiceTemplateToProto(template), nil
}

// DeleteInvoiceTemplate 删除当前用户的发票抬头模板。
//
// 删除的是默认模板时，会把剩余的模板中最新的一条提升为默认模板。
func (s *Service) DeleteInvoiceTemplate(ctx context.Context, userID, id int64) error {
	existing, err := s.repo.FindInvoiceTemplate(ctx, uint64(userID), uint64(id))
	if err != nil {
		return err
	}

	db := s.repo.DB().WithContext(ctx)
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", existing.ID, userID).
			Delete(&InvoiceTemplate{}).Error; err != nil {
			return err
		}
		if !existing.IsDefault {
			return nil
		}
		var next InvoiceTemplate
		err := tx.Where("user_id = ?", userID).Order("id DESC").First(&next).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		if err != nil {
			return err
		}
		return tx.Model(&InvoiceTemplate{}).Where("id = ?", next.ID).
			Update("is_default", true).Error
	}); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除发票抬头模板失败", err)
	}
	return nil
}
