import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getOrderCount } from '@/api/order'
import { listUserCoupons } from '@/api/marketing'
import * as notificationApi from '@/api/notification'
import * as userApi from '@/api/user'
import type { Address, FavoriteProduct, OrderCount, User, UserCoupon } from '@/types'

/**
 * 个人中心数据：资料 / 地址 / 收藏 / 优惠券 / 订单角标 / 通知
 */
export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)
  const addresses = ref<Address[]>([])
  const favorites = ref<FavoriteProduct[]>([])
  const coupons = ref<UserCoupon[]>([])
  const orderCount = ref<OrderCount>({
    pending_payment: 0,
    pending_shipment: 0,
    pending_receipt: 0,
    refunding: 0,
  })
  const unreadCount = ref(0)
  const loading = ref(false)

  const defaultAddress = computed(
    () => addresses.value.find((address) => address.is_default) ?? addresses.value[0] ?? null,
  )

  async function loadProfile(): Promise<void> {
    const data = await userApi.getProfile()
    profile.value = data
  }

  async function loadAddresses(): Promise<void> {
    const data = await userApi.listAddresses()
    addresses.value = data.addresses
  }

  async function loadFavorites(): Promise<void> {
    const data = await userApi.listFavorites({ page: 1, page_size: 50 })
    favorites.value = data.products
  }

  async function loadCoupons(status?: number): Promise<void> {
    const data = await listUserCoupons({ status, page: 1, page_size: 50 })
    coupons.value = data.coupons
  }

  async function loadOrderCount(): Promise<void> {
    orderCount.value = await getOrderCount()
  }

  async function loadUnreadCount(): Promise<void> {
    const data = await notificationApi.getUnreadCount()
    unreadCount.value = data.count
  }

  async function refreshAll(): Promise<void> {
    loading.value = true
    try {
      await Promise.allSettled([loadProfile(), loadOrderCount(), loadUnreadCount()])
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(productId: number): Promise<boolean> {
    const result = await userApi.toggleFavorite(productId)
    await loadFavorites()
    return result.favorited
  }

  async function removeAddress(id: number): Promise<void> {
    await userApi.deleteAddress(id)
    await loadAddresses()
  }

  async function setDefaultAddress(id: number): Promise<void> {
    await userApi.setDefaultAddress(id)
    await loadAddresses()
  }

  async function saveAddress(payload: Partial<Address>): Promise<void> {
    await userApi.saveAddress(payload)
    await loadAddresses()
  }

  return {
    profile,
    addresses,
    favorites,
    coupons,
    orderCount,
    unreadCount,
    loading,
    defaultAddress,
    loadProfile,
    loadAddresses,
    loadFavorites,
    loadCoupons,
    loadOrderCount,
    loadUnreadCount,
    refreshAll,
    toggleFavorite,
    removeAddress,
    setDefaultAddress,
    saveAddress,
  }
})
