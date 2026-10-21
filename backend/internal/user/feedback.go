package user

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 反馈类型
const (
	FeedbackTypeSuggestion = 1 // 功能建议
	FeedbackTypeProblem    = 2 // 使用问题
	FeedbackTypeComplaint  = 3 // 投诉
	FeedbackTypeOther      = 4 // 其他
)

// 反馈状态
const (
	FeedbackStatusPending    = 0 // 待处理
	FeedbackStatusProcessing = 1 // 处理中
	FeedbackStatusResolved   = 2 // 已处理
	FeedbackStatusClosed     = 3 // 已关闭
)

// feedbackContentMaxLen 反馈内容长度上限。
const feedbackContentMaxLen = 2000

// Feedback 是用户意见反馈模型。
type Feedback struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint64     `gorm:"column:user_id;not null;default:0;index" json:"user_id"`
	UserNickname string     `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	Type         int8       `gorm:"not null;default:4" json:"type"`
	Content      string     `gorm:"type:text;not null" json:"content"`
	Images       string     `gorm:"type:varchar(1024);not null;default:''" json:"images"`
	Contact      string     `gorm:"type:varchar(64);not null;default:''" json:"contact"`
	Status       int8       `gorm:"not null;default:0;index" json:"status"`
	Reply        string     `gorm:"type:varchar(1024);not null;default:''" json:"reply"`
	CreatedAt    time.Time  `json:"created_at"`
	ProcessedAt  *time.Time `json:"processed_at"`
}

// TableName 指定表名。
func (Feedback) TableName() string { return "user_feedbacks" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// CreateFeedback 新增用户反馈。
func (r *Repo) CreateFeedback(ctx context.Context, f *Feedback) error {
	return r.db.WithContext(ctx).Create(f).Error
}

// ListFeedbacks 分页查询用户反馈，status 大于等于 0 时按状态过滤。
func (r *Repo) ListFeedbacks(ctx context.Context, status int8, keyword string, page, pageSize int) ([]Feedback, int64, error) {
	q := r.db.WithContext(ctx).Model(&Feedback{})
	if status >= 0 {
		q = q.Where("status = ?", status)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("content LIKE ? OR contact LIKE ? OR user_nickname LIKE ?", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Feedback
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindFeedback 按 ID 查询反馈。
func (r *Repo) FindFeedback(ctx context.Context, id uint64) (*Feedback, error) {
	var f Feedback
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&f).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "反馈不存在")
		}
		return nil, err
	}
	return &f, nil
}

// UpdateFeedback 更新反馈字段。
func (r *Repo) UpdateFeedback(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Feedback{}).Where("id = ?", id).Updates(fields).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// SubmitFeedback 提交意见反馈。
func (s *Service) SubmitFeedback(ctx context.Context, userID int64, req *userv1.SubmitFeedbackRequest) error {
	content := strings.TrimSpace(req.GetContent())
	if content == "" {
		return errs.Invalid("反馈内容不能为空")
	}
	if len([]rune(content)) > feedbackContentMaxLen {
		return errs.Invalid("反馈内容不能超过 2000 字")
	}
	if len(req.GetImages()) > 9 {
		return errs.Invalid("反馈图片最多上传 9 张")
	}
	feedbackType := int8(req.GetType())
	switch feedbackType {
	case FeedbackTypeSuggestion, FeedbackTypeProblem, FeedbackTypeComplaint, FeedbackTypeOther:
	case 0:
		feedbackType = FeedbackTypeOther
	default:
		return errs.Invalid("非法的反馈类型")
	}

	nickname := ""
	if u, err := s.repo.FindUserByID(ctx, uint64(userID)); err == nil {
		nickname = u.Nickname
	}

	feedback := &Feedback{
		UserID:       uint64(userID),
		UserNickname: nickname,
		Type:         feedbackType,
		Content:      content,
		Images:       encodeStringArray(req.GetImages()),
		Contact:      strings.TrimSpace(req.GetContact()),
		Status:       FeedbackStatusPending,
	}
	if err := s.repo.CreateFeedback(ctx, feedback); err != nil {
		return errs.Wrap(errs.CodeInternalError, "提交反馈失败", err)
	}
	return nil
}

// AdminListFeedbacks 后台分页查询用户反馈。
func (s *Service) AdminListFeedbacks(ctx context.Context, req *userv1.ListFeedbacksRequest) (*userv1.ListFeedbacksResponse, error) {
	pageNum, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListFeedbacks(ctx, int8(req.GetStatus()), strings.TrimSpace(req.GetKeyword()), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户反馈失败", err)
	}
	out := make([]*userv1.Feedback, 0, len(list))
	for i := range list {
		out = append(out, feedbackToProto(&list[i]))
	}
	return &userv1.ListFeedbacksResponse{Feedbacks: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// AdminSetFeedbackStatus 后台处理用户反馈。
//
// 状态流转到「已处理」或「已关闭」时记录处理时间。
func (s *Service) AdminSetFeedbackStatus(ctx context.Context, req *userv1.SetFeedbackStatusRequest) (*userv1.Feedback, error) {
	status := int8(req.GetStatus())
	switch status {
	case FeedbackStatusPending, FeedbackStatusProcessing, FeedbackStatusResolved, FeedbackStatusClosed:
	default:
		return nil, errs.Invalid("非法的反馈状态")
	}

	feedback, err := s.repo.FindFeedback(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	fields := map[string]any{"status": status}
	if reply := strings.TrimSpace(req.GetReply()); reply != "" {
		fields["reply"] = reply
	}
	if status == FeedbackStatusResolved || status == FeedbackStatusClosed {
		now := time.Now()
		fields["processed_at"] = &now
	} else {
		fields["processed_at"] = nil
	}

	if err := s.repo.UpdateFeedback(ctx, feedback.ID, fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新反馈状态失败", err)
	}
	updated, err := s.repo.FindFeedback(ctx, feedback.ID)
	if err != nil {
		return nil, err
	}
	return feedbackToProto(updated), nil
}
