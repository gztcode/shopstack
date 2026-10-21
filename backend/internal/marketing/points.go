package marketing

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// UserProfile 是用户表在营销域的只读投影。
//
// 该表由用户服务维护，营销域仅用于读取昵称与积分余额，并追加积分。
type UserProfile struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Nickname  string         `gorm:"column:nickname;type:varchar(64);not null;default:''" json:"nickname"`
	Points    int64          `gorm:"column:points;not null;default:0" json:"points"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (UserProfile) TableName() string { return "users" }

// PointsLog 是积分明细模型。
//
// 表结构由用户服务维护，营销域在发放积分时按同一字段约定写入流水。
type PointsLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Title     string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	Change    int       `gorm:"not null;default:0" json:"change"`
	Balance   int       `gorm:"not null;default:0" json:"balance"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	BizID     string    `gorm:"column:biz_id;type:varchar(64);not null;default:''" json:"biz_id"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名。
func (PointsLog) TableName() string { return "user_points_logs" }

// 积分流水的业务类型
const (
	PointsBizTypeSignIn = "sign_in" // 每日签到
	PointsBizTypeTask   = "task"    // 任务奖励
)

// FindUserNickname 查询用户昵称，用户不存在时返回空字符串。
func (r *Repo) FindUserNickname(ctx context.Context, userID uint64) (string, error) {
	var u UserProfile
	if err := r.db.WithContext(ctx).Select("id", "nickname").Where("id = ?", userID).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return u.Nickname, nil
}

// AddPoints 给用户增加积分并写入积分流水。
//
// tx 为 nil 时使用仓储自身的数据库句柄；传入事务句柄时与调用方的事务同生共死。
// 积分余额不允许为负，因此扣减超过余额时按 0 处理。
func (r *Repo) AddPoints(ctx context.Context, tx *gorm.DB, userID uint64, points int, title, bizType, bizID string) error {
	if tx == nil {
		tx = r.db.WithContext(ctx)
	}
	if points == 0 {
		return nil
	}

	var account UserProfile
	if err := tx.Where("id = ?", userID).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return err
	}

	if err := tx.Model(&UserProfile{}).Where("id = ?", userID).
		Update("points", gorm.Expr("GREATEST(points + ?, 0)", points)).Error; err != nil {
		return err
	}

	// 回读最新余额写入流水，保证流水中展示的余额与账户一致。
	var latest UserProfile
	if err := tx.Where("id = ?", userID).First(&latest).Error; err != nil {
		return err
	}

	log := &PointsLog{
		UserID:    userID,
		Title:     title,
		Change:    points,
		Balance:   int(latest.Points),
		BizType:   bizType,
		BizID:     bizID,
		CreatedAt: time.Now(),
	}
	return tx.Create(log).Error
}
