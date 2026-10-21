/**
 * 营销域接口 —— marketing.proto(MarketingService)
 */
import { del, get, post, put, withMock } from './client'
import type {
  GetGroupBuyResponse,
  GroupBuy,
  GroupBuyMember,
  ListGroupBuysResponse,
  ListMarketingTasksResponse,
  ListPromotionSessionsResponse,
  MarketingTask,
  PromotionSession,
  SaveGroupBuyRequest,
  SaveMarketingTaskRequest,
  SavePromotionSessionRequest,
  SignInConfig,
  ListCouponsParams,
  ListCouponsResponse,
  ListPromotionsParams,
  ListPromotionsResponse,
  OperationResult,
  SaveCouponRequest,
  SavePromotionRequest,
} from '@/types'
import {
  mockGetGroupBuy,
  mockGetSignInConfig,
  mockListGroupBuyMembers,
  mockListGroupBuys,
  mockListMarketingTasks,
  mockListPromotionSessions,
  mockSaveGroupBuy,
  mockSaveMarketingTask,
  mockSavePromotionSession,
  mockSaveSignInConfig,
  mockDeleteCoupon,
  mockDeletePromotion,
  mockListCoupons,
  mockListPromotions,
  mockSaveCoupon,
  mockSavePromotion,
} from '@/mock'

/** 优惠券列表 */
export function listCoupons(params: ListCouponsParams = {}): Promise<ListCouponsResponse> {
  return withMock(
    '优惠券列表',
    () => get<ListCouponsResponse>('/coupons', { params }),
    () => mockListCoupons(params),
  )
}

/** 保存优惠券 */
export function saveCoupon(payload: SaveCouponRequest): Promise<{ id: number }> {
  return withMock(
    '保存优惠券',
    () => post<{ id: number }>('/admin/coupons', payload),
    () => ({ id: mockSaveCoupon(payload).id }),
  )
}

/** 删除优惠券 */
export function deleteCoupon(id: number): Promise<OperationResult> {
  return withMock(
    '删除优惠券',
    () => del<OperationResult>(`/admin/coupons/${id}`),
    () => mockDeleteCoupon(id),
  )
}

/** 活动列表 */
export function listPromotions(params: ListPromotionsParams = {}): Promise<ListPromotionsResponse> {
  return withMock(
    '活动列表',
    () => get<ListPromotionsResponse>('/promotions', { params }),
    () => mockListPromotions(params),
  )
}

/** 保存活动 */
export function savePromotion(payload: SavePromotionRequest): Promise<{ id: number }> {
  return withMock(
    '保存活动',
    () => post<{ id: number }>('/admin/promotions', payload),
    () => ({ id: mockSavePromotion(payload).id }),
  )
}

/** 删除活动 */
export function deletePromotion(id: number): Promise<OperationResult> {
  return withMock(
    '删除活动',
    () => del<OperationResult>(`/admin/promotions/${id}`),
    () => mockDeletePromotion(id),
  )
}

// ---------------------------------------------------------------------------
// 活动场次 / 拼团 / 营销任务 / 签到配置
// ---------------------------------------------------------------------------

/** 活动场次列表 */
export function listPromotionSessions(
  params: { promotion_id?: number; page?: number; page_size?: number } = {},
): Promise<ListPromotionSessionsResponse> {
  return withMock(
    '活动场次',
    () => get<ListPromotionSessionsResponse>('/promotions/1/sessions', { params }),
    () => mockListPromotionSessions(params),
  )
}

/** 保存活动场次 */
export function savePromotionSession(payload: SavePromotionSessionRequest): Promise<PromotionSession> {
  return withMock(
    '保存活动场次',
    () => post<PromotionSession>('/admin/promotion-sessions', payload),
    () => mockSavePromotionSession(payload),
  )
}

/** 拼团活动列表 */
export function listGroupBuys(
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {},
): Promise<ListGroupBuysResponse> {
  return withMock(
    '拼团列表',
    () => get<ListGroupBuysResponse>('/group-buys', { params }),
    () => mockListGroupBuys(params),
  )
}

/** 拼团详情（含参团成员） */
export function getGroupBuy(id: number): Promise<GetGroupBuyResponse> {
  return withMock(
    '拼团详情',
    () => get<GetGroupBuyResponse>(`/group-buys/${id}`),
    () => mockGetGroupBuy(id),
  )
}

/** 拼团成员列表 */
export function listGroupBuyMembers(params: { group_buy_id?: number } = {}): Promise<{ members: GroupBuyMember[] }> {
  return withMock(
    '拼团成员',
    () => get<{ members: GroupBuyMember[] }>(`/group-buys/${params.group_buy_id ?? 1}`),
    () => mockListGroupBuyMembers(params),
  )
}

/** 保存拼团活动 */
export function saveGroupBuy(payload: SaveGroupBuyRequest): Promise<GroupBuy> {
  return withMock(
    '保存拼团活动',
    () => post<GroupBuy>('/admin/group-buys', payload),
    () => mockSaveGroupBuy(payload),
  )
}

/**
 * 营销任务列表
 *
 * 走后台管理端接口 /admin/marketing-tasks：返回的是任务定义（含 id/sort/enabled），
 * 而不是用户端的 /marketing/tasks（那是带用户进度的 UserTask，没有 id 字段）。
 */
export function listMarketingTasks(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListMarketingTasksResponse> {
  return withMock(
    '营销任务',
    () => get<ListMarketingTasksResponse>('/admin/marketing-tasks', { params }),
    () => mockListMarketingTasks(params),
  )
}

/** 保存营销任务（id 为空则新建，否则更新） */
export function saveMarketingTask(payload: SaveMarketingTaskRequest): Promise<MarketingTask> {
  return withMock(
    '保存营销任务',
    () =>
      payload.id
        ? put<MarketingTask>('/admin/marketing-tasks', payload)
        : post<MarketingTask>('/admin/marketing-tasks', payload),
    () => mockSaveMarketingTask(payload),
  )
}

/** 删除营销任务 */
export function deleteMarketingTask(id: number): Promise<OperationResult> {
  return withMock(
    '删除营销任务',
    () => del<OperationResult>(`/admin/marketing-tasks/${id}`),
    () => ({ success: true, message: '营销任务已删除' }),
  )
}

/** 读取签到配置 */
export function getSignInConfig(): Promise<SignInConfig> {
  return withMock('签到配置', () => get<SignInConfig>('/admin/sign-in-config'), () => mockGetSignInConfig())
}

/** 保存签到配置 */
export function saveSignInConfig(payload: Partial<SignInConfig>): Promise<SignInConfig> {
  return withMock(
    '保存签到配置',
    () => put<SignInConfig>('/admin/sign-in-config', payload),
    () => mockSaveSignInConfig(payload),
  )
}
