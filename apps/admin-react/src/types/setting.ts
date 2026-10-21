/**
 * 系统设置类型 —— 对齐 proto/shopstack/notification/v1/notification.proto(SystemSetting)
 */

/** 系统设置（SystemSetting） */
export interface SystemSetting {
  id: number
  key: string
  value: string
  name: string
  /** 分组，如 basic / order / sms */
  group: string
  description: string
  /** string / number / bool / json */
  value_type: string
  updated_at: string
}

/** 设置列表响应（ListSystemSettingsResponse） */
export interface ListSystemSettingsResponse {
  settings: SystemSetting[]
}

/** 更新设置（UpdateSystemSettingsRequest） */
export interface UpdateSystemSettingsRequest {
  group: string
  values: Record<string, string>
}
