/**
 * 系统设置域接口 —— notification.proto(NotificationService.ListSystemSettings / UpdateSystemSettings)
 */
import { get, put, withMock } from './client'
import type { ListSystemSettingsResponse, UpdateSystemSettingsRequest } from '@/types'
import { mockListSystemSettings, mockUpdateSystemSettings } from '@/mock'

/** 设置列表（group 为空返回全部分组） */
export function listSystemSettings(group?: string): Promise<ListSystemSettingsResponse> {
  return withMock(
    '系统设置',
    () => get<ListSystemSettingsResponse>('/admin/settings', { params: { group } }),
    () => mockListSystemSettings(group),
  )
}

/**
 * 按分组保存设置
 * values 的 key 必须是已存在的配置键，服务端会忽略不存在的键。
 */
export function updateSystemSettings(
  payload: UpdateSystemSettingsRequest,
): Promise<ListSystemSettingsResponse> {
  return withMock(
    '保存系统设置',
    () => put<ListSystemSettingsResponse>('/admin/settings', payload),
    () => mockUpdateSystemSettings(payload.group, payload.values),
  )
}
