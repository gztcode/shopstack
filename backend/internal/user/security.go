package user

import (
	"context"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// 实名认证状态
const (
	RealnameStatusUnverified = 0 // 未认证
	RealnameStatusVerified   = 1 // 已认证
	RealnameStatusReviewing  = 2 // 审核中
)

// 账号安全风险等级
const (
	AccountRiskSafe    = 0 // 安全
	AccountRiskMedium  = 1 // 中
	AccountRiskHigh    = 2 // 高
	passwordExpiryDays = 180
)

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// GetAccountSecurity 查询账号安全视图。
//
// 汇总用户已绑定的登录方式、实名认证状态与密码更新情况，
// 并据此给出风险等级与改进建议。
func (s *Service) GetAccountSecurity(ctx context.Context, userID int64) (*userv1.AccountSecurityInfo, error) {
	u, err := s.repo.FindUserByID(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}

	info := &userv1.AccountSecurityInfo{
		PhoneBound:       strings.TrimSpace(u.Phone) != "",
		EmailBound:       strings.TrimSpace(u.Email) != "",
		WechatBound:      strings.TrimSpace(u.WeChatOpenID) != "",
		RealnameVerified: u.RealnameStatus == RealnameStatusVerified && strings.TrimSpace(u.RealName) != "",
		Warnings:         []string{},
	}

	// 密码更新时间：未单独记录时回退到账号创建时间。
	passwordChangedAt := u.PasswordChangedAt
	if passwordChangedAt == nil {
		passwordChangedAt = &u.CreatedAt
	}
	info.PasswordChangedAt = tsPtr(passwordChangedAt)

	unbound := 0
	if !info.PhoneBound {
		unbound++
		info.Warnings = append(info.Warnings, "尚未绑定手机号，账号找回能力较弱")
	}
	if !info.EmailBound {
		unbound++
		info.Warnings = append(info.Warnings, "尚未绑定邮箱，无法接收邮件通知")
	}
	if !info.WechatBound {
		unbound++
		info.Warnings = append(info.Warnings, "尚未绑定微信，无法使用微信快捷登录")
	}
	if !info.RealnameVerified {
		info.Warnings = append(info.Warnings, "尚未完成实名认证，部分业务将受限")
	}
	if time.Since(*passwordChangedAt) > time.Duration(passwordExpiryDays)*24*time.Hour {
		info.Warnings = append(info.Warnings, "密码已超过 "+strconv.Itoa(passwordExpiryDays)+" 天未更新，建议尽快修改")
	}

	switch {
	case unbound >= 2:
		info.RiskLevel = AccountRiskHigh
	case unbound == 1:
		info.RiskLevel = AccountRiskMedium
	default:
		info.RiskLevel = AccountRiskSafe
	}

	return info, nil
}

// RealNameAuth 提交实名认证。
//
// 校验姓名与身份证号格式后写入用户档案并置为已认证状态。
// 身份证号仅用于本次格式与校验位验证，不落库存储。
func (s *Service) RealNameAuth(ctx context.Context, userID int64, req *userv1.RealNameAuthRequest) (*userv1.User, error) {
	realName := strings.TrimSpace(req.GetRealName())
	if realName == "" {
		return nil, errs.Invalid("真实姓名不能为空")
	}
	if !isValidRealName(realName) {
		return nil, errs.Invalid("真实姓名格式不正确")
	}
	if err := validateIDCard(strings.TrimSpace(req.GetIdCard())); err != nil {
		return nil, err
	}

	fields := map[string]any{
		"real_name":       realName,
		"realname_status": RealnameStatusVerified,
	}
	if err := s.repo.UpdateUser(ctx, uint64(userID), fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存实名认证信息失败", err)
	}

	logger.L().Info("用户完成实名认证", zap.Int64("用户ID", userID))

	u, err := s.repo.FindUserByID(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	out := userToProto(u)
	s.fillUserGrowth(ctx, out, userID)
	return out, nil
}

// ---------------------------------------------------------------------------
// 校验
// ---------------------------------------------------------------------------

// isValidRealName 校验真实姓名：2~20 位中文、字母或间隔号。
func isValidRealName(name string) bool {
	runes := []rune(name)
	if len(runes) < 2 || len(runes) > 20 {
		return false
	}
	for _, r := range runes {
		switch {
		case r >= '一' && r <= '龥':
		case r >= 'A' && r <= 'Z':
		case r >= 'a' && r <= 'z':
		case r == '·':
		default:
			return false
		}
	}
	return true
}

// validateIDCard 校验中国大陆居民身份证号。
//
// 支持 15 位旧版身份证号与 18 位新版身份证号；
// 18 位号码会校验出生日期与 ISO 7064 MOD 11-2 校验位。
func validateIDCard(idCard string) error {
	switch len(idCard) {
	case 15:
		for _, r := range idCard {
			if r < '0' || r > '9' {
				return errs.Invalid("身份证号格式不正确")
			}
		}
		if _, err := time.Parse("060102", idCard[6:12]); err != nil {
			return errs.Invalid("身份证号中的出生日期不正确")
		}
		return nil
	case 18:
		return validateIDCard18(idCard)
	default:
		return errs.Invalid("身份证号格式不正确")
	}
}

// validateIDCard18 校验 18 位身份证号。
func validateIDCard18(idCard string) error {
	for i, r := range idCard {
		switch i {
		case 17:
			// 校验位允许是数字或大写 X。
			if r != 'X' && (r < '0' || r > '9') {
				return errs.Invalid("身份证号格式不正确")
			}
		default:
			if r < '0' || r > '9' {
				return errs.Invalid("身份证号格式不正确")
			}
		}
	}

	birth, err := time.Parse("20060102", idCard[6:14])
	if err != nil {
		return errs.Invalid("身份证号中的出生日期不正确")
	}
	if birth.After(time.Now()) {
		return errs.Invalid("身份证号中的出生日期不正确")
	}

	weights := []int{7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2}
	checkCodes := []byte{'1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'}
	sum := 0
	for i := 0; i < 17; i++ {
		sum += int(idCard[i]-'0') * weights[i]
	}
	if checkCodes[sum%11] != idCard[17] {
		return errs.Invalid("身份证号校验位不正确")
	}
	return nil
}
