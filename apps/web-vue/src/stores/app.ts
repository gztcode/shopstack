import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

/**
 * 全局提示与演示模式状态。
 * 后端未就绪时接口层会切到内置 Mock 数据，这里统一提示用户。
 */
export const useAppStore = defineStore('app', () => {
  const toasts = ref<ToastItem[]>([])
  const demoMode = ref(false)
  const demoReason = ref('')
  let seq = 0

  function toast(message: string, type: ToastType = 'info', duration = 2800): void {
    if (!message) return
    seq += 1
    const id = seq
    toasts.value.push({ id, type, message })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== id)
    }, duration)
  }

  function success(message: string): void {
    toast(message, 'success')
  }

  function warning(message: string): void {
    toast(message, 'warning')
  }

  function info(message: string): void {
    toast(message, 'info')
  }

  function error(message: string): void {
    toast(message, 'error')
  }

  /** 进入演示数据模式 */
  function enterDemoMode(reason: string): void {
    if (!demoMode.value) {
      demoMode.value = true
      demoReason.value = reason
    }
  }

  /** 恢复真实数据模式 */
  function exitDemoMode(): void {
    demoMode.value = false
    demoReason.value = ''
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  return { toasts, demoMode, demoReason, toast, success, warning, info, error, enterDemoMode, exitDemoMode, dismiss }
})
