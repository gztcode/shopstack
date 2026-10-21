import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as cartApi from '@/api/cart'
import type { Cart } from '@/types'

const emptyCart: Cart = {
  user_id: 0,
  items: [],
  total_count: 0,
  selected_count: 0,
  selected_amount_cents: 0,
  selected_discount_cents: 0,
  selected_payable_cents: 0,
}

/**
 * 购物车状态
 */
export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart>({ ...emptyCart })
  const loading = ref(false)
  const pending = ref<number | null>(null)

  /** 角标数量 */
  const count = computed(() => cart.value.total_count)
  /** 已选中的条目 */
  const selectedItems = computed(() =>
    cart.value.items.filter((item) => item.selected && item.available),
  )
  /** 已选金额 */
  const selectedAmount = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
  )
  /** 全部选中 */
  const allSelected = computed(
    () =>
      cart.value.items.length > 0 &&
      cart.value.items.filter((item) => item.available).every((item) => item.selected),
  )

  function apply(next: Cart): void {
    cart.value = next
  }

  async function loadCart(): Promise<void> {
    loading.value = true
    try {
      apply(await cartApi.getCart())
    } catch {
      // 错误提示已由接口层统一处理
    } finally {
      loading.value = false
    }
  }

  async function addToCart(payload: {
    product_id: number
    sku_id: number
    quantity: number
    selected?: boolean
  }): Promise<void> {
    apply(await cartApi.addToCart(payload))
  }

  async function updateItem(
    id: number,
    payload: { quantity?: number; selected?: boolean },
  ): Promise<void> {
    pending.value = id
    try {
      apply(await cartApi.updateCartItem(id, payload))
    } finally {
      pending.value = null
    }
  }

  async function removeItem(id: number): Promise<void> {
    await cartApi.removeCartItem(id)
    await loadCart()
  }

  async function toggleAll(selected: boolean): Promise<void> {
    apply(await cartApi.setAllSelected(selected))
  }

  async function clear(): Promise<void> {
    await cartApi.clearCart()
    await loadCart()
  }

  return {
    cart,
    loading,
    pending,
    count,
    selectedItems,
    selectedAmount,
    allSelected,
    loadCart,
    addToCart,
    updateItem,
    removeItem,
    toggleAll,
    clear,
  }
})
