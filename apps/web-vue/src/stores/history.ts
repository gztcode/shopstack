import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { HistoryItem } from '@/types'

const STORAGE_KEY = 'ss_history'
const MAX_ITEMS = 20

function load(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryItem[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function save(items: HistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/**
 * 浏览足迹（本地存储，不依赖后端）
 */
export const useHistoryStore = defineStore('history', () => {
  const items = ref<HistoryItem[]>(load())

  function persist(): void {
    save(items.value)
  }

  /** 记录一次浏览，同一商品只保留最新一条 */
  function add(payload: {
    product_id: number
    title: string
    cover: string
    price_cents: number
  }): void {
    const rest = items.value.filter((item) => item.product_id !== payload.product_id)
    items.value = [
      { ...payload, viewed_at: new Date().toISOString() },
      ...rest,
    ].slice(0, MAX_ITEMS)
    persist()
  }

  function remove(productId: number): void {
    items.value = items.value.filter((item) => item.product_id !== productId)
    persist()
  }

  function clear(): void {
    items.value = []
    persist()
  }

  return { items, add, remove, clear }
})
