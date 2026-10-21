package product

import (
	"context"
	"errors"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Material 是素材库模型。
type Material struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(200);not null;default:''" json:"name"`
	URL       string    `gorm:"type:varchar(512);not null;default:''" json:"url"`
	Type      string    `gorm:"type:varchar(16);not null;default:'image'" json:"type"`
	Size      int64     `gorm:"not null;default:0" json:"size"`
	Folder    string    `gorm:"type:varchar(64);not null;default:'default'" json:"folder"`
	Sort      int       `gorm:"not null;default:0" json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Material) TableName() string { return "product_materials" }

// ListMaterials 分页查询素材。
func (r *Repo) ListMaterials(ctx context.Context, keyword, matType, folder string, page, pageSize int) ([]Material, int64, error) {
	q := r.db.WithContext(ctx).Model(&Material{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("name LIKE ? OR url LIKE ?", like, like)
	}
	if matType != "" {
		q = q.Where("type = ?", matType)
	}
	if folder != "" {
		q = q.Where("folder = ?", folder)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Material
	err := q.Order("sort ASC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// SaveMaterial 新增或更新素材。
func (r *Repo) SaveMaterial(ctx context.Context, m *Material) error {
	return r.db.WithContext(ctx).Save(m).Error
}

// DeleteMaterial 删除素材。
func (r *Repo) DeleteMaterial(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Material{}, id).Error
}

// FindMaterial 按 ID 查询素材。
func (r *Repo) FindMaterial(ctx context.Context, id uint64) (*Material, error) {
	var m Material
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "素材不存在")
		}
		return nil, err
	}
	return &m, nil
}

// ListMaterials 查询素材列表。
func (s *Service) ListMaterials(ctx context.Context, req *productv1.ListMaterialsRequest) (*productv1.ListMaterialsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListMaterials(ctx, req.GetKeyword(), req.GetType(), req.GetFolder(), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询素材失败", err)
	}
	out := make([]*productv1.Material, 0, len(list))
	for i := range list {
		out = append(out, materialToProto(&list[i]))
	}
	return &productv1.ListMaterialsResponse{Materials: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveMaterial 保存素材。
func (s *Service) SaveMaterial(ctx context.Context, req *productv1.SaveMaterialRequest) (*productv1.Material, error) {
	if req.GetUrl() == "" {
		return nil, errs.Invalid("素材地址不能为空")
	}
	m := &Material{
		ID:     uint64(req.GetId()),
		Name:   req.GetName(),
		URL:    req.GetUrl(),
		Type:   req.GetType(),
		Size:   req.GetSize(),
		Folder: req.GetFolder(),
		Sort:   int(req.GetSort()),
	}
	if m.Name == "" {
		m.Name = "未命名素材"
	}
	if m.Type == "" {
		m.Type = "image"
	}
	if m.Folder == "" {
		m.Folder = "default"
	}
	if err := s.repo.SaveMaterial(ctx, m); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存素材失败", err)
	}
	return materialToProto(m), nil
}

// DeleteMaterial 删除素材。
func (s *Service) DeleteMaterial(ctx context.Context, id int64) error {
	if _, err := s.repo.FindMaterial(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteMaterial(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除素材失败", err)
	}
	return nil
}

func materialToProto(m *Material) *productv1.Material {
	if m == nil {
		return nil
	}
	return &productv1.Material{
		Id:        int64(m.ID),
		Name:      m.Name,
		Url:       m.URL,
		Type:      m.Type,
		Size:      m.Size,
		Folder:    m.Folder,
		Sort:      int32(m.Sort),
		CreatedAt: timestamppb.New(m.CreatedAt),
	}
}

var _ = commonv1.PageRequest{}
