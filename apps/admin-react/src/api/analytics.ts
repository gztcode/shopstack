/**
 * 经营分析域接口 —— order.proto(OrderService.AdminOrderStats) + payment.proto(PaymentService.Summary)
 */
import { get, withMock } from './client'
import type { AdminOrderStats, PaymentSummary } from '@/types'
import { mockAdminOrderStats, mockPaymentSummary } from '@/mock'

/** 订单经营统计 */
export function adminOrderStats(days = 30): Promise<AdminOrderStats> {
  return withMock(
    '订单经营统计',
    () => get<AdminOrderStats>('/admin/orders/stats', { params: { days } }),
    () => mockAdminOrderStats(days),
  )
}

/** 支付汇总（渠道与金额） */
export function paymentSummary(days = 30): Promise<PaymentSummary> {
  return withMock(
    '支付汇总',
    () => get<PaymentSummary>('/admin/payments/summary', { params: { days } }),
    () => mockPaymentSummary(),
  )
}
