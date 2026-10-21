/**
 * 支付类型 —— 对齐 proto/shopstack/payment/v1/payment.proto
 */
import type { PageMeta, PageRequest, PaymentChannel, PaymentStatus } from './common'

/** 支付单（Payment） */
export interface Payment {
  id: number
  payment_no: string
  order_id: number
  order_no: string
  user_id: number
  amount_cents: number
  refunded_cents: number
  status: PaymentStatus
  channel: PaymentChannel
  transaction_id: string
  prepay_id: string
  pay_params: Record<string, string>
  fail_reason: string
  paid_at: string
  created_at: string
  updated_at: string
}

/** 支付退款（PaymentRefund） */
export interface PaymentRefund {
  id: number
  refund_no: string
  payment_id: number
  order_id: number
  amount_cents: number
  status: number
  reason: string
  transaction_id: string
  created_at: string
}

/** 支付列表查询（ListPaymentsRequest） */
export interface ListPaymentsParams extends Partial<PageRequest> {
  status?: number
  channel?: number
  keyword?: string
  user_id?: number
  start_time?: number
  end_time?: number
}

/** 支付列表响应（ListPaymentsResponse） */
export interface ListPaymentsResponse {
  payments: Payment[]
  meta: PageMeta
  total_amount_cents: number
  total_refunded_cents: number
}

/** 支付趋势点（PaymentTrendPoint） */
export interface PaymentTrendPoint {
  date: string
  count: number
  amount_cents: number
}

/** 支付汇总（PaymentSummaryResponse） */
export interface PaymentSummary {
  today_count: number
  today_amount_cents: number
  total_count: number
  total_amount_cents: number
  refunded_amount_cents: number
  /** 百分比整数 */
  success_rate: number
  trend: PaymentTrendPoint[]
}
