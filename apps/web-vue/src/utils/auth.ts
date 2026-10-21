/**
 * 令牌与本地用户信息存取
 */

const ACCESS_TOKEN_KEY = 'ss_access_token'
const REFRESH_TOKEN_KEY = 'ss_refresh_token'
const USER_KEY = 'ss_user'

export function getAccessToken(): string {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
}

export function setAccessToken(token: string): void {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
  else localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) ?? ''
}

export function setRefreshToken(token: string): void {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
  else localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** 读取本地缓存的用户信息（用于首屏快速渲染） */
export function getCachedUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setCachedUser(user: unknown): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

/** 清空登录态 */
export function clearAuthStorage(): void {
  setAccessToken('')
  setRefreshToken('')
  setCachedUser(null)
}
