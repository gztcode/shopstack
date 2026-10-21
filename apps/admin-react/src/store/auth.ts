/**
 * 登录态 / 权限态（Zustand）
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Admin, AuthResponse } from '@/types'

interface AuthState {
  accessToken: string
  refreshToken: string
  admin: Admin | null
  permissions: string[]
  /** 写入登录态 */
  setSession: (payload: AuthResponse) => void
  /** 仅更新 token（刷新场景） */
  setTokens: (accessToken: string, refreshToken: string) => void
  /** 更新管理员资料 */
  setAdmin: (admin: Admin) => void
  /** 退出登录 */
  logout: () => void
}

const emptyState = {
  accessToken: '',
  refreshToken: '',
  admin: null,
  permissions: [] as string[],
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...emptyState,
      setSession: (payload) =>
        set({
          accessToken: payload.access_token ?? '',
          refreshToken: payload.refresh_token ?? '',
          admin: payload.admin ?? null,
          permissions: payload.permissions ?? [],
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setAdmin: (admin) => set({ admin }),
      logout: () => set({ ...emptyState }),
    }),
    {
      name: 'shopstack-admin-auth',
    },
  ),
)

/** 权限码列表（组件内使用） */
export function usePermissions(): string[] {
  return useAuthStore((state) => state.permissions)
}
