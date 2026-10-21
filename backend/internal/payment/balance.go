package payment

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// BalanceLog 是余额流水模型。
type BalanceLog struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Change    int64     `gorm:"column:change;not null;default:0" json:"change"`
	Balance   int64     `gorm:"column:balance;not null;default:0" json:"balance"`
	Title     string    `gorm:"column:title;type:varchar(128);not null;default:''" json:"title"`
	BizType   string    `gorm:"column:biz_type;type:varchar(32);not null;default:''" json:"biz_type"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (BalanceLog) TableName() string { return "balance_logs" }

// userBalance 是用户余额的最小投影。
type userBalance struct {
	ID           uint64 `gorm:"primaryKey" json:"id"`
	BalanceCents int64  `gorm:"column:balance_cents" json:"balance_cents"`
}

// TableName 指定表名。
func (userBalance) TableName() string { return "users" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListBalanceLogs 分页查询余额流水。
//
// userID 为 0 表示不限用户（后台管理端查看全量）。
func (r *Repo) ListBalanceLogs(ctx context.Context, userID uint64, page, pageSize int) ([]BalanceLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&BalanceLog{})
	if userID > 0 {
		q = q.Where("user_id = ?", userID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []BalanceLog
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// GetUserBalance 查询用户当前余额（单位：分）。
func (r *Repo) GetUserBalance(ctx context.Context, userID uint64) (int64, error) {
	var ub userBalance
	if err := r.db.WithContext(ctx).Where("id = ?", userID).First(&ub).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return 0, err
	}
	return ub.BalanceCents, nil
}

// ApplyRechargeCredit 充值入账：更新充值单状态、增加用户余额并写入余额流水。
//
// 返回 false 表示充值单已被处理过（回调重复），调用方应直接返回。
func (r *Repo) ApplyRechargeCredit(ctx context.Context, rechargeID, userID uint64, change int64, title, bizType string, paidAt time.Time) (bool, error) {
	var credited bool
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&RechargeOrder{}).
			Where("id = ? AND status = ?", rechargeID, RechargeStatusPending).
			Updates(map[string]any{
				"status":  RechargeStatusPaid,
				"paid_at": paidAt,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			// 已经被处理过，幂等返回
			return nil
		}
		if _, err := r.creditUserBalance(tx, userID, change, title, bizType); err != nil {
			return err
		}
		credited = true
		return nil
	})
	return credited, err
}

// creditUserBalance 在事务中增加用户余额并写入一条余额流水，返回变更后余额。
func (r *Repo) creditUserBalance(tx *gorm.DB, userID uint64, change int64, title, bizType string) (int64, error) {
	res := tx.Model(&userBalance{}).
		Where("id = ?", userID).
		Update("balance_cents", gorm.Expr("balance_cents + ?", change))
	if res.Error != nil {
		return 0, res.Error
	}
	if res.RowsAffected == 0 {
		return 0, errs.New(errs.CodeUserNotFound, "用户不存在")
	}

	var ub userBalance
	if err := tx.Where("id = ?", userID).First(&ub).Error; err != nil {
		return 0, err
	}

	if err := tx.Create(&BalanceLog{
		UserID:    userID,
		Change:    change,
		Balance:   ub.BalanceCents,
		Title:     title,
		BizType:   bizType,
		CreatedAt: time.Now(),
	}).Error; err != nil {
		return 0, err
	}
	return ub.BalanceCents, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListBalanceLogs 查询当前用户的余额流水。
func (s *Service) ListBalanceLogs(ctx context.Context, req *paymentv1.ListBalanceLogsRequest) (*paymentv1.ListBalanceLogsResponse, error) {
	userID, err := resolveOwnerUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	pageNum, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListBalanceLogs(ctx, uint64(userID), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询余额流水失败", err)
	}
	out := make([]*paymentv1.BalanceLog, 0, len(list))
	for i := range list {
		out = append(out, balanceLogToProto(&list[i]))
	}

	// 管理员查看全量流水时没有单一归属用户，余额置 0。
	balance := int64(0)
	if userID > 0 {
		balance, err = s.repo.GetUserBalance(ctx, uint64(userID))
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询用户余额失败", err)
		}
	}

	return &paymentv1.ListBalanceLogsResponse{
		Logs:           out,
		Meta:           buildMeta(pageNum, pageSize, total),
		CurrentBalance: balance,
	}, nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func balanceLogToProto(l *BalanceLog) *paymentv1.BalanceLog {
	if l == nil {
		return nil
	}
	return &paymentv1.BalanceLog{
		Id:        int64(l.ID),
		UserId:    int64(l.UserID),
		Change:    l.Change,
		Balance:   l.Balance,
		Title:     l.Title,
		BizType:   l.BizType,
		CreatedAt: timestamppb.New(l.CreatedAt),
	}
}

// isDuplicateKey 判断数据库错误是否为唯一键冲突。
func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "Duplicate entry")
}
