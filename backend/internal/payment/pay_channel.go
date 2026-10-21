package payment

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// PayChannel 是支付渠道模型。
type PayChannel struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Channel   int8      `gorm:"column:channel;not null;default:1;index" json:"channel"`
	Code      string    `gorm:"column:code;type:varchar(32);not null;uniqueIndex" json:"code"`
	Icon      string    `gorm:"column:icon;type:varchar(512);not null" json:"icon"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	Sort      int       `gorm:"column:sort;not null;default:0" json:"sort"`
	Config    string    `gorm:"column:config;type:text" json:"config"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (PayChannel) TableName() string { return "pay_channels" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListPayChannels 分页查询支付渠道。
func (r *Repo) ListPayChannels(ctx context.Context, channel int32, page, pageSize int) ([]PayChannel, int64, error) {
	q := r.db.WithContext(ctx).Model(&PayChannel{})
	if channel > 0 {
		q = q.Where("channel = ?", channel)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []PayChannel
	err := q.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindPayChannelByID 按 ID 查询支付渠道。
func (r *Repo) FindPayChannelByID(ctx context.Context, id uint64) (*PayChannel, error) {
	var c PayChannel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "支付渠道不存在")
		}
		return nil, err
	}
	return &c, nil
}

// FindEnabledPayChannelByType 按渠道类型查询启用中的支付渠道。
func (r *Repo) FindEnabledPayChannelByType(ctx context.Context, channel int8) (*PayChannel, error) {
	var c PayChannel
	err := r.db.WithContext(ctx).Where("channel = ? AND enabled = ?", channel, true).
		Order("sort ASC, id ASC").First(&c).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "支付渠道不可用")
		}
		return nil, err
	}
	return &c, nil
}

// CreatePayChannel 新增支付渠道。
func (r *Repo) CreatePayChannel(ctx context.Context, c *PayChannel) error {
	if err := r.db.WithContext(ctx).Create(c).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodeConflict, "支付渠道编码已存在")
		}
		return err
	}
	return nil
}

// UpdatePayChannel 更新支付渠道。
func (r *Repo) UpdatePayChannel(ctx context.Context, id uint64, fields map[string]any) error {
	res := r.db.WithContext(ctx).Model(&PayChannel{}).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		if isDuplicateKey(res.Error) {
			return errs.New(errs.CodeConflict, "支付渠道编码已存在")
		}
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "支付渠道不存在")
	}
	return nil
}

// DeletePayChannel 删除支付渠道。
func (r *Repo) DeletePayChannel(ctx context.Context, id uint64) error {
	res := r.db.WithContext(ctx).Delete(&PayChannel{}, "id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "支付渠道不存在")
	}
	return nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListPayChannels 分页查询支付渠道列表。
func (s *Service) ListPayChannels(ctx context.Context, channel int32, page *commonv1.PageRequest) (*paymentv1.ListPayChannelsResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListPayChannels(ctx, channel, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询支付渠道失败", err)
	}
	out := make([]*paymentv1.PayChannel, 0, len(list))
	for i := range list {
		out = append(out, payChannelToProto(&list[i]))
	}
	return &paymentv1.ListPayChannelsResponse{Channels: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// SavePayChannel 新增或更新支付渠道。
//
// id 为 0 时新增，否则按 ID 更新。
func (s *Service) SavePayChannel(ctx context.Context, req *paymentv1.SavePayChannelRequest) (*paymentv1.PayChannel, error) {
	name := strings.TrimSpace(req.GetName())
	code := strings.TrimSpace(req.GetCode())
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "支付渠道名称不能为空")
	}
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "支付渠道编码不能为空")
	}
	channel := int8(req.GetChannel())
	if channel <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "支付渠道类型不合法")
	}
	config := strings.TrimSpace(req.GetConfig())
	if config == "" {
		config = "{}"
	}

	fields := map[string]any{
		"name":    name,
		"channel": channel,
		"code":    code,
		"icon":    strings.TrimSpace(req.GetIcon()),
		"enabled": req.GetEnabled(),
		"sort":    int(req.GetSort()),
		"config":  config,
	}

	if req.GetId() > 0 {
		if _, err := s.repo.FindPayChannelByID(ctx, uint64(req.GetId())); err != nil {
			return nil, err
		}
		if err := s.repo.UpdatePayChannel(ctx, uint64(req.GetId()), fields); err != nil {
			return nil, err
		}
		updated, err := s.repo.FindPayChannelByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		return payChannelToProto(updated), nil
	}

	c := &PayChannel{
		Name:    name,
		Channel: channel,
		Code:    code,
		Icon:    fields["icon"].(string),
		Enabled: req.GetEnabled(),
		Sort:    int(req.GetSort()),
		Config:  config,
	}
	if err := s.repo.CreatePayChannel(ctx, c); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存支付渠道失败", err)
	}
	return payChannelToProto(c), nil
}

// DeletePayChannel 删除支付渠道。
func (s *Service) DeletePayChannel(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "支付渠道 ID 不能为空")
	}
	return s.repo.DeletePayChannel(ctx, uint64(id))
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func payChannelToProto(c *PayChannel) *paymentv1.PayChannel {
	if c == nil {
		return nil
	}
	return &paymentv1.PayChannel{
		Id:        int64(c.ID),
		Name:      c.Name,
		Channel:   int32(c.Channel),
		Code:      c.Code,
		Icon:      c.Icon,
		Enabled:   c.Enabled,
		Sort:      int32(c.Sort),
		Config:    c.Config,
		CreatedAt: timestamppb.New(c.CreatedAt),
	}
}
