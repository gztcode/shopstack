/**
 * 格式化工具 —— 金额单位统一为「分」，时间统一 RFC3339 字符串
 */
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

/**
 * 分 → 展示用金额（元）
 * @param cents 金额（分）
 * @param withSymbol 是否带 ¥ 符号
 */
export function formatYuan(cents: number | null | undefined, withSymbol = true): string {
  const value = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0
  const yuan = value / 100
  const text = yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withSymbol ? `¥${text}` : text
}

/** 金额（元）→ 分，用于表单回填 */
export function yuanToCents(yuan: number | null | undefined): number {
  if (typeof yuan !== 'number' || !Number.isFinite(yuan)) return 0
  return Math.round(yuan * 100)
}

/** 数字千分位 */
export function formatNumber(value: number | null | undefined): string {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return num.toLocaleString('zh-CN')
}

/** 金额（元）→ 分，用于表单回填 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
}

/** 日期格式化 */
export function formatDate(value?: string | null): string {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD') : '-'
}

/** 秒级时间戳 → 可读时间 */
export function formatUnix(seconds?: number | null): string {
  if (!seconds) return '-'
  const d = dayjs.unix(seconds)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
}

/** Date → 秒级时间戳 */
export function toUnixSeconds(date?: dayjs.Dayjs | null): number {
  if (!date) return 0
  return date.unix()
}

/** 相对时间 */
export function fromNow(value?: string | null): string {
  if (!value) return '-'
  const d = dayjs(value)
  if (!d.isValid()) return '-'
  return d.fromNow()
}
