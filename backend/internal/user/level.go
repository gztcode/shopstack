package user

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// UserLevel 是会员等级模型。
type UserLevel struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name            string    `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Level           int       `gorm:"column:level;not null;default:1" json:"level"`
	MinGrowth       int       `gorm:"column:min_growth;not null;default:0" json:"min_growth"`
	MaxGrowth       int       `gorm:"column:max_growth;not null;default:0" json:"max_growth"`
	DiscountPercent int       `gorm:"column:discount_percent;not null;default:100" json:"discount_percent"`
	Icon            string    `gorm:"type:varchar(512);not null;default:''" json:"icon"`
	Description     string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Benefits        string    `gorm:"type:varchar(1024);not null;default:''" json:"benefits"`
	Sort            int       `gorm:"not null;default:0" json:"sort"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (UserLevel) TableName() string { return "user_levels" }

// GrowthLog 是用户成长值流水模型。
type GrowthLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Change    int       `gorm:"column:change;not null;default:0" json:"change"`
	Balance   int       `gorm:"not null;default:0" json:"balance"`
	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名。
func (GrowthLog) TableName() string { return "user_growth_logs" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListUserLevels 返回全部会员等级，按成长值门槛升序排列。
func (r *Repo) ListUserLevels(ctx context.Context) ([]UserLevel, error) {
	var list []UserLevel
	err := r.db.WithContext(ctx).Order("min_growth ASC, level ASC").Find(&list).Error
	return list, err
}

// FindUserLevelByID 按 ID 查询会员等级。
func (r *Repo) FindUserLevelByID(ctx context.Context, id uint64) (*UserLevel, error) {
	var l UserLevel
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&l).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "会员等级不存在")
		}
		return nil, err
	}
	return &l, nil
}

// UserLevelLevelExists 判断等级序号是否已被占用，excludeID 用于更新时排除自身。
func (r *Repo) UserLevelLevelExists(ctx context.Context, level int, excludeID uint64) (bool, error) {
	q := r.db.WithContext(ctx).Model(&UserLevel{}).Where("level = ?", level)
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// CreateUserLevel 新增会员等级。
func (r *Repo) CreateUserLevel(ctx context.Context, l *UserLevel) error {
	return r.db.WithContext(ctx).Create(l).Error
}

// UpdateUserLevel 更新会员等级字段。
func (r *Repo) UpdateUserLevel(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&UserLevel{}).Where("id = ?", id).Updates(fields).Error
}

// ListGrowthLogs 分页查询成长值流水。
//
// userID 为 0 表示不限用户（后台管理端查看全量）。
func (r *Repo) ListGrowthLogs(ctx context.Context, userID uint64, page, pageSize int) ([]GrowthLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&GrowthLog{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []GrowthLog
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// UserGrowth 汇总用户当前成长值（全部流水变动之和）。
func (r *Repo) UserGrowth(ctx context.Context, userID uint64) (int, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&GrowthLog{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(`change`), 0) AS total").
		Scan(&total).Error
	if err != nil {
		return 0, err
	}
	return int(total), nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetUserLevel 查询用户当前的会员等级与升级进度。
func (s *Service) GetUserLevel(ctx context.Context, userID int64) (*userv1.UserLevelInfo, error) {
	levels, err := s.repo.ListUserLevels(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询会员等级失败", err)
	}
	growth, err := s.repo.UserGrowth(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户成长值失败", err)
	}

	info := &userv1.UserLevelInfo{
		Growth: int32(growth),
		Levels: userLevelsToProto(levels),
	}
	current, next := resolveLevelPair(levels, growth)
	if current != nil {
		info.Level = int32(current.Level)
		info.LevelName = current.Name
		info.CurrentMinGrowth = int32(current.MinGrowth)
		info.DiscountPercent = int32(current.DiscountPercent)
	}
	if next != nil {
		info.NextMinGrowth = int32(next.MinGrowth)
		info.NextLevelName = next.Name
		info.GrowthToNext = int32(next.MinGrowth - growth)
	}
	return info, nil
}

// ListUserLevels 查询全部会员等级，供用户端展示等级阶梯。
func (s *Service) ListUserLevels(ctx context.Context) (*userv1.ListUserLevelsResponse, error) {
	levels, err := s.repo.ListUserLevels(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询会员等级失败", err)
	}
	return &userv1.ListUserLevelsResponse{Levels: userLevelsToProto(levels)}, nil
}

// ListGrowthLogs 分页查询成长值流水。
//
// userID 为 0 表示不限用户（后台管理端查看全量）。
func (s *Service) ListGrowthLogs(ctx context.Context, userID int64, page *commonv1.PageRequest) (*userv1.ListGrowthLogsResponse, error) {
	pageNum, pageSize := normalizePage(page)
	logs, total, err := s.repo.ListGrowthLogs(ctx, uint64(userID), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询成长值流水失败", err)
	}
	// 管理员查看全量时没有单一归属用户，当前成长值置 0。
	growth := 0
	if userID > 0 {
		growth, err = s.repo.UserGrowth(ctx, uint64(userID))
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询用户成长值失败", err)
		}
	}

	out := make([]*userv1.GrowthLog, 0, len(logs))
	for i := range logs {
		out = append(out, &userv1.GrowthLog{
			Id:        int64(logs[i].ID),
			UserId:    int64(logs[i].UserID),
			Change:    int32(logs[i].Change),
			Balance:   int32(logs[i].Balance),
			Title:     logs[i].Title,
			BizType:   logs[i].BizType,
			CreatedAt: tsPtr(&logs[i].CreatedAt),
		})
	}
	return &userv1.ListGrowthLogsResponse{
		Logs:          out,
		Meta:          buildMeta(pageNum, pageSize, total),
		CurrentGrowth: int32(growth),
	}, nil
}

// AdminSaveUserLevel 后台新增或更新会员等级。
func (s *Service) AdminSaveUserLevel(ctx context.Context, req *userv1.SaveUserLevelRequest) (*userv1.UserLevel, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("等级名称不能为空")
	}
	if req.GetLevel() <= 0 {
		return nil, errs.Invalid("等级序号必须大于 0")
	}
	if req.GetMinGrowth() < 0 {
		return nil, errs.Invalid("成长值下限不能为负数")
	}
	if req.GetMaxGrowth() < req.GetMinGrowth() {
		return nil, errs.Invalid("成长值上限不能小于下限")
	}
	if req.GetDiscountPercent() <= 0 || req.GetDiscountPercent() > 100 {
		return nil, errs.Invalid("折扣百分比需在 1~100 之间")
	}
	if req.GetSort() < 0 {
		return nil, errs.Invalid("排序值不能为负数")
	}

	exists, err := s.repo.UserLevelLevelExists(ctx, int(req.GetLevel()), uint64(req.GetId()))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "校验会员等级失败", err)
	}
	if exists {
		return nil, errs.New(errs.CodeConflict, "该等级序号已被占用")
	}

	benefits := encodeStringArray(req.GetBenefits())
	level := &UserLevel{
		ID:              uint64(req.GetId()),
		Name:            name,
		Level:           int(req.GetLevel()),
		MinGrowth:       int(req.GetMinGrowth()),
		MaxGrowth:       int(req.GetMaxGrowth()),
		DiscountPercent: int(req.GetDiscountPercent()),
		Icon:            strings.TrimSpace(req.GetIcon()),
		Description:     strings.TrimSpace(req.GetDescription()),
		Benefits:        benefits,
		Sort:            int(req.GetSort()),
	}

	if level.ID == 0 {
		if err := s.repo.CreateUserLevel(ctx, level); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "创建会员等级失败", err)
		}
	} else {
		if _, err := s.repo.FindUserLevelByID(ctx, level.ID); err != nil {
			return nil, err
		}
		fields := map[string]any{
			"name":             level.Name,
			"level":            level.Level,
			"min_growth":       level.MinGrowth,
			"max_growth":       level.MaxGrowth,
			"discount_percent": level.DiscountPercent,
			"icon":             level.Icon,
			"description":      level.Description,
			"benefits":         level.Benefits,
			"sort":             level.Sort,
		}
		if err := s.repo.UpdateUserLevel(ctx, level.ID, fields); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "更新会员等级失败", err)
		}
	}

	updated, err := s.repo.FindUserLevelByID(ctx, level.ID)
	if err != nil {
		return nil, err
	}
	return userLevelToProto(updated), nil
}

// resolveLevelPair 依据成长值定位当前等级与下一等级。
// 等级按 min_growth 升序排列：取最后一个门槛不超过当前成长值的等级作为当前等级，
// 其后一个等级即下一等级；已超过最高等级时当前等级为顶级且没有下一等级。
func resolveLevelPair(levels []UserLevel, growth int) (*UserLevel, *UserLevel) {
	if len(levels) == 0 {
		return nil, nil
	}
	current := 0
	for i := range levels {
		if levels[i].MinGrowth <= growth {
			current = i
			continue
		}
		break
	}
	cur := &levels[current]
	if current+1 < len(levels) {
		return cur, &levels[current+1]
	}
	return cur, nil
}

// fillUserGrowth 填充用户消息中的成长值与当前会员等级。
//
// 查询失败不影响主流程，仅记录日志，避免等级计算问题阻断资料返回。
func (s *Service) fillUserGrowth(ctx context.Context, u *userv1.User, userID int64) {
	if u == nil {
		return
	}
	growth, err := s.repo.UserGrowth(ctx, uint64(userID))
	if err != nil {
		logger.L().Warn("查询用户成长值失败", zap.Error(err))
		return
	}
	u.Growth = int32(growth)

	levels, err := s.repo.ListUserLevels(ctx)
	if err != nil {
		logger.L().Warn("查询会员等级失败", zap.Error(err))
		return
	}
	current, _ := resolveLevelPair(levels, growth)
	if current != nil {
		u.Level = int32(current.Level)
	}
}
