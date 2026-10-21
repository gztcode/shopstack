import { httpGet, httpPost } from '@/api/client'
import * as mock from '@/mock'
import type { OperationResult, Payment, RechargeConfig, RechargeOrder } from '@/types'

/** 支付渠道 */
export const PAYMENT_CHANNELS = [
  { value: 1, key: 'wechat', label: '微信支付', desc: '推荐使用，秒级到账', icon: '💚' },
  { value: 2, key: 'alipay', label: '支付宝', desc: '支持花呗分期', icon: '💙' },
  { value: 3, key: 'balance', label: '余额支付', desc: '使用账户余额支付', icon: '🧡' },
] as const

/** 创建支付单 */
export function createPayment(payload: {
  order_id: number
  channel: number
  return_url?: string
}): Promise<Payment> {
  return httpPost<Payment>(
    '/api/v1/payments',
    payload,
    { fallback: () => mock.createPayment(payload) },
  )
}

/** 查询支付结果 */
export function queryPayment(params: {
  payment_id?: number
  order_id?: number
}): Promise<Payment> {
  return httpGet<Payment>(
    '/api/v1/payments/query',
    { payment_id: params.payment_id, order_id: params.order_id },
    { fallback: () => mock.queryPayment(params) },
  )
}

/** 支付结果回调（演示环境用于模拟第三方支付完成） */
export function notifyPayment(payload: {
  payment_no: string
  transaction_id?: string
  signature?: string
  raw_body?: string
  status?: number
}): Promise<OperationResult> {
  return httpPost<OperationResult>(
    '/api/v1/payments/notify',
    payload,
    { fallback: () => mock.notifyPayment(payload) },
  )
}

/* ---------------------------------------------------------------------------
 * 余额充值（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 充值配置（面额区间、预置金额与赠送规则） */
export function getRechargeConfig(): Promise<RechargeConfig> {
  return httpGet<RechargeConfig>(
    '/api/v1/payments/recharge-config',
    undefined,
    { fallback: () => mock.getRechargeConfig() },
  )
}

/** 创建充值单 */
export function createRecharge(payload: {
  amount_cents: number
  channel?: number
}): Promise<RechargeOrder> {
  return httpPost<RechargeOrder>(
    '/api/v1/payments/recharge',
    payload,
    { fallback: () => mock.createRecharge(payload) },
  )
}
