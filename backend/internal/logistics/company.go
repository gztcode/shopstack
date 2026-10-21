package logistics

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// LogisticsCompany 是快递公司模型。
type LogisticsCompany struct {
	ID    uint64 `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"column:name;type:varchar(64);not null;default:''" json:"name"`
	Code  string `gorm:"column:code;type:varchar(32);not null;default:'';uniqueIndex" json:"code"`
	Logo  string `gorm:"column:logo;type:varchar(512);not null;default:''" json:"logo"`
	Phone string `gorm:"column:phone;type:varchar(32);not null;default:''" json:"phone"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled     bool  `gorm:"column:enabled;not null" json:"enabled"`
	Sort        int32 `gorm:"column:sort;not null;default:0" json:"sort"`
	SupportsCod bool  `gorm:"column:supports_cod;not null;default:false" json:"supports_cod"`
}

// TableName 指定表名。
func (LogisticsCompany) TableName() string { return "logistics_companies" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListLogisticsCompanies 分页查询快递公司，按展示顺序排序。
func (r *Repo) ListLogisticsCompanies(ctx context.Context, keyword string, page, pageSize int) ([]LogisticsCompany, int64, error) {
	tx := r.db.WithContext(ctx).Model(&LogisticsCompany{})
	if keyword != "" {
		like := "%" + keyword + "%"
		tx = tx.Where("name LIKE ? OR code LIKE ?", like, like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []LogisticsCompany
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindLogisticsCompany 按 ID 查询快递公司。
func (r *Repo) FindLogisticsCompany(ctx context.Context, id uint64) (*LogisticsCompany, error) {
	var c LogisticsCompany
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "快递公司不存在")
		}
		return nil, err
	}
	return &c, nil
}

// FindLogisticsCompanyByCode 按编码查询快递公司，用于查重。
func (r *Repo) FindLogisticsCompanyByCode(ctx context.Context, code string, excludeID uint64) (*LogisticsCompany, error) {
	tx := r.db.WithContext(ctx).Model(&LogisticsCompany{}).Where("code = ?", code)
	if excludeID > 0 {
		tx = tx.Where("id <> ?", excludeID)
	}
	var c LogisticsCompany
	if err := tx.First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// SaveLogisticsCompany 新增或更新快递公司。
func (r *Repo) SaveLogisticsCompany(ctx context.Context, c *LogisticsCompany) error {
	if c.ID == 0 {
		return r.db.WithContext(ctx).Create(c).Error
	}
	return r.db.WithContext(ctx).Model(&LogisticsCompany{}).Where("id = ?", c.ID).
		Updates(map[string]any{
			"name":         c.Name,
			"code":         c.Code,
			"logo":         c.Logo,
			"phone":        c.Phone,
			"enabled":      c.Enabled,
			"sort":         c.Sort,
			"supports_cod": c.SupportsCod,
		}).Error
}

// DeleteLogisticsCompany 删除快递公司。
func (r *Repo) DeleteLogisticsCompany(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&LogisticsCompany{}, id).Error
}

// CountShipmentsByCompany 统计引用某个快递公司的发货单数量。
//
// 发货单上同时记录了快递公司名称与编码，两者任一命中即视为被引用。
func (r *Repo) CountShipmentsByCompany(ctx context.Context, code, name string) (int64, error) {
	tx := r.db.WithContext(ctx).Model(&Shipment{})
	matched := false
	if code != "" {
		tx = tx.Where("company_code = ?", code)
		matched = true
	}
	if name != "" {
		if matched {
			tx = tx.Or("company = ?", name)
		} else {
			tx = tx.Where("company = ?", name)
		}
		matched = true
	}
	if !matched {
		return 0, nil
	}
	var count int64
	err := tx.Count(&count).Error
	return count, err
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListLogisticsCompanies 查询快递公司列表。
func (s *Service) ListLogisticsCompanies(ctx context.Context, req *logisticsv1.ListLogisticsCompaniesRequest) (*logisticsv1.ListLogisticsCompaniesResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListLogisticsCompanies(ctx, strings.TrimSpace(req.GetKeyword()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询快递公司失败", err)
	}
	out := make([]*logisticsv1.LogisticsCompany, 0, len(list))
	for i := range list {
		out = append(out, logisticsCompanyToProto(&list[i]))
	}
	return &logisticsv1.ListLogisticsCompaniesResponse{Companies: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveLogisticsCompany 新增或更新快递公司。
func (s *Service) SaveLogisticsCompany(ctx context.Context, req *logisticsv1.SaveLogisticsCompanyRequest) (*logisticsv1.LogisticsCompany, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "快递公司名称不能为空")
	}
	code := strings.TrimSpace(req.GetCode())
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "快递公司编码不能为空")
	}

	id := uint64(req.GetId())
	if id > 0 {
		if _, err := s.repo.FindLogisticsCompany(ctx, id); err != nil {
			return nil, err
		}
	}
	dup, err := s.repo.FindLogisticsCompanyByCode(ctx, code, id)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询快递公司失败", err)
	}
	if dup != nil {
		return nil, errs.Conflict("该快递公司编码已存在")
	}

	company := &LogisticsCompany{
		ID:          id,
		Name:        name,
		Code:        code,
		Logo:        strings.TrimSpace(req.GetLogo()),
		Phone:       strings.TrimSpace(req.GetPhone()),
		Enabled:     req.GetEnabled(),
		Sort:        req.GetSort(),
		SupportsCod: req.GetSupportsCod(),
	}
	if err := s.repo.SaveLogisticsCompany(ctx, company); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存快递公司失败", err)
	}
	saved, err := s.repo.FindLogisticsCompany(ctx, company.ID)
	if err != nil {
		return nil, err
	}
	return logisticsCompanyToProto(saved), nil
}

// DeleteLogisticsCompany 删除快递公司。
//
// 已被发货单引用的快递公司不允许删除，避免历史发货单失去快递信息。
func (s *Service) DeleteLogisticsCompany(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "快递公司 ID 不能为空")
	}
	company, err := s.repo.FindLogisticsCompany(ctx, uint64(id))
	if err != nil {
		return err
	}
	used, err := s.repo.CountShipmentsByCompany(ctx, company.Code, company.Name)
	if err != nil {
		return errs.Wrap(errs.CodeInternalError, "查询发货单引用失败", err)
	}
	if used > 0 {
		return errs.New(errs.CodeConflict, "该快递公司已被发货单引用，无法删除").
			WithDetail("shipment_count", formatInt64(used))
	}
	if err := s.repo.DeleteLogisticsCompany(ctx, company.ID); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除快递公司失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func logisticsCompanyToProto(c *LogisticsCompany) *logisticsv1.LogisticsCompany {
	if c == nil {
		return nil
	}
	return &logisticsv1.LogisticsCompany{
		Id:          int64(c.ID),
		Name:        c.Name,
		Code:        c.Code,
		Logo:        c.Logo,
		Phone:       c.Phone,
		Enabled:     c.Enabled,
		Sort:        c.Sort,
		SupportsCod: c.SupportsCod,
	}
}
