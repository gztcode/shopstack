package user

import (
	"encoding/json"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"
)

// userToProto 把用户模型转换为 protobuf 消息。
func userToProto(u *User) *userv1.User {
	if u == nil {
		return nil
	}
	out := &userv1.User{
		Id:             int64(u.ID),
		Username:       u.Username,
		Nickname:       u.Nickname,
		Avatar:         u.Avatar,
		Phone:          u.Phone,
		Email:          u.Email,
		Gender:         commonv1.Gender(u.Gender),
		Points:         int32(u.Points),
		BalanceCents:   u.BalanceCents,
		Status:         commonv1.UserStatus(u.Status),
		WechatOpenid:   u.WeChatOpenID,
		RealName:       u.RealName,
		RealnameStatus: int32(u.RealnameStatus),
		CreatedAt:      timestamppb.New(u.CreatedAt),
	}
	if u.Birthday != nil {
		out.Birthday = u.Birthday.Format("2006-01-02")
	}
	if u.LastLoginAt != nil {
		out.LastLoginAt = timestamppb.New(*u.LastLoginAt)
	}
	return out
}

// addressToProto 把地址模型转换为 protobuf 消息。
func addressToProto(a *UserAddress) *commonv1.Address {
	if a == nil {
		return nil
	}
	return &commonv1.Address{
		Id:         int64(a.ID),
		Receiver:   a.Receiver,
		Phone:      a.Phone,
		Province:   a.Province,
		City:       a.City,
		District:   a.District,
		Detail:     a.Detail,
		PostalCode: a.PostalCode,
		Tag:        a.Tag,
		IsDefault:  a.IsDefault,
	}
}

// userLevelToProto 把会员等级模型转换为 protobuf 消息。
func userLevelToProto(l *UserLevel) *userv1.UserLevel {
	if l == nil {
		return nil
	}
	return &userv1.UserLevel{
		Id:              int64(l.ID),
		Name:            l.Name,
		Level:           int32(l.Level),
		MinGrowth:       int32(l.MinGrowth),
		MaxGrowth:       int32(l.MaxGrowth),
		DiscountPercent: int32(l.DiscountPercent),
		Icon:            l.Icon,
		Description:     l.Description,
		Benefits:        decodeStringArray(l.Benefits),
		Sort:            int32(l.Sort),
	}
}

// userLevelsToProto 批量转换会员等级模型。
func userLevelsToProto(list []UserLevel) []*userv1.UserLevel {
	out := make([]*userv1.UserLevel, 0, len(list))
	for i := range list {
		out = append(out, userLevelToProto(&list[i]))
	}
	return out
}

// regionToProto 把行政区域模型转换为 protobuf 消息。
func regionToProto(r *Region) *userv1.Region {
	if r == nil {
		return nil
	}
	return &userv1.Region{
		Id:       int64(r.ID),
		ParentId: int64(r.ParentID),
		Name:     r.Name,
		Code:     r.Code,
		Level:    int32(r.Level),
		Sort:     int32(r.Sort),
	}
}

// invoiceTemplateToProto 把发票抬头模板模型转换为 protobuf 消息。
func invoiceTemplateToProto(t *InvoiceTemplate) *userv1.InvoiceTemplate {
	if t == nil {
		return nil
	}
	return &userv1.InvoiceTemplate{
		Id:          int64(t.ID),
		UserId:      int64(t.UserID),
		Title:       t.Title,
		TaxNo:       t.TaxNo,
		Type:        t.Type,
		Email:       t.Email,
		Phone:       t.Phone,
		Address:     t.Address,
		BankName:    t.BankName,
		BankAccount: t.BankAccount,
		IsDefault:   t.IsDefault,
		CreatedAt:   tsPtr(&t.CreatedAt),
	}
}

// notificationSettingToProto 把通知偏好模型转换为 protobuf 消息。
func notificationSettingToProto(s *NotificationSetting) *userv1.UserNotificationSettings {
	if s == nil {
		return nil
	}
	return &userv1.UserNotificationSettings{
		UserId:          int64(s.UserID),
		OrderNotice:     s.OrderNotice,
		LogisticsNotice: s.LogisticsNotice,
		MarketingNotice: s.MarketingNotice,
		SystemNotice:    s.SystemNotice,
		SmsNotice:       s.SmsNotice,
		EmailNotice:     s.EmailNotice,
		WechatNotice:    s.WechatNotice,
	}
}

// feedbackToProto 把用户反馈模型转换为 protobuf 消息。
func feedbackToProto(f *Feedback) *userv1.Feedback {
	if f == nil {
		return nil
	}
	return &userv1.Feedback{
		Id:           int64(f.ID),
		UserId:       int64(f.UserID),
		UserNickname: f.UserNickname,
		Type:         int32(f.Type),
		Content:      f.Content,
		Images:       decodeStringArray(f.Images),
		Contact:      f.Contact,
		Status:       int32(f.Status),
		Reply:        f.Reply,
		CreatedAt:    tsPtr(&f.CreatedAt),
		ProcessedAt:  tsPtr(f.ProcessedAt),
	}
}

// helpArticleToProto 把帮助文章模型转换为 protobuf 消息。
func helpArticleToProto(a *HelpArticle) *userv1.HelpArticle {
	if a == nil {
		return nil
	}
	return &userv1.HelpArticle{
		Id:           int64(a.ID),
		CategoryId:   int64(a.CategoryID),
		CategoryName: a.CategoryName,
		Title:        a.Title,
		Content:      a.Content,
		Sort:         int32(a.Sort),
		Enabled:      a.Enabled,
		ViewCount:    int32(a.ViewCount),
		CreatedAt:    tsPtr(&a.CreatedAt),
	}
}

// encodeStringArray 把字符串列表编码为 JSON 数组文本，便于存入 varchar 字段。
func encodeStringArray(items []string) string {
	if len(items) == 0 {
		return ""
	}
	raw, err := json.Marshal(items)
	if err != nil {
		return ""
	}
	return string(raw)
}

// decodeStringArray 解析以 JSON 数组文本存储的字符串列表，兼容逗号分隔的历史数据。
func decodeStringArray(raw string) []string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	if strings.HasPrefix(trimmed, "[") {
		var out []string
		if err := json.Unmarshal([]byte(trimmed), &out); err == nil {
			return out
		}
		return nil
	}
	parts := strings.Split(trimmed, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// normalizePage 归一化分页参数。
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

// buildMeta 构造分页元信息。
func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page:       int32(page),
		PageSize:   int32(pageSize),
		Total:      total,
		TotalPages: int32(totalPages),
	}
}

// int64sToUint64 批量转换。
func int64sToUint64(in []uint64) []int64 {
	out := make([]int64, 0, len(in))
	for _, v := range in {
		out = append(out, int64(v))
	}
	return out
}

// tsPtr 把时间指针转换为 protobuf 时间戳。
func tsPtr(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}
	return timestamppb.New(*t)
}
