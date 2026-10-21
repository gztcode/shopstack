package marketing

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 营销任务类型：1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请。
const (
	marketingTaskTypeMin = 1
	marketingTaskTypeMax = 6
)

// MarketingTask 是营销任务定义模型。
type MarketingTask struct {
	ID             uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name           string `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Description    string `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Type           int8   `gorm:"tinyint;not null;default:1" json:"type"`
	TargetCount    int    `gorm:"column:target_count;not null;default:1" json:"target_count"`
	RewardPoints   int    `gorm:"column:reward_points;not null;default:0" json:"reward_points"`
	RewardCouponID uint64 `gorm:"column:reward_coupon_id;not null;default:0" json:"reward_coupon_id"`
	Sort           int    `gorm:"not null;default:0" json:"sort"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled bool   `gorm:"tinyint;not null" json:"enabled"`
	Icon    string `gorm:"type:varchar(512);not null;default:''" json:"icon"`
}

// TableName 指定表名。
func (MarketingTask) TableName() string { return "marketing_tasks" }

// UserTask 是用户任务进度模型。
type UserTask struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64     `gorm:"column:user_id;not null;uniqueIndex:uk_user_task;index" json:"user_id"`
	TaskID      uint64     `gorm:"column:task_id;not null;uniqueIndex:uk_user_task" json:"task_id"`
	Progress    int        `gorm:"not null;default:0" json:"progress"`
	Completed   bool       `gorm:"tinyint;not null;default:0" json:"completed"`
	Claimed     bool       `gorm:"tinyint;not null;default:0" json:"claimed"`
	CompletedAt *time.Time `gorm:"column:completed_at" json:"completed_at"`
	ClaimedAt   *time.Time `gorm:"column:claimed_at" json:"claimed_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

// TableName 指定表名。
func (UserTask) TableName() string { return "user_tasks" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListMarketingTasks 分页查询任务定义。
func (r *Repo) ListMarketingTasks(ctx context.Context, onlyEnabled bool, page, pageSize int) ([]MarketingTask, int64, error) {
	tx := r.db.WithContext(ctx).Model(&MarketingTask{})
	if onlyEnabled {
		tx = tx.Where("enabled = ?", true)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []MarketingTask
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindMarketingTaskByID 按 ID 查询任务定义。
func (r *Repo) FindMarketingTaskByID(ctx context.Context, id uint64) (*MarketingTask, error) {
	var t MarketingTask
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "任务不存在")
		}
		return nil, err
	}
	return &t, nil
}

// ListAdminMarketingTasks 后台分页查询任务定义。
//
// 后台需要看到已下线的任务，因此不过滤 enabled；keyword 按名称模糊匹配，
// 排序沿用用户端的 sort ASC, id ASC 以保证两端顺序一致。
func (r *Repo) ListAdminMarketingTasks(ctx context.Context, keyword string, page, pageSize int) ([]MarketingTask, int64, error) {
	tx := r.db.WithContext(ctx).Model(&MarketingTask{})
	if keyword != "" {
		tx = tx.Where("name LIKE ?", "%"+keyword+"%")
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []MarketingTask
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// SaveMarketingTask 新增或更新任务定义。
//
// 带 ID 时走 upsert，避免并发下"先查再写"的判断与实际写入不一致。
// 更新列用显式赋值而不是 AssignmentColumns：模型上的列都带默认值，
// GORM 会把零值字段（如 enabled=false）从 INSERT 中剔除，
// 改用 VALUES() 引用会读回数据库默认值而不是请求值。
// SaveMarketingTask 新增或更新营销任务。
//
// 更新走 ON DUPLICATE KEY UPDATE 并显式列出赋值列，避免零值字段被 GORM 跳过
// （enabled=false 会被默认的 1 覆盖）。
func (r *Repo) SaveMarketingTask(ctx context.Context, t *MarketingTask) error {
	if t.ID == 0 {
		return r.db.WithContext(ctx).Create(t).Error
	}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.Assignments(map[string]any{
			"name":             t.Name,
			"description":      t.Description,
			"type":             t.Type,
			"target_count":     t.TargetCount,
			"reward_points":    t.RewardPoints,
			"reward_coupon_id": t.RewardCouponID,
			"sort":             t.Sort,
			"enabled":          t.Enabled,
			"icon":             t.Icon,
		}),
	}).Create(t).Error
}

// DeleteMarketingTask 删除任务定义及其用户进度记录（事务内完成）。
//
// 用户进度是任务的附属数据，随任务一并清理，避免留下无法回溯的孤儿记录。
func (r *Repo) DeleteMarketingTask(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("task_id = ?", id).Delete(&UserTask{}).Error; err != nil {
			return err
		}
		return tx.Delete(&MarketingTask{}, id).Error
	})
}

// FindUserTask 查询用户的任务进度，记录不存在时返回 (nil, nil)。
func (r *Repo) FindUserTask(ctx context.Context, userID, taskID uint64) (*UserTask, error) {
	var ut UserTask
	err := r.db.WithContext(ctx).Where("user_id = ? AND task_id = ?", userID, taskID).First(&ut).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &ut, nil
}

// ListUserTasks 查询用户的全部任务进度。
func (r *Repo) ListUserTasks(ctx context.Context, userID uint64) ([]UserTask, error) {
	var list []UserTask
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("task_id ASC").Find(&list).Error
	return list, err
}

// ClaimUserTask 领取任务奖励。
//
// 仅当任务已完成且尚未领取时才会更新，返回受影响的行数；
// 返回 0 表示奖励已被领取（并发场景下的兜底）。
func (r *Repo) ClaimUserTask(ctx context.Context, tx *gorm.DB, id uint64) (int64, error) {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	now := time.Now()
	res := tx.Model(&UserTask{}).
		Where("id = ? AND completed = ? AND claimed = ?", id, true, false).
		Updates(map[string]any{"claimed": true, "claimed_at": &now})
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

// IssueCoupon 在事务内向用户发放一张优惠券。
//
// 校验券的有效期、发放总量与用户的重复领取，发放成功后会累加券的发放数量。
func (r *Repo) IssueCoupon(ctx context.Context, tx *gorm.DB, userID, couponID uint64) error {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	coupon, err := r.FindCouponByID(ctx, couponID)
	if err != nil {
		return err
	}
	now := time.Now()
	if !coupon.Enabled {
		return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券未启用")
	}
	if now.Before(coupon.StartTime) {
		return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券尚未开始领取")
	}
	if now.After(coupon.EndTime) {
		return errs.New(errs.CodeCouponExpired, "任务奖励优惠券已过期")
	}
	if coupon.TotalQuantity > 0 && coupon.ReceivedQuantity >= coupon.TotalQuantity {
		return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券已被领完")
	}

	existing, err := r.FindUserCoupon(ctx, userID, couponID)
	if err != nil {
		return err
	}
	if existing != nil {
		return errs.New(errs.CodeConflict, "您已领取过该优惠券")
	}

	uc := &UserCoupon{
		UserID:     userID,
		CouponID:   couponID,
		Status:     UserCouponStatusUnused,
		ReceivedAt: now,
	}
	if err := tx.Create(uc).Error; err != nil {
		return err
	}
	res := tx.Model(&Coupon{}).Where("id = ?", couponID).
		Where("total_quantity <= 0 OR received_quantity < total_quantity").
		UpdateColumn("received_quantity", gorm.Expr("received_quantity + 1"))
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeCouponUnavailable, "任务奖励优惠券已被领完")
	}
	return nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListTasks 查询任务列表。
//
// 返回任务定义并合并当前用户的进度与完成状态；未登录时只返回任务定义，
// 进度字段保持初始值。
func (s *Service) ListTasks(ctx context.Context, req *marketingv1.ListTasksRequest) (*marketingv1.ListTasksResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListMarketingTasks(ctx, true, page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询任务列表失败", err)
	}

	progress := map[uint64]*UserTask{}
	userID := uint64(resolveUserID(ctx, 0))
	if userID > 0 {
		userTasks, err := s.repo.ListUserTasks(ctx, userID)
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询任务进度失败", err)
		}
		for i := range userTasks {
			progress[userTasks[i].TaskID] = &userTasks[i]
		}
	}

	out := make([]*marketingv1.UserTask, 0, len(list))
	for i := range list {
		out = append(out, userTaskToProto(&list[i], progress[list[i].ID]))
	}
	return &marketingv1.ListTasksResponse{Tasks: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// ClaimTask 领取任务奖励。
//
// 校验任务存在且启用、用户任务已完成且未领取，发放奖励积分（以及奖励优惠券），
// 重复领取会返回业务错误。
func (s *Service) ClaimTask(ctx context.Context, req *marketingv1.ClaimTaskRequest) (*marketingv1.UserTask, error) {
	userID := uint64(resolveUserID(ctx, 0))
	if userID == 0 {
		return nil, errs.Unauthorized("请先登录后再领取奖励")
	}
	if req.GetTaskId() <= 0 {
		return nil, errs.Invalid("任务 ID 不能为空")
	}

	task, err := s.repo.FindMarketingTaskByID(ctx, uint64(req.GetTaskId()))
	if err != nil {
		return nil, err
	}
	if !task.Enabled {
		return nil, errs.Conflict("任务已下线，无法领取奖励")
	}

	userTask, err := s.repo.FindUserTask(ctx, userID, task.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询任务进度失败", err)
	}
	if userTask == nil {
		return nil, errs.Invalid("任务进度不存在，请先完成对应行为")
	}
	if !userTask.Completed {
		return nil, errs.Invalid("任务尚未完成，无法领取奖励")
	}
	if userTask.Claimed {
		return nil, errs.Conflict("任务奖励已领取")
	}

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		rows, err := s.repo.ClaimUserTask(ctx, tx, userTask.ID)
		if err != nil {
			return err
		}
		if rows == 0 {
			return errs.New(errs.CodeConflict, "任务奖励已领取")
		}
		if task.RewardPoints > 0 {
			if err := s.repo.AddPoints(ctx, tx, userID, task.RewardPoints,
				"任务奖励："+task.Name, PointsBizTypeTask, formatTaskBizID(task.ID)); err != nil {
				return err
			}
		}
		if task.RewardCouponID > 0 {
			if err := s.repo.IssueCoupon(ctx, tx, userID, task.RewardCouponID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		if isDuplicateKey(err) {
			return nil, errs.Conflict("任务奖励已领取")
		}
		var bizErr *errs.Error
		if ok := asBizError(err, &bizErr); ok {
			return nil, bizErr
		}
		return nil, errs.Wrap(errs.CodeInternalError, "领取任务奖励失败", err)
	}

	updated, err := s.repo.FindUserTask(ctx, userID, task.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询任务进度失败", err)
	}
	if updated == nil {
		updated = userTask
	}
	return userTaskToProto(task, updated), nil
}

// ---------------------------------------------------------------------------
// 后台任务管理
// ---------------------------------------------------------------------------

// ListAdminMarketingTasks 后台查询营销任务列表。
//
// 与用户端列表的区别是不过滤 enabled，后台需要看到已下线的任务。
func (s *Service) ListAdminMarketingTasks(ctx context.Context, req *marketingv1.ListAdminMarketingTasksRequest) (*marketingv1.ListAdminMarketingTasksResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListAdminMarketingTasks(ctx, strings.TrimSpace(req.GetKeyword()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询营销任务失败", err)
	}
	out := make([]*marketingv1.MarketingTask, 0, len(list))
	for i := range list {
		out = append(out, marketingTaskToProto(&list[i]))
	}
	return &marketingv1.ListAdminMarketingTasksResponse{Tasks: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveMarketingTask 新增或更新营销任务。
//
// 带 ID 时更新已有任务，否则新增。
func (s *Service) SaveMarketingTask(ctx context.Context, req *marketingv1.SaveMarketingTaskRequest) (*marketingv1.MarketingTask, error) {
	task, err := s.buildMarketingTask(ctx, req, false)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SaveMarketingTask(ctx, task); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存营销任务失败", err)
	}
	saved, err := s.repo.FindMarketingTaskByID(ctx, task.ID)
	if err != nil {
		return nil, err
	}
	return marketingTaskToProto(saved), nil
}

// UpdateMarketingTask 更新营销任务。
func (s *Service) UpdateMarketingTask(ctx context.Context, req *marketingv1.SaveMarketingTaskRequest) (*marketingv1.MarketingTask, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("任务 ID 不合法")
	}
	task, err := s.buildMarketingTask(ctx, req, true)
	if err != nil {
		return nil, err
	}
	if err := s.repo.SaveMarketingTask(ctx, task); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新营销任务失败", err)
	}
	saved, err := s.repo.FindMarketingTaskByID(ctx, task.ID)
	if err != nil {
		return nil, err
	}
	return marketingTaskToProto(saved), nil
}

// DeleteMarketingTask 删除营销任务。
func (s *Service) DeleteMarketingTask(ctx context.Context, id uint64) error {
	if id == 0 {
		return errs.Invalid("任务 ID 不合法")
	}
	if _, err := s.repo.FindMarketingTaskByID(ctx, id); err != nil {
		return err
	}
	if err := s.repo.DeleteMarketingTask(ctx, id); err != nil {
		// 外键约束说明任务仍被其它数据引用，属于业务冲突而非系统故障
		if isForeignKeyViolation(err) {
			return errs.Conflict("该任务存在关联数据，无法删除")
		}
		return errs.Wrap(errs.CodeInternalError, "删除营销任务失败", err)
	}
	return nil
}

// buildMarketingTask 校验请求并组装任务实体。
//
// update 为 true 时必须带 ID，字段覆盖到已有记录上；否则视为新增。
// enabled 在 proto 里是 optional，可以区分「未传」与「显式 false」：
// 新增未传默认启用，更新未传保持原状态。
func (s *Service) buildMarketingTask(ctx context.Context, req *marketingv1.SaveMarketingTaskRequest, update bool) (*MarketingTask, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("任务名称不能为空")
	}
	taskType := req.GetType()
	if taskType < marketingTaskTypeMin || taskType > marketingTaskTypeMax {
		return nil, errs.Invalid("任务类型不合法")
	}
	if req.GetTargetCount() < 1 {
		return nil, errs.Invalid("任务目标次数必须大于 0")
	}
	if req.GetRewardPoints() < 0 {
		return nil, errs.Invalid("奖励积分不能为负数")
	}
	if req.GetRewardCouponId() < 0 {
		return nil, errs.Invalid("奖励优惠券不合法")
	}

	task := &MarketingTask{
		Name:           name,
		Description:    strings.TrimSpace(req.GetDescription()),
		Type:           int8(taskType),
		TargetCount:    int(req.GetTargetCount()),
		RewardPoints:   int(req.GetRewardPoints()),
		RewardCouponID: uint64(req.GetRewardCouponId()),
		Sort:           int(req.GetSort()),
		Icon:           strings.TrimSpace(req.GetIcon()),
	}

	if update || req.GetId() > 0 {
		id := uint64(req.GetId())
		existing, err := s.repo.FindMarketingTaskByID(ctx, id)
		if err != nil {
			return nil, err
		}
		task.ID = existing.ID
		// enabled 是 optional：未传则保持原状态，显式传 false 才下线。
		task.Enabled = existing.Enabled
		if req.Enabled != nil {
			task.Enabled = req.GetEnabled()
		}
		return task, nil
	}
	// 新增时未指定 enabled 视为启用；显式传 false 则创建即下线。
	task.Enabled = true
	if req.Enabled != nil {
		task.Enabled = req.GetEnabled()
	}
	return task, nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// formatTaskBizID 生成积分流水中的任务业务标识。
func formatTaskBizID(taskID uint64) string {
	return "task:" + strconv.FormatUint(taskID, 10)
}

// marketingTaskToProto 把任务定义转换为后台使用的完整视图。
//
// 与用户端的 UserTask 不同，这里带出 id、sort、enabled，供后台编辑使用。
func marketingTaskToProto(task *MarketingTask) *marketingv1.MarketingTask {
	if task == nil {
		return nil
	}
	return &marketingv1.MarketingTask{
		Id:             int64(task.ID),
		Name:           task.Name,
		Description:    task.Description,
		Type:           int32(task.Type),
		TargetCount:    int32(task.TargetCount),
		RewardPoints:   int32(task.RewardPoints),
		RewardCouponId: int64(task.RewardCouponID),
		Sort:           int32(task.Sort),
		Enabled:        task.Enabled,
		Icon:           task.Icon,
	}
}

func userTaskToProto(task *MarketingTask, progress *UserTask) *marketingv1.UserTask {
	if task == nil {
		return nil
	}
	out := &marketingv1.UserTask{
		TaskId:         int64(task.ID),
		Name:           task.Name,
		Description:    task.Description,
		Type:           int32(task.Type),
		Progress:       0,
		TargetCount:    int32(task.TargetCount),
		Completed:      false,
		Claimed:        false,
		RewardPoints:   int32(task.RewardPoints),
		RewardCouponId: int64(task.RewardCouponID),
		Icon:           task.Icon,
	}
	if progress != nil {
		out.Progress = int32(progress.Progress)
		out.Completed = progress.Completed
		out.Claimed = progress.Claimed
	}
	return out
}
