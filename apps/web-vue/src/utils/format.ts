/**
 * 展示层格式化工具
 * 约定：金额一律以「分」为单位的整数存储，展示时才转换为「元」。
 */

/** 分 → 展示文本，例如 129900 → ¥1,299.00 */
export function formatYuan(cents?: number | null, withSymbol = true): string {
  const value = Number(cents ?? 0) / 100
  const text = value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withSymbol ? `¥${text}` : text
}

/** 分 → 紧凑文本，例如 129900 → ¥1,299（用于大额汇总） */
export function formatYuanShort(cents?: number | null): string {
  const value = Number(cents ?? 0) / 100
  if (Math.abs(value) >= 10000) {
    return `¥${(value / 10000).toFixed(2)}万`
  }
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

/** 「元」文本 → 分，例如 '12.5' → 1250 */
export function yuanToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0
  const num = typeof input === 'number' ? input : Number.parseFloat(input)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

/** 千分位数字 */
export function formatNumber(value?: number | null): string {
  return Number(value ?? 0).toLocaleString('zh-CN')
}

/** 销量等大数字紧凑展示：12345 → 1.2万 */
export function formatCount(value?: number | null): string {
  const num = Number(value ?? 0)
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

function toDate(value?: string | number | null): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    // 秒级时间戳
    return new Date(value * 1000)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** RFC3339 时间 → 2026-10-20 11:49 */
export function formatDateTime(value?: string | number | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** RFC3339 时间 → 2026-10-20 */
export function formatDate(value?: string | number | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** RFC3339 时间 → 11:49:05 */
export function formatTime(value?: string | number | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 相对时间：3 分钟前 / 2 天前 */
export function formatFromNow(value?: string | number | null): string {
  const date = toDate(value)
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return formatDateTime(value)
}

/** 手机号脱敏 */
export function maskPhone(phone?: string | null): string {
  if (!phone || phone.length < 7) return phone ?? '—'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/** 地址拼接 */
export function formatAddress(address?: {
  province?: string
  city?: string
  district?: string
  detail?: string
} | null): string {
  if (!address) return '—'
  return [address.province, address.city, address.district, address.detail]
    .filter(Boolean)
    .join(' ')
}

/** 倒计时文本（秒） */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
