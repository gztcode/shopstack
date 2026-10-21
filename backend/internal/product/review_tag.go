package product

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// ReviewTag 是评价标签模型。
type ReviewTag struct {
	ID   uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name string `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Sort int    `gorm:"not null;default:0" json:"sort"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled bool `gorm:"tinyint;not null" json:"enabled"`
}

// TableName 指定表名。
func (ReviewTag) TableName() string { return "review_tags" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListReviewTags 分页查询评价标签。
func (r *Repo) ListReviewTags(ctx context.Context, keyword string, page, pageSize int) ([]ReviewTag, int64, error) {
	tx := r.db.WithContext(ctx).Model(&ReviewTag{})
	if keyword != "" {
		tx = tx.Where("name LIKE ?", "%"+keyword+"%")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []ReviewTag
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindReviewTagByID 按 ID 查询评价标签。
func (r *Repo) FindReviewTagByID(ctx context.Context, id uint64) (*ReviewTag, error) {
	var t ReviewTag
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "评价标签不存在")
		}
		return nil, err
	}
	return &t, nil
}

// SaveReviewTag 新增或更新评价标签。
func (r *Repo) SaveReviewTag(ctx context.Context, t *ReviewTag) error {
	return r.db.WithContext(ctx).Save(t).Error
}

// DeleteReviewTag 删除评价标签。
func (r *Repo) DeleteReviewTag(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&ReviewTag{}, id).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListReviewTags 分页查询评价标签。
func (s *Service) ListReviewTags(ctx context.Context, req *productv1.ListReviewTagsRequest) (*productv1.ListReviewTagsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListReviewTags(ctx, strings.TrimSpace(req.GetKeyword()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询评价标签失败", err)
	}

	out := make([]*productv1.ReviewTag, 0, len(list))
	for i := range list {
		out = append(out, reviewTagToProto(&list[i]))
	}
	return &productv1.ListReviewTagsResponse{Tags: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveReviewTag 新增或更新评价标签。
func (s *Service) SaveReviewTag(ctx context.Context, req *productv1.SaveReviewTagRequest) (*productv1.ReviewTag, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("评价标签名称不能为空")
	}

	var t *ReviewTag
	if req.GetId() > 0 {
		existing, err := s.repo.FindReviewTagByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		t = existing
	} else {
		t = &ReviewTag{}
	}

	t.Name = name
	t.Sort = int(req.GetSort())
	t.Enabled = req.GetEnabled()

	if err := s.repo.SaveReviewTag(ctx, t); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存评价标签失败", err)
	}

	saved, err := s.repo.FindReviewTagByID(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	return reviewTagToProto(saved), nil
}

// DeleteReviewTag 删除评价标签。
func (s *Service) DeleteReviewTag(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.Invalid("评价标签 ID 不能为空")
	}
	if _, err := s.repo.FindReviewTagByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteReviewTag(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除评价标签失败", err)
	}
	return nil
}

func reviewTagToProto(t *ReviewTag) *productv1.ReviewTag {
	if t == nil {
		return nil
	}
	return &productv1.ReviewTag{
		Id:      int64(t.ID),
		Name:    t.Name,
		Sort:    int32(t.Sort),
		Enabled: t.Enabled,
	}
}
