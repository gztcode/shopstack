package notification

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 敏感词状态
const (
	// SensitiveWordStatusDisabled 停用。
	SensitiveWordStatusDisabled = 0
	// SensitiveWordStatusEnabled 启用。
	SensitiveWordStatusEnabled = 1
)

// SensitiveWord 是敏感词模型。
type SensitiveWord struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Word      string    `gorm:"column:word;type:varchar(128);not null;uniqueIndex" json:"word"`
	Category  int8      `gorm:"column:category;not null;default:4;index" json:"category"`
	Status    int8      `gorm:"column:status;not null;default:1;index" json:"status"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (SensitiveWord) TableName() string { return "sensitive_words" }

// notificationCategory 是通知分类的展示信息。
type notificationCategory struct {
	Type int32
	Name string
	Icon string
}

// notificationCategories 是系统内置的通知分类，对应 common.NotificationType 枚举。
var notificationCategories = []notificationCategory{
	{Type: NotificationTypeOrder, Name: "订单", Icon: "order"},
	{Type: NotificationTypeLogistics, Name: "物流", Icon: "logistics"},
	{Type: NotificationTypePromotion, Name: "营销", Icon: "promotion"},
	{Type: NotificationTypeSystem, Name: "系统", Icon: "system"},
}

// categoryCount 是单个分类的通知数量统计。
type categoryCount struct {
	Count  int64
	Unread int64
}

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListSensitiveWords 分页查询敏感词。
func (r *Repo) ListSensitiveWords(ctx context.Context, keyword string, category int32, page, pageSize int) ([]SensitiveWord, int64, error) {
	tx := r.db.WithContext(ctx).Model(&SensitiveWord{})
	if keyword != "" {
		tx = tx.Where("word LIKE ?", "%"+keyword+"%")
	}
	if category > 0 {
		tx = tx.Where("category = ?", category)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []SensitiveWord
	err := tx.Order("id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindSensitiveWordByID 按 ID 查询敏感词。
func (r *Repo) FindSensitiveWordByID(ctx context.Context, id uint64) (*SensitiveWord, error) {
	var w SensitiveWord
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&w).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "敏感词不存在")
		}
		return nil, err
	}
	return &w, nil
}

// ListEnabledSensitiveWords 查询所有启用中的敏感词。
func (r *Repo) ListEnabledSensitiveWords(ctx context.Context) ([]SensitiveWord, error) {
	var list []SensitiveWord
	err := r.db.WithContext(ctx).Where("status = ?", SensitiveWordStatusEnabled).
		Order("id ASC").Find(&list).Error
	return list, err
}

// CreateSensitiveWord 新增敏感词。
func (r *Repo) CreateSensitiveWord(ctx context.Context, w *SensitiveWord) error {
	if err := r.db.WithContext(ctx).Create(w).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodeConflict, "敏感词已存在")
		}
		return err
	}
	return nil
}

// UpdateSensitiveWord 更新敏感词。
func (r *Repo) UpdateSensitiveWord(ctx context.Context, id uint64, fields map[string]any) error {
	res := r.db.WithContext(ctx).Model(&SensitiveWord{}).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		if isDuplicateKey(res.Error) {
			return errs.New(errs.CodeConflict, "敏感词已存在")
		}
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "敏感词不存在")
	}
	return nil
}

// DeleteSensitiveWord 删除敏感词。
func (r *Repo) DeleteSensitiveWord(ctx context.Context, id uint64) error {
	res := r.db.WithContext(ctx).Delete(&SensitiveWord{}, "id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "敏感词不存在")
	}
	return nil
}

// CountNotificationsByType 统计用户各分类的通知数量与未读数量。
func (r *Repo) CountNotificationsByType(ctx context.Context, userID uint64) (map[int32]categoryCount, error) {
	type row struct {
		Type   int8
		Count  int64
		Unread int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Notification{}).
		Select("type, COUNT(*) AS count, SUM(CASE WHEN `read` = 0 THEN 1 ELSE 0 END) AS unread").
		Where("user_id = ?", userID).
		Group("type").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[int32]categoryCount, len(rows))
	for _, rw := range rows {
		out[int32(rw.Type)] = categoryCount{Count: rw.Count, Unread: rw.Unread}
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListSensitiveWords 分页查询敏感词列表。
func (s *Service) ListSensitiveWords(ctx context.Context, req *notificationv1.ListSensitiveWordsRequest) (*notificationv1.ListSensitiveWordsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListSensitiveWords(ctx, strings.TrimSpace(req.GetKeyword()), req.GetCategory(), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询敏感词失败", err)
	}
	out := make([]*notificationv1.SensitiveWord, 0, len(list))
	for i := range list {
		out = append(out, sensitiveWordToProto(&list[i]))
	}
	return &notificationv1.ListSensitiveWordsResponse{Words: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveSensitiveWord 新增或更新敏感词。
//
// id 为 0 时新增，否则按 ID 更新；status 决定该词是否参与内容过滤。
func (s *Service) SaveSensitiveWord(ctx context.Context, req *notificationv1.SaveSensitiveWordRequest) (*notificationv1.SensitiveWord, error) {
	word := strings.TrimSpace(req.GetWord())
	if word == "" {
		return nil, errs.New(errs.CodeInvalidParam, "敏感词不能为空")
	}
	category := int8(req.GetCategory())
	if category <= 0 {
		category = 4
	}
	status := int8(req.GetStatus())
	if status != SensitiveWordStatusDisabled && status != SensitiveWordStatusEnabled {
		status = SensitiveWordStatusEnabled
	}

	fields := map[string]any{
		"word":     word,
		"category": category,
		"status":   status,
	}

	if req.GetId() > 0 {
		if _, err := s.repo.FindSensitiveWordByID(ctx, uint64(req.GetId())); err != nil {
			return nil, err
		}
		if err := s.repo.UpdateSensitiveWord(ctx, uint64(req.GetId()), fields); err != nil {
			return nil, err
		}
		updated, err := s.repo.FindSensitiveWordByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		return sensitiveWordToProto(updated), nil
	}

	w := &SensitiveWord{
		Word:     word,
		Category: category,
		Status:   status,
	}
	if err := s.repo.CreateSensitiveWord(ctx, w); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存敏感词失败", err)
	}
	return sensitiveWordToProto(w), nil
}

// DeleteSensitiveWord 删除敏感词。
//
// 删除后该词不再参与站内通知与短信的内容过滤。
func (s *Service) DeleteSensitiveWord(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "敏感词 ID 不能为空")
	}
	return s.repo.DeleteSensitiveWord(ctx, uint64(id))
}

// ListNotificationCategories 查询通知分类及其消息数量统计。
func (s *Service) ListNotificationCategories(ctx context.Context, req *notificationv1.ListNotificationCategoriesRequest) (*notificationv1.ListNotificationCategoriesResponse, error) {
	userID := resolveUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}

	counts, err := s.repo.CountNotificationsByType(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计通知分类失败", err)
	}

	out := make([]*notificationv1.NotificationCategory, 0, len(notificationCategories))
	for _, c := range notificationCategories {
		stat := counts[c.Type]
		out = append(out, &notificationv1.NotificationCategory{
			Type:        c.Type,
			Name:        c.Name,
			Icon:        c.Icon,
			Count:       int32(stat.Count),
			UnreadCount: int32(stat.Unread),
		})
	}
	return &notificationv1.ListNotificationCategoriesResponse{Categories: out}, nil
}

// checkSensitiveWords 校验文本中是否包含启用的敏感词。
func (s *Service) checkSensitiveWords(ctx context.Context, texts ...string) error {
	words, err := s.repo.ListEnabledSensitiveWords(ctx)
	if err != nil {
		return errs.Wrap(errs.CodeInternalError, "读取敏感词失败", err)
	}
	if len(words) == 0 {
		return nil
	}
	for _, w := range words {
		if w.Word == "" {
			continue
		}
		for _, text := range texts {
			if text != "" && strings.Contains(text, w.Word) {
				return errs.New(errs.CodeInvalidParam, "内容包含敏感词，已被拦截")
			}
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func sensitiveWordToProto(w *SensitiveWord) *notificationv1.SensitiveWord {
	if w == nil {
		return nil
	}
	return &notificationv1.SensitiveWord{
		Id:        int64(w.ID),
		Word:      w.Word,
		Category:  int32(w.Category),
		Status:    int32(w.Status),
		CreatedAt: timestamppb.New(w.CreatedAt),
	}
}
