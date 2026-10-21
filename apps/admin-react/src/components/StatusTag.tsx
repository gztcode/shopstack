/**
 * 枚举状态标签：按枚举值自动映射中文文案与配色
 * 字符串枚举（ORDER_STATUS_PAID 等）自动识别前缀；
 * 数值枚举（退款状态 0/1/2 等）需通过 kind 指定分组。
 */
import { Tag } from 'antd'
import {
  ENUM_MAPS,
  NUMERIC_ENUM_MAPS,
  getEnumMeta,
  getNumericEnumMeta,
  inferEnumKind,
  type EnumKind,
  type NumericEnumKind,
} from '@/utils/enums'

interface StatusTagProps {
  status: string | number
  /** 枚举分组：字符串枚举可选，数值枚举必填 */
  kind?: EnumKind | NumericEnumKind
}

/** 解析枚举元信息 */
function resolve(status: string | number, kind?: StatusTagProps['kind']) {
  if (typeof status === 'string') {
    if (kind && kind in ENUM_MAPS) {
      return getEnumMeta(kind as EnumKind, status)
    }
    const inferred = inferEnumKind(status)
    if (inferred) return getEnumMeta(inferred, status)
    return { label: status, color: 'default' as const }
  }
  if (kind && kind in NUMERIC_ENUM_MAPS) {
    return getNumericEnumMeta(kind as NumericEnumKind, status)
  }
  return { label: String(status), color: 'default' as const }
}

/** 状态标签 */
export default function StatusTag({ status, kind }: StatusTagProps) {
  const meta = resolve(status, kind)
  return (
    <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
      {meta.label}
    </Tag>
  )
}
