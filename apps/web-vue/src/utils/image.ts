/** 图片占位与加载失败处理 */

export const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23EEF4FF'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='26' fill='%232A4AD9' text-anchor='middle' dominant-baseline='middle'%3EShopStack%3C/text%3E%3C/svg%3E"

/** 图片加载失败时替换为占位图（只替换一次，避免死循环） */
export function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement | null
  if (!target) return
  if (target.dataset.fallbackApplied === '1') return
  target.dataset.fallbackApplied = '1'
  target.src = FALLBACK_IMAGE
}
