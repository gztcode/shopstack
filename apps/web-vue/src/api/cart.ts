import { httpDelete, httpGet, httpPost, httpPut } from '@/api/client'
import * as mock from '@/mock'
import type { Cart, OperationResult } from '@/types'

/** 获取购物车 */
export function getCart(): Promise<Cart> {
  return httpGet<Cart>('/api/v1/cart', undefined, { fallback: () => mock.getCart() })
}

/** 加入购物车 */
export function addToCart(payload: {
  product_id: number
  sku_id: number
  quantity: number
  selected?: boolean
}): Promise<Cart> {
  return httpPost<Cart>('/api/v1/cart/items', payload, { fallback: () => mock.addToCart(payload) })
}

/** 更新购物车条目（数量 / 选中状态） */
export function updateCartItem(
  id: number,
  payload: { quantity?: number; selected?: boolean },
): Promise<Cart> {
  return httpPut<Cart>(
    `/api/v1/cart/items/${id}`,
    payload,
    { fallback: () => mock.updateCartItem({ id, ...payload }) },
  )
}

/** 移除购物车条目 */
export function removeCartItem(id: number): Promise<OperationResult> {
  return httpDelete<OperationResult>(
    `/api/v1/cart/items/${id}`,
    undefined,
    { fallback: () => mock.removeCartItem(id) },
  )
}

/** 清空购物车 */
export function clearCart(): Promise<OperationResult> {
  return httpPost<OperationResult>(
    '/api/v1/cart/clear',
    {},
    { fallback: () => mock.clearCart() },
  )
}

/** 全选 / 全不选 */
export function setAllSelected(selected: boolean): Promise<Cart> {
  return httpPut<Cart>(
    '/api/v1/cart/select-all',
    { selected },
    { fallback: () => mock.setAllSelected(selected) },
  )
}

/** 购物车角标数量 */
export function getCartCount(): Promise<{ count: number }> {
  return httpGet<{ count: number }>(
    '/api/v1/cart/count',
    undefined,
    { fallback: () => mock.getCartCount() },
  )
}
