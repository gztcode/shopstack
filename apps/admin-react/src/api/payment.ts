/**
 * 支付域接口 —— payment.proto(PaymentService)
 */
import { del, get, post, withMock } from './client'
import type {
  ListBalanceLogsResponse,
  ListPayChannelsResponse,
  ListPaymentsParams,
  ListPaymentsResponse,
  ListRechargesResponse,
  OperationResult,
  PayChannel,
  PaymentSummary,
  SavePayChannelRequest,
} from '@/types'
import {
  mockDeletePayChannel,
  mockListBalanceLogs,
  mockListPayChannels,
  mockListPayments,
  mockListRecharges,
  mockPaymentSummary,
  mockSavePayChannel,
} from '@/mock'

/** 支付流水列表 */
export function listPayments(params: ListPaymentsParams = {}): Promise<ListPaymentsResponse> {
  return withMock(
    '支付流水',
    () => get<ListPaymentsResponse>('/admin/payments', { params }),
    () => mockListPayments(params),
  )
}

/** 支付汇总统计 */
export function paymentSummary(days = 14): Promise<PaymentSummary> {
  return withMock(
    '支付汇总',
    () => get<PaymentSummary>('/admin/payments/summary', { params: { days } }),
    () => mockPaymentSummary(),
  )
}

// ---------------------------------------------------------------------------
// 支付渠道 / 充值订单 / 余额流水
// ---------------------------------------------------------------------------

/** 支付渠道列表 */
export function listPayChannels(
  params: { channel?: number; page?: number; page_size?: number } = {},
): Promise<ListPayChannelsResponse> {
  return withMock(
    '支付渠道',
    () => get<ListPayChannelsResponse>('/admin/pay-channels', { params }),
    () => mockListPayChannels(params),
  )
}

/** 保存支付渠道 */
export function savePayChannel(payload: SavePayChannelRequest): Promise<PayChannel> {
  return withMock(
    '保存支付渠道',
    () => post<PayChannel>('/admin/pay-channels', payload),
    () => mockSavePayChannel(payload),
  )
}

/** 删除支付渠道 */
export function deletePayChannel(id: number): Promise<OperationResult> {
  return withMock(
    '删除支付渠道',
    () => del<OperationResult>(`/admin/pay-channels/${id}`),
    () => mockDeletePayChannel(id),
  )
}

/** 充值订单列表 */
export function listRecharges(
  params: { user_id?: number; status?: number; page?: number; page_size?: number } = {},
): Promise<ListRechargesResponse> {
  return withMock(
    '充值订单',
    () => get<ListRechargesResponse>('/payments/recharges', { params }),
    () => mockListRecharges(params),
  )
}

/** 余额流水列表 */
export function listBalanceLogs(
  params: { user_id?: number; page?: number; page_size?: number } = {},
): Promise<ListBalanceLogsResponse> {
  return withMock(
    '余额流水',
    () => get<ListBalanceLogsResponse>('/payments/balance-logs', { params }),
    () => mockListBalanceLogs(params),
  )
}
