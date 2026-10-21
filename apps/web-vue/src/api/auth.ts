import { httpPost } from '@/api/client'
import * as mock from '@/mock'
import type { AuthResponse } from '@/types'

/** 账号密码登录 */
export function login(params: {
  username: string
  password: string
}): Promise<AuthResponse> {
  return httpPost<AuthResponse>(
    '/api/v1/auth/login',
    params,
    { fallback: () => mock.login(params), silent: true },
  )
}

/** 注册 */
export function register(params: {
  username: string
  password: string
  phone?: string
  nickname?: string
  sms_code?: string
}): Promise<AuthResponse> {
  return httpPost<AuthResponse>(
    '/api/v1/auth/register',
    params,
    { fallback: () => mock.register(params), silent: true },
  )
}

/** 微信登录（演示环境后端会返回 mock 用户） */
export function loginWithWeChat(params: {
  code: string
  nickname?: string
  avatar?: string
}): Promise<AuthResponse> {
  return httpPost<AuthResponse>(
    '/api/v1/auth/wechat',
    params,
    { fallback: () => mock.login({ username: 'wechat_user' }), silent: true },
  )
}

/** 刷新令牌 */
export function refreshToken(params: { refresh_token: string }): Promise<AuthResponse> {
  return httpPost<AuthResponse>('/api/v1/auth/refresh', params, { silent: true })
}

/** 退出登录 */
export function logout(): Promise<{ success: boolean; message: string }> {
  return httpPost('/api/v1/auth/logout', {}, {
    fallback: () => ({ success: true, message: '已退出登录' }),
    silent: true,
  })
}
