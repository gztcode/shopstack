import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { CompareItem } from '@/types'

const STORAGE_KEY = 'ss_compare'
const MAX_ITEMS = 4

function load(): CompareItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CompareItem[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function save(items: CompareItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/**
 * 商品对比清单（本地存储，最多 4 个）
 */
export const useCompareStore = defineStore('compare', () => {
  const items = ref<CompareItem[]>(load())

  const count = computed(() => items.value.length)
  const full = computed(() => items.value.length >= MAX_ITEMS)

  function persist(): void {
    save(items.value)
  }

  function has(productId: number): boolean {
    return items.value.some((item) => item.product_id === productId)
  }

  /** 加入对比；返回是否成功与提示文案 */
  function add(payload: Omit<CompareItem, 'added_at'>): { ok: boolean; message: string } {
    if (has(payload.product_id)) {
      return { ok: false, message: '该商品已在对比列表中' }
    }
    if (full.value) {
      return { ok: false, message: `最多只能对比 ${MAX_ITEMS} 个商品` }
    }
    items.value = [...items.value, { ...payload, added_at: new Date().toISOString() }]
    persist()
    return { ok: true, message: '已加入对比' }
  }

  function remove(productId: number): void {
    items.value = items.value.filter((item) => item.product_id !== productId)
    persist()
  }

  function clear(): void {
    items.value = []
    persist()
  }

  return { items, count, full, has, add, remove, clear }
})
