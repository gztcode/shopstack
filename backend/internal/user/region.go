package user

import (
	"context"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Region 是行政区域模型。
type Region struct {
	ID       uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ParentID uint64 `gorm:"column:parent_id;not null;default:0;index" json:"parent_id"`
	Name     string `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Code     string `gorm:"type:varchar(32);not null;default:''" json:"code"`
	Level    int8   `gorm:"not null;default:1" json:"level"`
	Sort     int    `gorm:"not null;default:0" json:"sort"`
}

// TableName 指定表名。
func (Region) TableName() string { return "regions" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListRegions 查询行政区域，parentID 为 0 时返回顶级区域。
func (r *Repo) ListRegions(ctx context.Context, parentID uint64) ([]Region, error) {
	var list []Region
	err := r.db.WithContext(ctx).Where("parent_id = ?", parentID).
		Order("level ASC, sort ASC, id ASC").Find(&list).Error
	return list, err
}

// ListAllRegions 返回全部行政区域，按层级、排序号与 ID 升序。
func (r *Repo) ListAllRegions(ctx context.Context) ([]Region, error) {
	var list []Region
	err := r.db.WithContext(ctx).Order("level ASC, sort ASC, id ASC").Find(&list).Error
	return list, err
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListRegions 查询行政区域。
//
// parent_id 为 0 时返回省级区域，指定 parent_id 时返回其下级区域；
// tree 为 true 时返回完整区域列表，供前端渲染级联选择器。
func (s *Service) ListRegions(ctx context.Context, req *userv1.ListRegionsRequest) (*userv1.ListRegionsResponse, error) {
	var (
		list []Region
		err  error
	)
	if req.GetTree() {
		list, err = s.repo.ListAllRegions(ctx)
	} else {
		parentID := uint64(0)
		if req.GetParentId() > 0 {
			parentID = uint64(req.GetParentId())
		}
		list, err = s.repo.ListRegions(ctx, parentID)
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询行政区域失败", err)
	}

	out := make([]*userv1.Region, 0, len(list))
	for i := range list {
		out = append(out, regionToProto(&list[i]))
	}
	return &userv1.ListRegionsResponse{Regions: out}, nil
}
