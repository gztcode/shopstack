package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// runAuthChain 巡检认证相关接口。
//
// 这条链路必须成组执行，因为单独验证其中任何一环都缺少前置状态：
//
//	注册 → 登录 → 刷新令牌 → 修改密码 → 用新密码登录 → 微信登录 → 禁用新用户 → 登出
//
// 之所以独立成链而没有并入通用用例表：
//   - 修改密码会改掉账号凭据，一旦中途失败会把 demo 账号锁死，
//     所以全程使用巡检自己注册的一次性账号，不碰既有用户。
//   - 登录响应里的 refresh_token 无法用通用的 capture 机制拿到
//     （它不是主键字段），需要在链内直接读取。
func runAuthChain(client *http.Client, gateway, uniq string) {
	username := "sweep_" + uniq
	password := "sweep123456"
	newPassword := "sweep654321"

	// 1. 注册一次性账号
	type authResp struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			User         struct {
				ID int64 `json:"id"`
			} `json:"user"`
		} `json:"data"`
	}
	var reg authResp
	postJSON(client, gateway+"/api/v1/auth/register", map[string]any{
		"username": username,
		"password": password,
		"nickname": "巡检账号" + uniq,
	}, &reg)
	if reg.Code != 0 {
		record("认证-注册", fmt.Errorf("code=%d %s", reg.Code, reg.Msg), "")
		return
	}
	record("认证-注册", nil, fmt.Sprintf("新账号=%s id=%d", username, reg.Data.User.ID))
	newUserID := reg.Data.User.ID

	// 2. 用新账号登录
	var login authResp
	postJSON(client, gateway+"/api/v1/auth/login", map[string]any{
		"username": username,
		"password": password,
	}, &login)
	if login.Code != 0 {
		record("认证-登录新账号", fmt.Errorf("code=%d %s", login.Code, login.Msg), "")
		return
	}
	record("认证-登录新账号", nil, "登录成功")
	newToken := login.Data.AccessToken

	// 3. 刷新令牌
	var refresh authResp
	postJSON(client, gateway+"/api/v1/auth/refresh", map[string]any{
		"refresh_token": login.Data.RefreshToken,
	}, &refresh)
	if refresh.Code != 0 {
		record("认证-刷新令牌", fmt.Errorf("code=%d %s", refresh.Code, refresh.Msg), "")
	} else {
		record("认证-刷新令牌", nil, "已签发新令牌")
	}

	// 4. 修改密码
	var chg struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
	}
	postJSON(client, gateway+"/api/v1/users/password", map[string]any{
		"old_password": password,
		"new_password": newPassword,
	}, &chg, newToken)
	if chg.Code != 0 {
		record("认证-修改密码", fmt.Errorf("code=%d %s", chg.Code, chg.Msg), "")
	} else {
		record("认证-修改密码", nil, "密码已更新")
	}

	// 5. 用新密码登录，验证修改确实生效
	var relogin authResp
	postJSON(client, gateway+"/api/v1/auth/login", map[string]any{
		"username": username,
		"password": newPassword,
	}, &relogin)
	if relogin.Code != 0 {
		record("认证-新密码登录", fmt.Errorf("code=%d %s", relogin.Code, relogin.Msg), "")
	} else {
		record("认证-新密码登录", nil, "新密码生效")
	}

	// 6. 微信登录（第三方 Mock 通道）
	var wechat struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
	}
	postJSON(client, gateway+"/api/v1/auth/wechat", map[string]any{
		"code":     "sweep_wx_code_" + uniq,
		"nickname": "巡检微信用户" + uniq,
	}, &wechat)
	switch {
	case wechat.Code == 0:
		record("认证-微信登录", nil, "Mock 通道登录成功")
	default:
		// 第三方通道不可用时记录为警告，不算失败。
		recordWarn("认证-微信登录", fmt.Sprintf("第三方通道返回 code=%d %s", wechat.Code, truncate(wechat.Msg, 40)))
	}

	// 7. 后台禁用一次性账号
	adminToken := loginForSweep(client, gateway, "/api/v1/admin/auth/login", "admin", "admin123456")
	if adminToken != "" {
		var setStatus struct {
			Code int    `json:"code"`
			Msg  string `json:"message"`
		}
		sendJSON(client, http.MethodPut,
			fmt.Sprintf("%s/api/v1/admin/users/%d/status", gateway, newUserID),
			// 用户状态：1 正常、2 禁用、3 冻结。
			json.RawMessage(`{"status":2,"reason":"巡检禁用一次性账号"}`), &setStatus, adminToken)
		if setStatus.Code != 0 {
			record("后台-禁用用户", fmt.Errorf("code=%d %s", setStatus.Code, setStatus.Msg), "")
		} else {
			record("后台-禁用用户", nil, fmt.Sprintf("已禁用巡检账号 id=%d", newUserID))
		}
	} else {
		record("后台-禁用用户", fmt.Errorf("管理员登录失败"), "")
	}

	// 8. 登出
	var logout struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
	}
	postJSON(client, gateway+"/api/v1/auth/logout", map[string]any{}, &logout, newToken)
	if logout.Code != 0 {
		record("认证-登出", fmt.Errorf("code=%d %s", logout.Code, logout.Msg), "")
	} else {
		record("认证-登出", nil, "已登出")
	}
}
