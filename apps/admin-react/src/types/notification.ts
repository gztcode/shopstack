/**
 * 通知 / 短信 / 操作日志类型 —— 对齐 proto/shopstack/notification/v1/notification.proto
 */
import type { NotificationType, PageMeta, PageRequest } from './common'

/** 通知（Notification） */
export interface Notification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  content: string
  link: string
  biz_id: number
  read: boolean
  created_at: string
  read_at: string
}

/** 通知列表查询（ListNotificationsRequest） */
export interface ListNotificationsParams extends Partial<PageRequest> {
  user_id?: number
  type?: number
  unread_only?: boolean
}

/** 通知列表响应（ListNotificationsResponse） */
export interface ListNotificationsResponse {
  notifications: Notification[]
  meta: PageMeta
  unread_count: number
}

/** 短信记录（SmsRecord） */
export interface SmsRecord {
  id: number
  phone: string
  code: string
  scene: string
  /** 0 待发送 1 成功 2 失败 */
  status: number
  error_message: string
  send_count: number
  created_at: string
}

/** 短信记录查询（ListSmsRecordsRequest） */
export interface ListSmsRecordsParams extends Partial<PageRequest> {
  phone?: string
  scene?: string
}

/** 短信记录响应（ListSmsRecordsResponse） */
export interface ListSmsRecordsResponse {
  records: SmsRecord[]
  meta: PageMeta
}

/** 发送短信请求（SendSmsRequest） */
export interface SendSmsRequest {
  phone: string
  /** 场景：login / register / reset_password ... */
  scene: string
}

/** 发送短信响应（SendSmsResponse） */
export interface SendSmsResponse {
  success: boolean
  /** 演示环境下直接返回验证码 */
  code: string
  expire_seconds: number
}

/** 操作日志（AuditLog） */
export interface AuditLog {
  id: number
  admin_id: number
  admin_name: string
  /** product / order / user ... */
  module: string
  /** create / update / delete / export */
  action: string
  target_type: string
  target_id: string
  detail: string
  ip: string
  user_agent: string
  /** 1 成功 0 失败 */
  result: number
  error_message: string
  created_at: string
}

/** 操作日志查询（ListAuditLogsRequest） */
export interface ListAuditLogsParams extends Partial<PageRequest> {
  module?: string
  action?: string
  admin_id?: number
  keyword?: string
  start_time?: number
  end_time?: number
}

/** 操作日志响应（ListAuditLogsResponse） */
export interface ListAuditLogsResponse {
  logs: AuditLog[]
  meta: PageMeta
}
