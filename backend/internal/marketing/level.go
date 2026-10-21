package marketing

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// MarketingUserLevel 是会员等级模型。
//
// user_levels 表由用户服务维护，营销域只读取等级与权益说明，用于活动页的会员说明。
type MarketingUserLevel struct {
	ID              uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name            string    `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Level           int       `gorm:"not null;default:1" json:"level"`
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
func (MarketingUserLevel) TableName() string { return "user_levels" }

// ListUserLevels 查询全部会员等级。
func (r *Repo) ListUserLevels(ctx context.Context) ([]MarketingUserLevel, error) {
	var list []MarketingUserLevel
	err := r.db.WithContext(ctx).Order("level ASC, id ASC").Find(&list).Error
	return list, err
}

// ListUserLevels 查询会员等级列表。
func (s *Service) ListUserLevels(ctx context.Context, req *marketingv1.ListUserLevelsRequest) (*marketingv1.ListUserLevelsResponse, error) {
	list, err := s.repo.ListUserLevels(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询会员等级失败", err)
	}

	out := make([]*marketingv1.MarketingUserLevel, 0, len(list))
	for i := range list {
		out = append(out, userLevelToProto(&list[i]))
	}
	return &marketingv1.ListUserLevelsResponse{Levels: out}, nil
}

func userLevelToProto(l *MarketingUserLevel) *marketingv1.MarketingUserLevel {
	if l == nil {
		return nil
	}
	return &marketingv1.MarketingUserLevel{
		Id:              int64(l.ID),
		Name:            l.Name,
		Level:           int32(l.Level),
		MinGrowth:       int32(l.MinGrowth),
		MaxGrowth:       int32(l.MaxGrowth),
		DiscountPercent: int32(l.DiscountPercent),
		Icon:            l.Icon,
		Description:     l.Description,
		Benefits:        parseBenefits(l.Benefits),
		Sort:            int32(l.Sort),
	}
}

// parseBenefits 解析权益列表，兼容 JSON 数组与逗号分隔两种存量格式。
func parseBenefits(raw string) []string {
	out := []string{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return out
	}
	if strings.HasPrefix(raw, "[") {
		var items []string
		if err := json.Unmarshal([]byte(raw), &items); err == nil {
			for _, item := range items {
				if item = strings.TrimSpace(item); item != "" {
					out = append(out, item)
				}
			}
			return out
		}
	}
	for _, part := range strings.Split(raw, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}
