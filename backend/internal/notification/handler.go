package notification

import (
	"context"
	"fmt"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"
)

// Handler 实现 NotificationService。
type Handler struct {
	notificationv1.UnimplementedNotificationServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Send 发送站内通知。
func (h *Handler) Send(ctx context.Context, req *notificationv1.SendNotificationRequest) (*commonv1.OperationResult, error) {
	sent, err := h.service.Send(ctx, req)
	if err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: fmt.Sprintf("通知已发送，共 %d 条", sent)}, nil
}

// List 查询用户通知。
func (h *Handler) List(ctx context.Context, req *notificationv1.ListNotificationsRequest) (*notificationv1.ListNotificationsResponse, error) {
	return h.service.List(ctx, req)
}

// MarkRead 标记单条通知已读。
func (h *Handler) MarkRead(ctx context.Context, req *notificationv1.MarkReadRequest) (*commonv1.OperationResult, error) {
	if err := h.service.MarkRead(ctx, req.GetUserId(), req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "已读"}, nil
}

// MarkAllRead 标记全部通知已读。
func (h *Handler) MarkAllRead(ctx context.Context, req *notificationv1.MarkAllReadRequest) (*commonv1.OperationResult, error) {
	affected, err := h.service.MarkAllRead(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{
		Success: true,
		Message: fmt.Sprintf("已全部标记为已读，共 %d 条", affected),
	}, nil
}

// GetUnreadCount 查询未读通知数。
func (h *Handler) GetUnreadCount(ctx context.Context, req *notificationv1.UnreadCountRequest) (*notificationv1.UnreadCountResponse, error) {
	count, err := h.service.GetUnreadCount(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return &notificationv1.UnreadCountResponse{Count: count}, nil
}

// SendSms 发送验证码短信。
func (h *Handler) SendSms(ctx context.Context, req *notificationv1.SendSmsRequest) (*notificationv1.SendSmsResponse, error) {
	return h.service.SendSms(ctx, req.GetPhone(), req.GetScene())
}

// ListSmsRecords 查询短信发送记录。
func (h *Handler) ListSmsRecords(ctx context.Context, req *notificationv1.ListSmsRecordsRequest) (*notificationv1.ListSmsRecordsResponse, error) {
	return h.service.ListSmsRecords(ctx, req)
}

// ListAuditLogs 查询操作审计日志。
func (h *Handler) ListAuditLogs(ctx context.Context, req *notificationv1.ListAuditLogsRequest) (*notificationv1.ListAuditLogsResponse, error) {
	return h.service.ListAuditLogs(ctx, req)
}

// ListSystemSettings 查询系统配置。
func (h *Handler) ListSystemSettings(ctx context.Context, req *notificationv1.ListSystemSettingsRequest) (*notificationv1.ListSystemSettingsResponse, error) {
	return h.service.ListSystemSettings(ctx, req.GetGroup())
}

// UpdateSystemSettings 批量更新系统配置。
func (h *Handler) UpdateSystemSettings(ctx context.Context, req *notificationv1.UpdateSystemSettingsRequest) (*notificationv1.ListSystemSettingsResponse, error) {
	return h.service.UpdateSystemSettings(ctx, req.GetGroup(), req.GetValues())
}

// ListNotificationTemplates 通知模板列表。
func (h *Handler) ListNotificationTemplates(ctx context.Context, req *notificationv1.ListNotificationTemplatesRequest) (*notificationv1.ListNotificationTemplatesResponse, error) {
	return h.service.ListNotificationTemplates(ctx, req)
}

// SaveNotificationTemplate 新增或更新通知模板。
func (h *Handler) SaveNotificationTemplate(ctx context.Context, req *notificationv1.SaveNotificationTemplateRequest) (*notificationv1.NotificationTemplate, error) {
	return h.service.SaveNotificationTemplate(ctx, req)
}

// DeleteNotificationTemplate 删除通知模板。
func (h *Handler) DeleteNotificationTemplate(ctx context.Context, req *notificationv1.DeleteNotificationTemplateRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteNotificationTemplate(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "通知模板已删除"}, nil
}

// ListSmsTemplates 短信模板列表。
func (h *Handler) ListSmsTemplates(ctx context.Context, req *notificationv1.ListSmsTemplatesRequest) (*notificationv1.ListSmsTemplatesResponse, error) {
	return h.service.ListSmsTemplates(ctx, req)
}

// SaveSmsTemplate 新增或更新短信模板。
func (h *Handler) SaveSmsTemplate(ctx context.Context, req *notificationv1.SaveSmsTemplateRequest) (*notificationv1.SmsTemplate, error) {
	return h.service.SaveSmsTemplate(ctx, req)
}

// DeleteSmsTemplate 删除短信模板。
func (h *Handler) DeleteSmsTemplate(ctx context.Context, req *notificationv1.DeleteSmsTemplateRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteSmsTemplate(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "短信模板已删除"}, nil
}

// ListSensitiveWords 敏感词列表。
func (h *Handler) ListSensitiveWords(ctx context.Context, req *notificationv1.ListSensitiveWordsRequest) (*notificationv1.ListSensitiveWordsResponse, error) {
	return h.service.ListSensitiveWords(ctx, req)
}

// SaveSensitiveWord 新增或更新敏感词。
func (h *Handler) SaveSensitiveWord(ctx context.Context, req *notificationv1.SaveSensitiveWordRequest) (*notificationv1.SensitiveWord, error) {
	return h.service.SaveSensitiveWord(ctx, req)
}

// DeleteSensitiveWord 删除敏感词。
func (h *Handler) DeleteSensitiveWord(ctx context.Context, req *notificationv1.DeleteSensitiveWordRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteSensitiveWord(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "敏感词已删除"}, nil
}

// ListNotificationCategories 通知分类列表。
func (h *Handler) ListNotificationCategories(ctx context.Context, req *notificationv1.ListNotificationCategoriesRequest) (*notificationv1.ListNotificationCategoriesResponse, error) {
	return h.service.ListNotificationCategories(ctx, req)
}
