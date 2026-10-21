import { httpDelete, httpGet, httpPost, httpPut } from '@/api/client'
import * as mock from '@/mock'
import type {
  AccountSecurityInfo,
  Address,
  Feedback,
  HelpArticle,
  Invoice,
  InvoiceTemplate,
  ListAddressesResponse,
  ListFavoritesResponse,
  ListGrowthLogsResponse,
  ListHelpArticlesResponse,
  ListInvoiceTemplatesResponse,
  ListInvoicesResponse,
  ListPointsLogsResponse,
  ListRegionsResponse,
  OperationResult,
  User,
  UserLevel,
  UserLevelInfo,
  UserNotificationSettings,
} from '@/types'
import { getCachedUser } from '@/utils/auth'

/** 个人资料 */
export function getProfile(): Promise<User> {
  return httpGet<User>('/api/v1/users/me', undefined, { fallback: () => mock.getProfile() })
}

/** 更新个人资料 */
export function updateProfile(payload: {
  nickname?: string
  avatar?: string
  email?: string
  gender?: string
  birthday?: string
}): Promise<User> {
  return httpPut<User>(
    '/api/v1/users/me',
    payload,
    { fallback: () => mock.updateProfile(payload as Partial<User>) },
  )
}

/** 修改密码 */
export function changePassword(payload: {
  old_password: string
  new_password: string
}): Promise<OperationResult> {
  return httpPost<OperationResult>(
    '/api/v1/users/password',
    payload,
    { fallback: () => ({ success: true, message: '密码修改成功' }) },
  )
}

/** 地址列表 */
export function listAddresses(): Promise<ListAddressesResponse> {
  return httpGet<ListAddressesResponse>(
    '/api/v1/users/addresses',
    undefined,
    { fallback: () => mock.listAddresses() },
  )
}

/** 新增 / 编辑地址 */
export function saveAddress(payload: Partial<Address>): Promise<Address> {
  return httpPost<Address>(
    '/api/v1/users/addresses',
    payload,
    { fallback: () => mock.saveAddress(payload) },
  )
}

/** 删除地址 */
export function deleteAddress(id: number): Promise<OperationResult> {
  return httpDelete<OperationResult>(
    `/api/v1/users/addresses/${id}`,
    undefined,
    { fallback: () => mock.deleteAddress(id) },
  )
}

/** 设为默认地址 */
export function setDefaultAddress(id: number): Promise<OperationResult> {
  return httpPut<OperationResult>(
    `/api/v1/users/addresses/${id}/default`,
    {},
    { fallback: () => mock.setDefaultAddress(id) },
  )
}

/** 我的收藏 */
export function listFavorites(params: {
  page?: number
  page_size?: number
}): Promise<ListFavoritesResponse> {
  return httpGet<ListFavoritesResponse>(
    '/api/v1/users/favorites',
    { 'page.page': params.page, 'page.page_size': params.page_size },
    { fallback: () => mock.listFavorites(params.page, params.page_size) },
  )
}

/** 收藏 / 取消收藏 */
export function toggleFavorite(productId: number): Promise<{ favorited: boolean }> {
  return httpPost<{ favorited: boolean }>(
    '/api/v1/users/favorites/toggle',
    { product_id: productId },
    { fallback: () => mock.toggleFavorite(productId) },
  )
}

/* ---------------------------------------------------------------------------
 * 积分明细 / 发票
 * --------------------------------------------------------------------------- */
/** 当前登录用户 ID（网关部分用户接口需要显式传入） */
function currentUserId(): number {
  const user = getCachedUser<{ id?: number }>()
  return user?.id ?? 0
}

/** 积分明细 */
export function listPointsLogs(params: {
  page?: number
  page_size?: number
}): Promise<ListPointsLogsResponse> {
  return httpGet<ListPointsLogsResponse>(
    '/api/v1/users/points-logs',
    {
      user_id: currentUserId() || undefined,
      'page.page': params.page,
      'page.page_size': params.page_size,
    },
    { fallback: () => mock.listPointsLogs(params) },
  )
}

/** 发票列表 */
export function listInvoices(params: {
  page?: number
  page_size?: number
  status?: number
}): Promise<ListInvoicesResponse> {
  return httpGet<ListInvoicesResponse>(
    '/api/v1/users/invoices',
    {
      user_id: currentUserId() || undefined,
      'page.page': params.page,
      'page.page_size': params.page_size,
      status: params.status,
    },
    { fallback: () => mock.listInvoices(params) },
  )
}

/** 申请开票 */
export function createInvoice(payload: {
  order_no: string
  title: string
  tax_no?: string
  type?: string
  email?: string
  amount_cents?: number
  remark?: string
}): Promise<Invoice> {
  return httpPost<Invoice>(
    '/api/v1/users/invoices',
    { user_id: currentUserId() || undefined, ...payload },
    { fallback: () => mock.createInvoice(payload) },
  )
}

/* ---------------------------------------------------------------------------
 * 会员等级 / 成长值 / 区域 / 发票抬头 / 通知设置 / 账号安全 / 反馈 / 帮助（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 当前用户等级与成长值概览 */
export function getUserLevel(): Promise<UserLevelInfo> {
  return httpGet<UserLevelInfo>(
    '/api/v1/users/level',
    { user_id: currentUserId() || undefined },
    { fallback: () => mock.getUserLevel() },
  )
}

/** 会员等级列表 */
export function listUserLevels(): Promise<{ levels: UserLevel[] }> {
  return httpGet<{ levels: UserLevel[] }>(
    '/api/v1/users/levels',
    undefined,
    { fallback: () => mock.listUserLevels() },
  )
}

/** 成长值明细 */
export function listGrowthLogs(params: {
  page?: number
  page_size?: number
}): Promise<ListGrowthLogsResponse> {
  return httpGet<ListGrowthLogsResponse>(
    '/api/v1/users/growth-logs',
    {
      user_id: currentUserId() || undefined,
      'page.page': params.page,
      'page.page_size': params.page_size,
    },
    { fallback: () => mock.listGrowthLogs(params) },
  )
}

/** 行政区域列表 */
export function listRegions(params?: {
  parent_id?: number
  tree?: boolean
}): Promise<ListRegionsResponse> {
  return httpGet<ListRegionsResponse>(
    '/api/v1/regions',
    { parent_id: params?.parent_id, tree: params?.tree },
    { fallback: () => mock.listRegions(params ?? {}) },
  )
}

/** 发票抬头模板列表 */
export function listInvoiceTemplates(): Promise<ListInvoiceTemplatesResponse> {
  return httpGet<ListInvoiceTemplatesResponse>(
    '/api/v1/users/invoice-templates',
    { user_id: currentUserId() || undefined },
    { fallback: () => mock.listInvoiceTemplates() },
  )
}

/** 新增 / 编辑发票抬头模板 */
export function saveInvoiceTemplate(payload: {
  id?: number
  title: string
  tax_no?: string
  type?: string
  email?: string
  phone?: string
  address?: string
  bank_name?: string
  bank_account?: string
  is_default?: boolean
}): Promise<InvoiceTemplate> {
  return httpPost<InvoiceTemplate>(
    '/api/v1/users/invoice-templates',
    { user_id: currentUserId() || undefined, ...payload },
    { fallback: () => mock.saveInvoiceTemplate(payload) },
  )
}

/** 删除发票抬头模板 */
export function deleteInvoiceTemplate(id: number): Promise<OperationResult> {
  return httpDelete<OperationResult>(
    `/api/v1/users/invoice-templates/${id}`,
    undefined,
    { fallback: () => mock.deleteInvoiceTemplate(id) },
  )
}

/** 通知设置 */
export function getNotificationSettings(): Promise<UserNotificationSettings> {
  return httpGet<UserNotificationSettings>(
    '/api/v1/users/notification-settings',
    undefined,
    { fallback: () => mock.getNotificationSettings() },
  )
}

/** 更新通知设置 */
export function updateNotificationSettings(
  payload: Partial<UserNotificationSettings>,
): Promise<UserNotificationSettings> {
  return httpPut<UserNotificationSettings>(
    '/api/v1/users/notification-settings',
    payload,
    { fallback: () => mock.updateNotificationSettings(payload) },
  )
}

/** 账号安全信息 */
export function getAccountSecurity(): Promise<AccountSecurityInfo> {
  return httpGet<AccountSecurityInfo>(
    '/api/v1/users/security',
    undefined,
    { fallback: () => mock.getAccountSecurity() },
  )
}

/** 提交实名认证 */
export function submitRealName(payload: {
  real_name: string
  id_card: string
}): Promise<OperationResult> {
  return httpPost<OperationResult>(
    '/api/v1/users/realname',
    payload,
    { fallback: () => mock.submitRealName(payload) },
  )
}

/** 提交意见反馈 */
export function submitFeedback(payload: {
  type?: number
  content: string
  images?: string[]
  contact?: string
}): Promise<Feedback> {
  return httpPost<Feedback>(
    '/api/v1/users/feedback',
    { user_id: currentUserId() || undefined, ...payload },
    { fallback: () => mock.submitFeedback(payload) },
  )
}

/** 帮助文章列表 */
export function listHelpArticles(params?: {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
}): Promise<ListHelpArticlesResponse> {
  return httpGet<ListHelpArticlesResponse>(
    '/api/v1/help/articles',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      keyword: params?.keyword,
      category_id: params?.category_id,
    },
    {
      fallback: () =>
        mock.listHelpArticles({
          page: params?.page,
          page_size: params?.page_size,
          keyword: params?.keyword,
          category_id: params?.category_id,
        }),
    },
  )
}

/** 帮助文章详情 */
export function getHelpArticle(id: number): Promise<HelpArticle> {
  return httpGet<HelpArticle>(
    `/api/v1/help/articles/${id}`,
    undefined,
    { fallback: () => mock.getHelpArticle(id) },
  )
}
