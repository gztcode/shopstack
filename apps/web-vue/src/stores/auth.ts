import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as authApi from '@/api/auth'
import { getProfile } from '@/api/user'
import type { AuthResponse, User } from '@/types'
import {
  clearAuthStorage,
  getAccessToken,
  getCachedUser,
  getRefreshToken,
  setAccessToken,
  setCachedUser,
  setRefreshToken,
} from '@/utils/auth'

/**
 * 登录态与用户信息
 */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(getAccessToken())
  const refreshToken = ref(getRefreshToken())
  const user = ref<User | null>(getCachedUser<User>())
  const loading = ref(false)

  const isLoggedIn = computed(() => Boolean(accessToken.value))
  const nickname = computed(() => user.value?.nickname || '未登录')

  function applyAuth(data: AuthResponse): void {
    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
    setAccessToken(data.access_token)
    setRefreshToken(data.refresh_token)
    if (data.user) {
      user.value = data.user
      setCachedUser(data.user)
    }
  }

  function clear(): void {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    clearAuthStorage()
  }

  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      const data = await authApi.login({ username, password })
      applyAuth(data)
    } finally {
      loading.value = false
    }
  }

  async function register(payload: {
    username: string
    password: string
    phone?: string
    nickname?: string
  }): Promise<void> {
    loading.value = true
    try {
      const data = await authApi.register(payload)
      applyAuth(data)
    } finally {
      loading.value = false
    }
  }

  async function loginWithWeChat(payload: {
    code: string
    nickname?: string
    avatar?: string
  }): Promise<void> {
    loading.value = true
    try {
      const data = await authApi.loginWithWeChat(payload)
      applyAuth(data)
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile(): Promise<User | null> {
    if (!accessToken.value) return null
    try {
      const data = await getProfile()
      user.value = data
      setCachedUser(data)
      return data
    } catch {
      return user.value
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // 后端不可用时也要清理本地登录态
    }
    clear()
  }

  // 令牌失效时由接口层广播，统一清理登录态
  if (typeof window !== 'undefined') {
    window.addEventListener('ss:unauthorized', () => {
      clear()
    })
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    isLoggedIn,
    nickname,
    applyAuth,
    clear,
    login,
    register,
    loginWithWeChat,
    fetchProfile,
    logout,
  }
})
