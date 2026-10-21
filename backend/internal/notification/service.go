package notification

import (
	"context"
	"regexp"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	notificationv1 "github.com/shopstack/platform/gen/go/notification/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/cache"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/thirdparty"
)

// 验证码相关参数。
const (
	// SmsCodeTTL 验证码有效期（秒）。
	SmsCodeTTL = 300
	// SmsCodeLength 验证码长度。
	SmsCodeLength = 6
	// SmsLimitInterval 同一手机号两次发送的最小间隔（秒）。
	SmsLimitInterval = 60
)

// 短信频率限制与验证码存储的 Redis key 前缀。
const (
	smsLimitKeyPrefix = "shop:sms:limit:"
	smsCodeKeyPrefix  = "shop:sms:code:"
)

// phonePattern 校验手机号格式（国内 11 位或带国际区号）。
var phonePattern = regexp.MustCompile(`^\+?[0-9]{6,20}$`)

// Service 承载通知域的业务逻辑。
type Service struct {
	repo      *Repo
	providers *thirdparty.Providers
	cache     *cache.Client
	codes     thirdparty.CodeStore
}

// NewService 构造通知服务。
//
// cache 为 nil 表示 Redis 不可用，此时短信频率限制会被跳过。
func NewService(repo *Repo, providers *thirdparty.Providers, cacheClient *cache.Client) *Service {
	return &Service{
		repo:      repo,
		providers: providers,
		cache:     cacheClient,
		codes:     thirdparty.NewCodeStore(),
	}
}

// ---------------------------------------------------------------------------
// 站内通知
// ---------------------------------------------------------------------------

// Send 发送站内通知，支持单个用户与群发。
func (s *Service) Send(ctx context.Context, req *notificationv1.SendNotificationRequest) (int, error) {
	title := strings.TrimSpace(req.GetTitle())
	if title == "" {
		return 0, errs.New(errs.CodeInvalidParam, "通知标题不能为空")
	}
	// 敏感词过滤：标题或正文命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, title, req.GetContent()); err != nil {
		return 0, err
	}
	nt, err := mapNotificationType(req.GetType())
	if err != nil {
		return 0, err
	}

	targets := make([]uint64, 0, len(req.GetUserIds())+1)
	if req.GetUserId() > 0 {
		targets = append(targets, uint64(req.GetUserId()))
	}
	for _, id := range req.GetUserIds() {
		if id <= 0 {
			continue
		}
		uid := uint64(id)
		exist := false
		for _, t := range targets {
			if t == uid {
				exist = true
				break
			}
		}
		if !exist {
			targets = append(targets, uid)
		}
	}
	if len(targets) == 0 {
		return 0, errs.New(errs.CodeInvalidParam, "缺少通知接收人")
	}

	sent := 0
	for _, uid := range targets {
		n := &Notification{
			UserID:  uid,
			Type:    nt,
			Title:   title,
			Content: req.GetContent(),
			Link:    req.GetLink(),
			BizID:   uint64(req.GetBizId()),
			Read:    false,
		}
		if err := s.repo.CreateNotification(ctx, n); err != nil {
			return sent, errs.Wrap(errs.CodeInternalError, "发送通知失败", err)
		}
		sent++
	}
	return sent, nil
}

// List 分页查询用户通知。
func (s *Service) List(ctx context.Context, req *notificationv1.ListNotificationsRequest) (*notificationv1.ListNotificationsResponse, error) {
	userID := uint64(resolveUserID(ctx, req.GetUserId()))
	if userID == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListNotifications(ctx, NotificationQuery{
		UserID:     userID,
		Type:       req.GetType(),
		UnreadOnly: req.GetUnreadOnly(),
		Page:       page,
		PageSize:   pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询通知失败", err)
	}
	out := make([]*notificationv1.Notification, 0, len(list))
	for i := range list {
		out = append(out, notificationToProto(&list[i]))
	}
	unread, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计未读通知失败", err)
	}
	return &notificationv1.ListNotificationsResponse{
		Notifications: out,
		Meta:          buildMeta(page, pageSize, total),
		UnreadCount:   int32(unread),
	}, nil
}

// MarkRead 标记单条通知已读。
func (s *Service) MarkRead(ctx context.Context, userID, id int64) error {
	userID = resolveUserID(ctx, userID)
	if userID <= 0 {
		return errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "通知 ID 不能为空")
	}
	n, err := s.repo.FindNotificationByID(ctx, uint64(id))
	if err != nil {
		return err
	}
	if n.UserID != uint64(userID) {
		return errs.New(errs.CodeForbidden, "无权操作他人的通知")
	}
	if err := s.repo.MarkRead(ctx, uint64(userID), uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "标记通知已读失败", err)
	}
	return nil
}

// MarkAllRead 标记用户全部通知已读。
func (s *Service) MarkAllRead(ctx context.Context, userID int64) (int64, error) {
	userID = resolveUserID(ctx, userID)
	if userID <= 0 {
		return 0, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	affected, err := s.repo.MarkAllRead(ctx, uint64(userID))
	if err != nil {
		return 0, errs.Wrap(errs.CodeInternalError, "标记通知已读失败", err)
	}
	return affected, nil
}

// GetUnreadCount 查询用户未读通知数。
func (s *Service) GetUnreadCount(ctx context.Context, userID int64) (int32, error) {
	userID = resolveUserID(ctx, userID)
	if userID <= 0 {
		return 0, errs.New(errs.CodeInvalidParam, "用户 ID 不能为空")
	}
	count, err := s.repo.CountUnread(ctx, uint64(userID))
	if err != nil {
		return 0, errs.Wrap(errs.CodeInternalError, "统计未读通知失败", err)
	}
	return int32(count), nil
}

// ---------------------------------------------------------------------------
// 短信验证码
// ---------------------------------------------------------------------------

// SendSms 发送验证码短信。
//
// 演示环境下直接把验证码返回给调用方，便于前端自动完成登录流程。
func (s *Service) SendSms(ctx context.Context, phone, scene string) (*notificationv1.SendSmsResponse, error) {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return nil, errs.New(errs.CodeInvalidParam, "手机号不能为空")
	}
	if !phonePattern.MatchString(phone) {
		return nil, errs.New(errs.CodeInvalidParam, "手机号格式不正确")
	}
	scene = normalizeScene(scene)

	// 敏感词过滤：场景与短信模板内容命中启用中的敏感词时拒绝发送
	if err := s.checkSensitiveWords(ctx, scene, s.smsTemplateContent(ctx, scene)); err != nil {
		return nil, err
	}

	// 频率限制：同一手机号 60 秒内只允许发送一次
	limitKey := smsLimitKeyPrefix + phone
	if err := s.checkSmsLimit(ctx, limitKey); err != nil {
		return nil, err
	}

	code := thirdparty.RandomCode(SmsCodeLength)
	s.codes.Save(smsCodeKey(scene, phone), code, SmsCodeTTL*time.Second)

	if err := s.providers.SMS.Send(ctx, phone, scene, code); err != nil {
		// 发送失败时释放频率限制，允许用户立即重试
		s.releaseSmsLimit(ctx, limitKey)
		s.recordSms(ctx, phone, code, scene, SmsStatusFailed, err.Error())
		s.writeAuditLog(ctx, "sms", "send", phone, err.Error())
		return nil, errs.Wrap(errs.CodeNotificationFail, "短信发送失败", err)
	}

	s.recordSms(ctx, phone, code, scene, SmsStatusSuccess, "")
	logger.L().Info("验证码短信已发送",
		zap.String("手机号", phone), zap.String("场景", scene))
	return &notificationv1.SendSmsResponse{
		Success:       true,
		Code:          code,
		ExpireSeconds: SmsCodeTTL,
	}, nil
}

// smsTemplateContent 返回场景对应的短信模板内容。
//
// 模板不存在或已停用时返回空字符串。
func (s *Service) smsTemplateContent(ctx context.Context, scene string) string {
	tpl, err := s.repo.FindSmsTemplateByCode(ctx, scene)
	if err != nil || tpl == nil || !tpl.Enabled {
		return ""
	}
	return tpl.Content
}

// VerifySmsCode 校验短信验证码。
//
// 校验通过后验证码立即失效；失败时返回具体的错误提示。
func (s *Service) VerifySmsCode(phone, scene, code string) (bool, string) {
	phone = strings.TrimSpace(phone)
	if phone == "" || strings.TrimSpace(code) == "" {
		return false, "手机号与验证码不能为空"
	}
	ok, msg := s.codes.Verify(smsCodeKey(normalizeScene(scene), phone), strings.TrimSpace(code))
	return ok, msg
}

// checkSmsLimit 检查并占用短信发送频率限制。
func (s *Service) checkSmsLimit(ctx context.Context, key string) error {
	if s.cache == nil {
		logger.L().Warn("Redis 不可用，跳过短信频率限制")
		return nil
	}
	ok, err := s.cache.SetNX(ctx, key, "1", SmsLimitInterval*time.Second)
	if err != nil {
		logger.L().Warn("短信频率限制检查失败，跳过限制", zap.Error(err))
		return nil
	}
	if !ok {
		return errs.New(errs.CodeTooManyReq, "验证码发送过于频繁，请 60 秒后再试")
	}
	return nil
}

// releaseSmsLimit 释放短信频率限制。
func (s *Service) releaseSmsLimit(ctx context.Context, key string) {
	if s.cache == nil {
		return
	}
	if err := s.cache.Del(ctx, key); err != nil {
		logger.L().Warn("释放短信频率限制失败", zap.Error(err))
	}
}

// recordSms 写入短信发送记录。
func (s *Service) recordSms(ctx context.Context, phone, code, scene string, status int8, errMsg string) {
	count, err := s.repo.CountSmsByPhoneScene(ctx, phone, scene)
	if err != nil {
		logger.L().Warn("统计短信发送次数失败", zap.Error(err))
		count = 0
	}
	rec := &SmsRecord{
		Phone:        phone,
		Code:         code,
		Scene:        scene,
		Status:       status,
		ErrorMessage: errMsg,
		SendCount:    int32(count + 1),
	}
	if err := s.repo.CreateSmsRecord(ctx, rec); err != nil {
		logger.L().Warn("写入短信记录失败", zap.Error(err))
	}
}

// writeAuditLog 写入操作审计日志。
func (s *Service) writeAuditLog(ctx context.Context, module, action, targetID, errMsg string) {
	result := int8(1)
	if errMsg != "" {
		result = 0
	}
	log := &AuditLog{
		Module:       module,
		Action:       action,
		TargetType:   "sms",
		TargetID:     targetID,
		Detail:       "发送短信验证码",
		Result:       result,
		ErrorMessage: errMsg,
	}
	if err := s.repo.CreateAuditLog(ctx, log); err != nil {
		logger.L().Warn("写入审计日志失败", zap.Error(err))
	}
}

// ListSmsRecords 分页查询短信发送记录。
func (s *Service) ListSmsRecords(ctx context.Context, req *notificationv1.ListSmsRecordsRequest) (*notificationv1.ListSmsRecordsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListSmsRecords(ctx, SmsRecordQuery{
		Phone:    strings.TrimSpace(req.GetPhone()),
		Scene:    strings.TrimSpace(req.GetScene()),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询短信记录失败", err)
	}
	out := make([]*notificationv1.SmsRecord, 0, len(list))
	for i := range list {
		out = append(out, smsRecordToProto(&list[i]))
	}
	return &notificationv1.ListSmsRecordsResponse{Records: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// ---------------------------------------------------------------------------
// 审计日志
// ---------------------------------------------------------------------------

// ListAuditLogs 分页查询操作审计日志。
func (s *Service) ListAuditLogs(ctx context.Context, req *notificationv1.ListAuditLogsRequest) (*notificationv1.ListAuditLogsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	q := AuditLogQuery{
		Module:   strings.TrimSpace(req.GetModule()),
		Action:   strings.TrimSpace(req.GetAction()),
		AdminID:  req.GetAdminId(),
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		Page:     page,
		PageSize: pageSize,
	}
	if req.GetStartTime() > 0 {
		t := time.Unix(req.GetStartTime(), 0)
		q.StartTime = &t
	}
	if req.GetEndTime() > 0 {
		t := time.Unix(req.GetEndTime(), 0)
		q.EndTime = &t
	}

	list, total, err := s.repo.ListAuditLogs(ctx, q)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询审计日志失败", err)
	}
	out := make([]*notificationv1.AuditLog, 0, len(list))
	for i := range list {
		out = append(out, auditLogToProto(&list[i]))
	}
	return &notificationv1.ListAuditLogsResponse{Logs: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// ---------------------------------------------------------------------------
// 系统配置
// ---------------------------------------------------------------------------

// ListSystemSettings 查询系统配置，group 为空时返回全部。
func (s *Service) ListSystemSettings(ctx context.Context, group string) (*notificationv1.ListSystemSettingsResponse, error) {
	list, err := s.repo.ListSystemSettings(ctx, strings.TrimSpace(group))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询系统配置失败", err)
	}
	out := make([]*notificationv1.SystemSetting, 0, len(list))
	for i := range list {
		out = append(out, systemSettingToProto(&list[i]))
	}
	return &notificationv1.ListSystemSettingsResponse{Settings: out}, nil
}

// UpdateSystemSettings 按 key 批量更新系统配置值。
//
// values 的 key 必须已存在于配置表中，未知 key 会被忽略，
// 返回更新后的完整配置列表，方便前端直接刷新表单。
func (s *Service) UpdateSystemSettings(ctx context.Context, group string, values map[string]string) (*notificationv1.ListSystemSettingsResponse, error) {
	if len(values) == 0 {
		return nil, errs.Invalid("没有需要更新的配置项")
	}

	existing, err := s.repo.ListSystemSettings(ctx, strings.TrimSpace(group))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询系统配置失败", err)
	}
	known := make(map[string]struct{}, len(existing))
	for i := range existing {
		known[existing[i].Key] = struct{}{}
	}

	for key, value := range values {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, ok := known[key]; !ok {
			logger.L().Warn("忽略不存在的系统配置项", zap.String("配置键", key))
			continue
		}
		if err := s.repo.UpdateSystemSetting(ctx, key, value); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "更新系统配置失败", err)
		}
		logger.L().Info("系统配置已更新",
			zap.String("配置键", key), zap.String("配置值", value),
			zap.String("操作人", auth.UsernameFromContext(ctx)))
	}

	return s.ListSystemSettings(ctx, group)
}

// resolveUserID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
func resolveUserID(ctx context.Context, requested int64) int64 {
	if requested > 0 {
		return requested
	}
	return auth.UserIDFromContext(ctx)
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func notificationToProto(n *Notification) *notificationv1.Notification {
	if n == nil {
		return nil
	}
	out := &notificationv1.Notification{
		Id:        int64(n.ID),
		UserId:    int64(n.UserID),
		Type:      commonv1.NotificationType(n.Type),
		Title:     n.Title,
		Content:   n.Content,
		Link:      n.Link,
		BizId:     int64(n.BizID),
		Read:      n.Read,
		CreatedAt: timestamppb.New(n.CreatedAt),
	}
	if n.ReadAt != nil {
		out.ReadAt = timestamppb.New(*n.ReadAt)
	}
	return out
}

func smsRecordToProto(r *SmsRecord) *notificationv1.SmsRecord {
	if r == nil {
		return nil
	}
	return &notificationv1.SmsRecord{
		Id:           int64(r.ID),
		Phone:        r.Phone,
		Code:         r.Code,
		Scene:        r.Scene,
		Status:       int32(r.Status),
		ErrorMessage: r.ErrorMessage,
		SendCount:    r.SendCount,
		CreatedAt:    timestamppb.New(r.CreatedAt),
	}
}

func auditLogToProto(l *AuditLog) *notificationv1.AuditLog {
	if l == nil {
		return nil
	}
	return &notificationv1.AuditLog{
		Id:           int64(l.ID),
		AdminId:      int64(l.AdminID),
		AdminName:    l.AdminName,
		Module:       l.Module,
		Action:       l.Action,
		TargetType:   l.TargetType,
		TargetId:     l.TargetID,
		Detail:       l.Detail,
		Ip:           l.IP,
		UserAgent:    l.UserAgent,
		Result:       int32(l.Result),
		ErrorMessage: l.ErrorMessage,
		CreatedAt:    timestamppb.New(l.CreatedAt),
	}
}

// systemSettingToProto 把系统配置模型转换为 protobuf 消息。
func systemSettingToProto(s *SystemSetting) *notificationv1.SystemSetting {
	if s == nil {
		return nil
	}
	return &notificationv1.SystemSetting{
		Id:          int64(s.ID),
		Key:         s.Key,
		Value:       s.Value,
		Name:        s.Name,
		Group:       s.Group,
		Description: s.Description,
		ValueType:   s.ValueType,
		UpdatedAt:   timestamppb.New(s.UpdatedAt),
	}
}

// mapNotificationType 把请求中的类型映射为通知类型。
func mapNotificationType(t int32) (int8, error) {
	switch t {
	case 0, NotificationTypeSystem:
		return NotificationTypeSystem, nil
	case NotificationTypeOrder, NotificationTypeLogistics, NotificationTypePromotion:
		return int8(t), nil
	default:
		return 0, errs.New(errs.CodeInvalidParam, "通知类型不合法")
	}
}

// normalizeScene 规范化短信场景。
func normalizeScene(scene string) string {
	scene = strings.ToLower(strings.TrimSpace(scene))
	if scene == "" {
		return "login"
	}
	return scene
}

// smsCodeKey 生成验证码存储键。
func smsCodeKey(scene, phone string) string {
	return smsCodeKeyPrefix + scene + ":" + phone
}

func normalizePage(page *commonv1.PageRequest) (int, int) {
	pageNum := int(page.GetPage())
	pageSize := int(page.GetPageSize())
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return pageNum, pageSize
}

func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page: int32(page), PageSize: int32(pageSize),
		Total: total, TotalPages: int32(totalPages),
	}
}
