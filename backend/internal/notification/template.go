package notification

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
)

// NotificationTemplate 是站内通知模板模型。
type NotificationTemplate struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(64);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Type      int8      `gorm:"column:type;not null;default:1;index" json:"type"`
	Title     string    `gorm:"column:title;type:varchar(255);not null" json:"title"`
	Content   string    `gorm:"column:content;type:text" json:"content"`
	Link      string    `gorm:"column:link;type:varchar(512);not null" json:"link"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName 指定表名。
func (NotificationTemplate) TableName() string { return "notification_templates" }

// SmsTemplate 是短信模板模型。
type SmsTemplate struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(64);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Content   string    `gorm:"column:content;type:text" json:"content"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName 指定表名。
func (SmsTemplate) TableName() string { return "sms_templates" }

// ---------------------------------------------------------------------------
// 仓储：通知模板
// ---------------------------------------------------------------------------

// ListNotificationTemplates 分页查询通知模板。
func (r *Repo) ListNotificationTemplates(ctx context.Context, templateType int32, keyword string, page, pageSize int) ([]NotificationTemplate, int64, error) {
	tx := r.db.WithContext(ctx).Model(&NotificationTemplate{})
	if templateType > 0 {
		tx = tx.Where("type = ?", templateType)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		tx = tx.Where("code LIKE ? OR name LIKE ? OR title LIKE ?", like, like, like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []NotificationTemplate
	err := tx.Order("id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindNotificationTemplateByID 按 ID 查询通知模板。
func (r *Repo) FindNotificationTemplateByID(ctx context.Context, id uint64) (*NotificationTemplate, error) {
	var t NotificationTemplate
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "通知模板不存在")
		}
		return nil, err
	}
	return &t, nil
}

// FindNotificationTemplateByCode 按模板编码查询通知模板。
func (r *Repo) FindNotificationTemplateByCode(ctx context.Context, code string) (*NotificationTemplate, error) {
	var t NotificationTemplate
	if err := r.db.WithContext(ctx).Where("code = ?", code).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

// CreateNotificationTemplate 新增通知模板。
func (r *Repo) CreateNotificationTemplate(ctx context.Context, t *NotificationTemplate) error {
	if err := r.db.WithContext(ctx).Create(t).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodeConflict, "模板编码已存在")
		}
		return err
	}
	return nil
}

// UpdateNotificationTemplate 更新通知模板。
func (r *Repo) UpdateNotificationTemplate(ctx context.Context, id uint64, fields map[string]any) error {
	res := r.db.WithContext(ctx).Model(&NotificationTemplate{}).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		if isDuplicateKey(res.Error) {
			return errs.New(errs.CodeConflict, "模板编码已存在")
		}
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "通知模板不存在")
	}
	return nil
}

// DeleteNotificationTemplate 删除通知模板。
func (r *Repo) DeleteNotificationTemplate(ctx context.Context, id uint64) error {
	res := r.db.WithContext(ctx).Delete(&NotificationTemplate{}, "id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "通知模板不存在")
	}
	return nil
}

// ---------------------------------------------------------------------------
// 仓储：短信模板
// ---------------------------------------------------------------------------

// ListSmsTemplates 分页查询短信模板。
func (r *Repo) ListSmsTemplates(ctx context.Context, keyword string, page, pageSize int) ([]SmsTemplate, int64, error) {
	tx := r.db.WithContext(ctx).Model(&SmsTemplate{})
	if keyword != "" {
		like := "%" + keyword + "%"
		tx = tx.Where("code LIKE ? OR name LIKE ? OR content LIKE ?", like, like, like)
	}
	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []SmsTemplate
	err := tx.Order("id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindSmsTemplateByID 按 ID 查询短信模板。
func (r *Repo) FindSmsTemplateByID(ctx context.Context, id uint64) (*SmsTemplate, error) {
	var t SmsTemplate
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "短信模板不存在")
		}
		return nil, err
	}
	return &t, nil
}

// FindSmsTemplateByCode 按模板编码查询短信模板，不存在时返回 (nil, nil)。
func (r *Repo) FindSmsTemplateByCode(ctx context.Context, code string) (*SmsTemplate, error) {
	var t SmsTemplate
	if err := r.db.WithContext(ctx).Where("code = ?", code).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

// CreateSmsTemplate 新增短信模板。
func (r *Repo) CreateSmsTemplate(ctx context.Context, t *SmsTemplate) error {
	if err := r.db.WithContext(ctx).Create(t).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodeConflict, "模板编码已存在")
		}
		return err
	}
	return nil
}

// UpdateSmsTemplate 更新短信模板。
func (r *Repo) UpdateSmsTemplate(ctx context.Context, id uint64, fields map[string]any) error {
	res := r.db.WithContext(ctx).Model(&SmsTemplate{}).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		if isDuplicateKey(res.Error) {
			return errs.New(errs.CodeConflict, "模板编码已存在")
		}
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "短信模板不存在")
	}
	return nil
}

// DeleteSmsTemplate 删除短信模板。
func (r *Repo) DeleteSmsTemplate(ctx context.Context, id uint64) error {
	res := r.db.WithContext(ctx).Delete(&SmsTemplate{}, "id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "短信模板不存在")
	}
	return nil
}

// ---------------------------------------------------------------------------
// 服务：通知模板
// ---------------------------------------------------------------------------

// ListNotificationTemplates 分页查询通知模板列表。
func (s *Service) ListNotificationTemplates(ctx context.Context, req *notificationv1.ListNotificationTemplatesRequest) (*notificationv1.ListNotificationTemplatesResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListNotificationTemplates(ctx, req.GetType(), strings.TrimSpace(req.GetKeyword()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询通知模板失败", err)
	}
	out := make([]*notificationv1.NotificationTemplate, 0, len(list))
	for i := range list {
		out = append(out, notificationTemplateToProto(&list[i]))
	}
	return &notificationv1.ListNotificationTemplatesResponse{Templates: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveNotificationTemplate 新增或更新通知模板。
//
// id 为 0 时新增，否则按 ID 更新。
func (s *Service) SaveNotificationTemplate(ctx context.Context, req *notificationv1.SaveNotificationTemplateRequest) (*notificationv1.NotificationTemplate, error) {
	code := strings.TrimSpace(req.GetCode())
	name := strings.TrimSpace(req.GetName())
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "模板编码不能为空")
	}
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "模板名称不能为空")
	}
	templateType, err := mapNotificationType(req.GetType())
	if err != nil {
		return nil, err
	}

	fields := map[string]any{
		"code":    code,
		"name":    name,
		"type":    templateType,
		"title":   strings.TrimSpace(req.GetTitle()),
		"content": req.GetContent(),
		"link":    strings.TrimSpace(req.GetLink()),
		"enabled": req.GetEnabled(),
	}

	if req.GetId() > 0 {
		if _, err := s.repo.FindNotificationTemplateByID(ctx, uint64(req.GetId())); err != nil {
			return nil, err
		}
		if err := s.repo.UpdateNotificationTemplate(ctx, uint64(req.GetId()), fields); err != nil {
			return nil, err
		}
		updated, err := s.repo.FindNotificationTemplateByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		return notificationTemplateToProto(updated), nil
	}

	tpl := &NotificationTemplate{
		Code:    code,
		Name:    name,
		Type:    templateType,
		Title:   fields["title"].(string),
		Content: req.GetContent(),
		Link:    fields["link"].(string),
		Enabled: req.GetEnabled(),
	}
	if err := s.repo.CreateNotificationTemplate(ctx, tpl); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存通知模板失败", err)
	}
	return notificationTemplateToProto(tpl), nil
}

// DeleteNotificationTemplate 删除通知模板。
func (s *Service) DeleteNotificationTemplate(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "模板 ID 不能为空")
	}
	return s.repo.DeleteNotificationTemplate(ctx, uint64(id))
}

// ---------------------------------------------------------------------------
// 服务：短信模板
// ---------------------------------------------------------------------------

// ListSmsTemplates 分页查询短信模板列表。
func (s *Service) ListSmsTemplates(ctx context.Context, req *notificationv1.ListSmsTemplatesRequest) (*notificationv1.ListSmsTemplatesResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListSmsTemplates(ctx, strings.TrimSpace(req.GetKeyword()), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询短信模板失败", err)
	}
	out := make([]*notificationv1.SmsTemplate, 0, len(list))
	for i := range list {
		out = append(out, smsTemplateToProto(&list[i]))
	}
	return &notificationv1.ListSmsTemplatesResponse{Templates: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// SaveSmsTemplate 新增或更新短信模板。
//
// id 为 0 时新增，否则按 ID 更新。
func (s *Service) SaveSmsTemplate(ctx context.Context, req *notificationv1.SaveSmsTemplateRequest) (*notificationv1.SmsTemplate, error) {
	code := strings.TrimSpace(req.GetCode())
	name := strings.TrimSpace(req.GetName())
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "模板编码不能为空")
	}
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "模板名称不能为空")
	}
	content := strings.TrimSpace(req.GetContent())
	if content == "" {
		return nil, errs.New(errs.CodeInvalidParam, "模板内容不能为空")
	}

	fields := map[string]any{
		"code":    code,
		"name":    name,
		"content": content,
		"enabled": req.GetEnabled(),
	}

	if req.GetId() > 0 {
		if _, err := s.repo.FindSmsTemplateByID(ctx, uint64(req.GetId())); err != nil {
			return nil, err
		}
		if err := s.repo.UpdateSmsTemplate(ctx, uint64(req.GetId()), fields); err != nil {
			return nil, err
		}
		updated, err := s.repo.FindSmsTemplateByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		return smsTemplateToProto(updated), nil
	}

	tpl := &SmsTemplate{
		Code:    code,
		Name:    name,
		Content: content,
		Enabled: req.GetEnabled(),
	}
	if err := s.repo.CreateSmsTemplate(ctx, tpl); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存短信模板失败", err)
	}
	return smsTemplateToProto(tpl), nil
}

// DeleteSmsTemplate 删除短信模板。
func (s *Service) DeleteSmsTemplate(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "模板 ID 不能为空")
	}
	return s.repo.DeleteSmsTemplate(ctx, uint64(id))
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func notificationTemplateToProto(t *NotificationTemplate) *notificationv1.NotificationTemplate {
	if t == nil {
		return nil
	}
	return &notificationv1.NotificationTemplate{
		Id:        int64(t.ID),
		Code:      t.Code,
		Name:      t.Name,
		Type:      int32(t.Type),
		Title:     t.Title,
		Content:   t.Content,
		Link:      t.Link,
		Enabled:   t.Enabled,
		UpdatedAt: timestamppb.New(t.UpdatedAt),
	}
}

func smsTemplateToProto(t *SmsTemplate) *notificationv1.SmsTemplate {
	if t == nil {
		return nil
	}
	return &notificationv1.SmsTemplate{
		Id:        int64(t.ID),
		Code:      t.Code,
		Name:      t.Name,
		Content:   t.Content,
		Enabled:   t.Enabled,
		UpdatedAt: timestamppb.New(t.UpdatedAt),
	}
}

// isDuplicateKey 判断数据库错误是否为唯一键冲突。
func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "Duplicate entry")
}
