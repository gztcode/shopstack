package product

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Guarantee 是商品保障项模型。
type Guarantee struct {
	ID          uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Icon        string `gorm:"type:varchar(512);not null;default:''" json:"icon"`
	Description string `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Sort        int    `gorm:"not null;default:0" json:"sort"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled bool `gorm:"tinyint;not null" json:"enabled"`
}

// TableName 指定表名。
func (Guarantee) TableName() string { return "guarantees" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListGuarantees 分页查询商品保障项。
func (r *Repo) ListGuarantees(ctx context.Context, page, pageSize int) ([]Guarantee, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Guarantee{})

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Guarantee
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindGuaranteeByID 按 ID 查询商品保障项。
func (r *Repo) FindGuaranteeByID(ctx context.Context, id uint64) (*Guarantee, error) {
	var g Guarantee
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&g).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "商品保障项不存在")
		}
		return nil, err
	}
	return &g, nil
}

// SaveGuarantee 新增或更新商品保障项。
func (r *Repo) SaveGuarantee(ctx context.Context, g *Guarantee) error {
	return r.db.WithContext(ctx).Save(g).Error
}

// DeleteGuarantee 删除商品保障项。
func (r *Repo) DeleteGuarantee(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Guarantee{}, id).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListGuarantees 分页查询商品保障项。
func (s *Service) ListGuarantees(ctx context.Context, req *productv1.ListGuaranteesRequest) (*productv1.ListGuaranteesResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListGuarantees(ctx, page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品保障项失败", err)
	}

	out := make([]*productv1.Guarantee, 0, len(list))
	for i := range list {
		out = append(out, guaranteeToProto(&list[i]))
	}
	return &productv1.ListGuaranteesResponse{Guarantees: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveGuarantee 新增或更新商品保障项。
func (s *Service) SaveGuarantee(ctx context.Context, req *productv1.SaveGuaranteeRequest) (*productv1.Guarantee, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("商品保障项名称不能为空")
	}

	var g *Guarantee
	if req.GetId() > 0 {
		existing, err := s.repo.FindGuaranteeByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		g = existing
	} else {
		g = &Guarantee{}
	}

	g.Name = name
	g.Icon = req.GetIcon()
	g.Description = req.GetDescription()
	g.Sort = int(req.GetSort())
	g.Enabled = req.GetEnabled()

	if err := s.repo.SaveGuarantee(ctx, g); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存商品保障项失败", err)
	}

	saved, err := s.repo.FindGuaranteeByID(ctx, g.ID)
	if err != nil {
		return nil, err
	}
	return guaranteeToProto(saved), nil
}

// DeleteGuarantee 删除商品保障项。
func (s *Service) DeleteGuarantee(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.Invalid("商品保障项 ID 不能为空")
	}
	if _, err := s.repo.FindGuaranteeByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteGuarantee(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除商品保障项失败", err)
	}
	return nil
}

func guaranteeToProto(g *Guarantee) *productv1.Guarantee {
	if g == nil {
		return nil
	}
	return &productv1.Guarantee{
		Id:          int64(g.ID),
		Name:        g.Name,
		Icon:        g.Icon,
		Description: g.Description,
		Sort:        int32(g.Sort),
		Enabled:     g.Enabled,
	}
}
