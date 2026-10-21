import { httpGet, httpPost } from '@/api/client'
import * as mock from '@/mock'
import type {
  Coupon,
  GetGroupBuyResponse,
  GroupBuy,
  ListGroupBuysResponse,
  ListPromotionSessionsResponse,
  ListTasksResponse,
  ListUserCouponsResponse,
  PreviewCheckoutResponse,
  Promotion,
  SignInStatus,
  StockItem,
  UserCoupon,
  UserLevel,
  UserTask,
} from '@/types'
import { getCachedUser } from '@/utils/auth'

/** 当前登录用户 ID（网关的用户券接口要求显式传入 user_id） */
function currentUserId(): number {
  const user = getCachedUser<{ id?: number }>()
  return user?.id ?? 0
}

/** 我的优惠券 */
export function listUserCoupons(params: {
  status?: number
  page?: number
  page_size?: number
}): Promise<ListUserCouponsResponse> {
  return httpGet<ListUserCouponsResponse>(
    '/api/v1/users/coupons',
    {
      user_id: currentUserId() || undefined,
      status: params.status,
      'page.page': params.page,
      'page.page_size': params.page_size,
    },
    { fallback: () => mock.listUserCoupons(params) },
  )
}

/** 结算试算（实时计算可用券与应付金额） */
export function previewCheckout(payload: {
  items: StockItem[]
  address_id?: number
  coupon_id?: number
  points_used?: number
}): Promise<PreviewCheckoutResponse> {
  return httpPost<PreviewCheckoutResponse>(
    '/api/v1/marketing/preview',
    payload,
    { fallback: () => mock.previewCheckout(payload) },
  )
}

/** 促销活动 */
export function listPromotions(params?: {
  page?: number
  page_size?: number
  status?: number
  type?: number
}): Promise<{ promotions: Promotion[]; meta: { page: number; page_size: number; total: number; total_pages: number } }> {
  return httpGet(
    '/api/v1/promotions',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      status: params?.status,
      type: params?.type,
    },
    { fallback: () => mock.listPromotions() },
  )
}

/** 平台可领取优惠券（领券中心） */
export function listCoupons(params?: {
  page?: number
  page_size?: number
  available?: boolean
}): Promise<{
  coupons: Coupon[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
}> {
  return httpGet(
    '/api/v1/coupons',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      available: params?.available,
    },
    { fallback: () => mock.listPlatformCoupons({ page: params?.page, page_size: params?.page_size }) },
  )
}

/** 领取优惠券 */
export function receiveCoupon(couponId: number): Promise<UserCoupon> {
  return httpPost<UserCoupon>(
    `/api/v1/coupons/${couponId}/receive`,
    { user_id: currentUserId() || undefined },
    { fallback: () => mock.receiveCoupon(couponId) },
  )
}

/* ---------------------------------------------------------------------------
 * 签到 / 任务 / 场次 / 拼团（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 签到状态（含签到日历） */
export function getSignInStatus(): Promise<SignInStatus> {
  return httpGet<SignInStatus>(
    '/api/v1/marketing/sign-in',
    undefined,
    { fallback: () => mock.getSignInStatus() },
  )
}

/** 每日签到 */
export function signIn(): Promise<SignInStatus> {
  return httpPost<SignInStatus>(
    '/api/v1/marketing/sign-in',
    {},
    { fallback: () => mock.signIn() },
  )
}

/** 任务中心 */
export function listTasks(params?: {
  page?: number
  page_size?: number
}): Promise<ListTasksResponse> {
  return httpGet<ListTasksResponse>(
    '/api/v1/marketing/tasks',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
    },
    {
      fallback: () => mock.listTasks({ page: params?.page, page_size: params?.page_size }),
    },
  )
}

/** 领取任务奖励 */
export function claimTask(taskId: number): Promise<UserTask> {
  return httpPost<UserTask>(
    `/api/v1/marketing/tasks/${taskId}/claim`,
    {},
    { fallback: () => mock.claimTask(taskId) },
  )
}

/** 活动场次 */
export function listPromotionSessions(
  promotionId: number,
  params?: { page?: number; page_size?: number },
): Promise<ListPromotionSessionsResponse> {
  return httpGet<ListPromotionSessionsResponse>(
    `/api/v1/promotions/${promotionId}/sessions`,
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
    },
    {
      fallback: () =>
        mock.listPromotionSessions(promotionId, {
          page: params?.page,
          page_size: params?.page_size,
        }),
    },
  )
}

/** 拼团列表 */
export function listGroupBuys(params?: {
  page?: number
  page_size?: number
  keyword?: string
  status?: number
}): Promise<ListGroupBuysResponse> {
  return httpGet<ListGroupBuysResponse>(
    '/api/v1/group-buys',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      keyword: params?.keyword,
      status: params?.status,
    },
    {
      fallback: () =>
        mock.listGroupBuys({
          page: params?.page,
          page_size: params?.page_size,
          keyword: params?.keyword,
          status: params?.status,
        }),
    },
  )
}

/** 拼团详情（含参团成员） */
export function getGroupBuy(id: number): Promise<GetGroupBuyResponse> {
  return httpGet<GetGroupBuyResponse>(
    `/api/v1/group-buys/${id}`,
    undefined,
    { fallback: () => mock.getGroupBuy(id) },
  )
}

/** 参与拼团 */
export function joinGroupBuy(id: number, quantity = 1): Promise<GroupBuy> {
  return httpPost<GroupBuy>(
    `/api/v1/group-buys/${id}/join`,
    { quantity },
    { fallback: () => mock.joinGroupBuy(id, quantity) },
  )
}

/** 会员等级说明 */
export function listUserLevels(): Promise<{ levels: UserLevel[] }> {
  return httpGet<{ levels: UserLevel[] }>(
    '/api/v1/marketing/levels',
    undefined,
    { fallback: () => mock.listUserLevels() },
  )
}
