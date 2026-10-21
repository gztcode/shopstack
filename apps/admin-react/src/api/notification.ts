/**
 * 通知 / 短信 / 操作日志域接口 —— notification.proto(NotificationService)
 */
import { del, get, post, put, withMock } from './client'
import type {
  ListNotificationCategoriesResponse,
  ListNotificationTemplatesResponse,
  ListSmsTemplatesResponse,
  ListSensitiveWordsResponse,
  NotificationTemplate,
  SaveNotificationTemplateRequest,
  SaveSensitiveWordRequest,
  SaveSmsTemplateRequest,
  SensitiveWord,
  SmsTemplate,
  ListAuditLogsParams,
  ListAuditLogsResponse,
  ListNotificationsParams,
  ListNotificationsResponse,
  ListSmsRecordsParams,
  ListSmsRecordsResponse,
  OperationResult,
  SendSmsRequest,
  SendSmsResponse,
} from '@/types'
import {
  mockDeleteNotificationTemplate,
  mockDeleteSensitiveWord,
  mockDeleteSmsTemplate,
  mockListNotificationCategories,
  mockListNotificationTemplates,
  mockListSensitiveWords,
  mockListSmsTemplates,
  mockSaveNotificationTemplate,
  mockSaveSensitiveWord,
  mockSaveSmsTemplate,
  mockListAuditLogs,
  mockListNotifications,
  mockListSmsRecords,
  mockMarkAllNotificationsRead,
  mockMarkNotificationRead,
} from '@/mock'

/** 通知列表（后台铃铛使用，按管理员 id 拉取） */
export function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResponse> {
  return withMock(
    '通知列表',
    () => get<ListNotificationsResponse>('/notifications', { params }),
    () => mockListNotifications(params),
  )
}

/** 标记单条通知已读 */
export function markNotificationRead(id: number, userId?: number): Promise<OperationResult> {
  return withMock(
    '通知已读',
    () => put<OperationResult>(`/notifications/${id}/read`, { user_id: userId, id }),
    () => mockMarkNotificationRead(id),
  )
}

/** 全部标记已读 */
export function markAllNotificationsRead(userId?: number): Promise<OperationResult> {
  return withMock(
    '全部已读',
    () => post<OperationResult>('/notifications/read-all', { user_id: userId }),
    () => mockMarkAllNotificationsRead(),
  )
}

/** 短信记录列表 */
export function listSmsRecords(params: ListSmsRecordsParams = {}): Promise<ListSmsRecordsResponse> {
  return withMock(
    '短信记录',
    () => get<ListSmsRecordsResponse>('/admin/sms-records', { params }),
    () => mockListSmsRecords(params),
  )
}

/** 发送短信（notification.proto NotificationService.SendSms） */
export function sendSms(payload: SendSmsRequest): Promise<SendSmsResponse> {
  return withMock(
    '发送短信',
    () => post<SendSmsResponse>('/sms/send', payload),
    () => ({
      success: true,
      code: String(Math.floor(100000 + Math.random() * 900000)),
      expire_seconds: 300,
    }),
  )
}

/** 操作日志列表 */
export function listAuditLogs(params: ListAuditLogsParams = {}): Promise<ListAuditLogsResponse> {
  return withMock(
    '操作日志',
    () => get<ListAuditLogsResponse>('/admin/audit-logs', { params }),
    () => mockListAuditLogs(params),
  )
}

// ---------------------------------------------------------------------------
// 通知模板 / 短信模板 / 敏感词 / 通知分类
// ---------------------------------------------------------------------------

/** 通知模板列表 */
export function listNotificationTemplates(
  params: { keyword?: string; type?: number; page?: number; page_size?: number } = {},
): Promise<ListNotificationTemplatesResponse> {
  return withMock(
    '通知模板',
    () => get<ListNotificationTemplatesResponse>('/admin/notification-templates', { params }),
    () => mockListNotificationTemplates(params),
  )
}

/** 保存通知模板 */
export function saveNotificationTemplate(
  payload: SaveNotificationTemplateRequest,
): Promise<NotificationTemplate> {
  return withMock(
    '保存通知模板',
    () => post<NotificationTemplate>('/admin/notification-templates', payload),
    () => mockSaveNotificationTemplate(payload),
  )
}

/** 删除通知模板 */
export function deleteNotificationTemplate(id: number): Promise<OperationResult> {
  return withMock(
    '删除通知模板',
    () => del<OperationResult>(`/admin/notification-templates/${id}`),
    () => mockDeleteNotificationTemplate(id),
  )
}

/** 短信模板列表 */
export function listSmsTemplates(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListSmsTemplatesResponse> {
  return withMock(
    '短信模板',
    () => get<ListSmsTemplatesResponse>('/admin/sms-templates', { params }),
    () => mockListSmsTemplates(params),
  )
}

/** 保存短信模板 */
export function saveSmsTemplate(payload: SaveSmsTemplateRequest): Promise<SmsTemplate> {
  return withMock(
    '保存短信模板',
    () => post<SmsTemplate>('/admin/sms-templates', payload),
    () => mockSaveSmsTemplate(payload),
  )
}

/** 删除短信模板 */
export function deleteSmsTemplate(id: number): Promise<OperationResult> {
  return withMock(
    '删除短信模板',
    () => del<OperationResult>(`/admin/sms-templates/${id}`),
    () => mockDeleteSmsTemplate(id),
  )
}

/** 敏感词列表 */
export function listSensitiveWords(
  params: { keyword?: string; category?: number; page?: number; page_size?: number } = {},
): Promise<ListSensitiveWordsResponse> {
  return withMock(
    '敏感词',
    () => get<ListSensitiveWordsResponse>('/admin/sensitive-words', { params }),
    () => mockListSensitiveWords(params),
  )
}

/** 保存敏感词 */
export function saveSensitiveWord(payload: SaveSensitiveWordRequest): Promise<SensitiveWord> {
  return withMock(
    '保存敏感词',
    () => post<SensitiveWord>('/admin/sensitive-words', payload),
    () => mockSaveSensitiveWord(payload),
  )
}

/** 删除敏感词 */
export function deleteSensitiveWord(id: number): Promise<OperationResult> {
  return withMock(
    '删除敏感词',
    () => del<OperationResult>(`/admin/sensitive-words/${id}`),
    () => mockDeleteSensitiveWord(id),
  )
}

/** 通知分类列表 */
export function listNotificationCategories(): Promise<ListNotificationCategoriesResponse> {
  return withMock(
    '通知分类',
    () => get<ListNotificationCategoriesResponse>('/notifications/categories'),
    () => mockListNotificationCategories(),
  )
}
