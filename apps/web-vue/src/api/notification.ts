import { httpGet, httpPost, httpPut } from '@/api/client'
import * as mock from '@/mock'
import type {
  ListNotificationCategoriesResponse,
  ListNotificationsResponse,
  OperationResult,
} from '@/types'

/** 通知列表 */
export function listNotifications(params: {
  page?: number
  page_size?: number
  type?: number
  unread_only?: boolean
}): Promise<ListNotificationsResponse> {
  return httpGet<ListNotificationsResponse>(
    '/api/v1/notifications',
    {
      'page.page': params.page,
      'page.page_size': params.page_size,
      type: params.type,
      unread_only: params.unread_only,
    },
    { fallback: () => mock.listNotifications(params) },
  )
}

/** 标记已读 */
export function markRead(id: number): Promise<OperationResult> {
  return httpPut<OperationResult>(
    `/api/v1/notifications/${id}/read`,
    {},
    { fallback: () => mock.markNotificationRead(id) },
  )
}

/** 全部标记已读 */
export function markAllRead(): Promise<OperationResult> {
  return httpPost<OperationResult>(
    '/api/v1/notifications/read-all',
    {},
    { fallback: () => mock.markAllNotificationsRead() },
  )
}

/** 未读数量 */
export function getUnreadCount(): Promise<{ count: number }> {
  return httpGet<{ count: number }>(
    '/api/v1/notifications/unread-count',
    undefined,
    { fallback: () => mock.unreadCount() },
  )
}

/* ---------------------------------------------------------------------------
 * 通知分类（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 通知分类（含未读数） */
export function listNotificationCategories(): Promise<ListNotificationCategoriesResponse> {
  return httpGet<ListNotificationCategoriesResponse>(
    '/api/v1/notifications/categories',
    undefined,
    { fallback: () => mock.listNotificationCategories() },
  )
}
