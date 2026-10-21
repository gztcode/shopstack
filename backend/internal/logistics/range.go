package logistics

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"gorm.io/gorm"

	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// DeliveryRange 是运费模板的配送范围模型。
type DeliveryRange struct {
	ID                     uint64 `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	TemplateID             uint64 `gorm:"column:template_id;not null;index" json:"template_id"`
	Regions                string `gorm:"column:regions;type:varchar(512);not null;default:''" json:"regions"`
	FreightCents           int64  `gorm:"column:freight_cents;not null;default:0" json:"freight_cents"`
	FreeFreightAmountCents int64  `gorm:"column:free_freight_amount_cents;not null;default:0" json:"free_freight_amount_cents"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled bool `gorm:"column:enabled;not null" json:"enabled"`
}

// TableName 指定表名。
func (DeliveryRange) TableName() string { return "delivery_ranges" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListDeliveryRanges 分页查询配送范围。
func (r *Repo) ListDeliveryRanges(ctx context.Context, templateID uint64, page, pageSize int) ([]DeliveryRange, int64, error) {
	tx := r.db.WithContext(ctx).Model(&DeliveryRange{})
	if templateID > 0 {
		tx = tx.Where("template_id = ?", templateID)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []DeliveryRange
	err := tx.Order("template_id ASC, id ASC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindDeliveryRange 按 ID 查询配送范围。
func (r *Repo) FindDeliveryRange(ctx context.Context, id uint64) (*DeliveryRange, error) {
	var d DeliveryRange
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&d).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "配送范围不存在")
		}
		return nil, err
	}
	return &d, nil
}

// ListEnabledDeliveryRanges 查询启用的配送范围，按模板与 ID 升序。
func (r *Repo) ListEnabledDeliveryRanges(ctx context.Context, templateID uint64) ([]DeliveryRange, error) {
	tx := r.db.WithContext(ctx).Model(&DeliveryRange{}).Where("enabled = ?", true)
	if templateID > 0 {
		tx = tx.Where("template_id = ?", templateID)
	}
	var list []DeliveryRange
	err := tx.Order("template_id ASC, id ASC").Find(&list).Error
	return list, err
}

// SaveDeliveryRange 新增或更新配送范围。
func (r *Repo) SaveDeliveryRange(ctx context.Context, d *DeliveryRange) error {
	if d.ID == 0 {
		return r.db.WithContext(ctx).Create(d).Error
	}
	return r.db.WithContext(ctx).Model(&DeliveryRange{}).Where("id = ?", d.ID).
		Updates(map[string]any{
			"template_id":               d.TemplateID,
			"regions":                   d.Regions,
			"freight_cents":             d.FreightCents,
			"free_freight_amount_cents": d.FreeFreightAmountCents,
			"enabled":                   d.Enabled,
		}).Error
}

// ListEnabledTemplates 查询启用的运费模板，按展示顺序排序。
func (r *Repo) ListEnabledTemplates(ctx context.Context) ([]LogisticTemplate, error) {
	var list []LogisticTemplate
	err := r.db.WithContext(ctx).Where("enabled = ?", true).
		Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// TemplateNames 返回模板 ID 到模板名称的映射。
func (r *Repo) TemplateNames(ctx context.Context) (map[uint64]string, error) {
	var list []LogisticTemplate
	if err := r.db.WithContext(ctx).Order("id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	names := make(map[uint64]string, len(list))
	for i := range list {
		names[list[i].ID] = list[i].Name
	}
	return names, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListDeliveryRanges 查询配送范围列表。
func (s *Service) ListDeliveryRanges(ctx context.Context, req *logisticsv1.ListDeliveryRangesRequest) (*logisticsv1.ListDeliveryRangesResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListDeliveryRanges(ctx, uint64(req.GetTemplateId()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询配送范围失败", err)
	}
	names, err := s.repo.TemplateNames(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询运费模板失败", err)
	}
	out := make([]*logisticsv1.DeliveryRange, 0, len(list))
	for i := range list {
		out = append(out, deliveryRangeToProto(&list[i], names[list[i].TemplateID]))
	}
	return &logisticsv1.ListDeliveryRangesResponse{Ranges: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveDeliveryRange 新增或更新配送范围。
func (s *Service) SaveDeliveryRange(ctx context.Context, req *logisticsv1.SaveDeliveryRangeRequest) (*logisticsv1.DeliveryRange, error) {
	templateID := uint64(req.GetTemplateId())
	if templateID == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "运费模板 ID 不能为空")
	}
	template, err := s.repo.FindTemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}
	regions := strings.TrimSpace(req.GetRegions())
	if regions == "" {
		return nil, errs.New(errs.CodeInvalidParam, "适用地区不能为空")
	}
	if req.GetFreightCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "运费不能为负数")
	}
	if req.GetFreeFreightAmountCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "免邮门槛不能为负数")
	}

	id := uint64(req.GetId())
	if id > 0 {
		if _, err := s.repo.FindDeliveryRange(ctx, id); err != nil {
			return nil, err
		}
	}

	dr := &DeliveryRange{
		ID:                     id,
		TemplateID:             templateID,
		Regions:                regions,
		FreightCents:           req.GetFreightCents(),
		FreeFreightAmountCents: req.GetFreeFreightAmountCents(),
		Enabled:                req.GetEnabled(),
	}
	if err := s.repo.SaveDeliveryRange(ctx, dr); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存配送范围失败", err)
	}
	saved, err := s.repo.FindDeliveryRange(ctx, dr.ID)
	if err != nil {
		return nil, err
	}
	return deliveryRangeToProto(saved, template.Name), nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func deliveryRangeToProto(d *DeliveryRange, templateName string) *logisticsv1.DeliveryRange {
	if d == nil {
		return nil
	}
	return &logisticsv1.DeliveryRange{
		Id:                     int64(d.ID),
		TemplateId:             int64(d.TemplateID),
		TemplateName:           templateName,
		Regions:                d.Regions,
		FreightCents:           d.FreightCents,
		FreeFreightAmountCents: d.FreeFreightAmountCents,
		Enabled:                d.Enabled,
	}
}

// formatInt64 把整数格式化为字符串，用于错误详情。
func formatInt64(v int64) string {
	return strconv.FormatInt(v, 10)
}
