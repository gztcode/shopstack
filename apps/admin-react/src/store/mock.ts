/**
 * Mock 兜底状态：后端未就绪时记录降级原因，页面顶部展示「演示数据模式」提示
 */
import { create } from 'zustand'

interface MockState {
  /** 是否已进入演示数据模式 */
  isMock: boolean
  /** 降级原因列表 */
  reasons: string[]
  /** 标记一次降级 */
  markMock: (reason: string) => void
  /** 重置（重新登录时调用） */
  reset: () => void
}

export const useMockStore = create<MockState>((set) => ({
  isMock: false,
  reasons: [],
  markMock: (reason) =>
    set((state) => {
      if (state.reasons.includes(reason)) return state
      return { isMock: true, reasons: [...state.reasons, reason] }
    }),
  reset: () => set({ isMock: false, reasons: [] }),
}))
