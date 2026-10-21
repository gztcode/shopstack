/**
 * 订单域接口 —— order.proto(OrderService)
 */
import { del, get, post, put, withMock } from './client'
import type {
  AdminListOrdersResponse,
  AdminOrderStatsByChannelResponse,
  AdminOrderStatsByHourResponse,
  AdminOrderStatsByRegionResponse,
  AfterSale,
  ListAdminOrderLogsResponse,
  ListAfterSalesResponse,
  ListRefundReasonsResponse,
  SaveRefundReasonRequest,
  ListOrderLogsResponse,
  ListOrdersParams,
  ListOrdersResponse,
  ListRefundsParams,
  ListRefundsResponse,
  OperationResult,
  Order,
  OrderDetail,
  Refund,
  RefundReason,
} from '@/types'
import {
  mockDeleteRefundReason,
  mockGetAfterSale,
  mockListAdminOrderLogs,
  mockListAfterSales,
  mockListRefundReasons,
  mockOrderStatsByChannel,
  mockOrderStatsByHour,
  mockOrderStatsByRegion,
  mockSaveRefundReason,
  mockSetAfterSaleStatus,
  mockCreateShipment,
  mockGetOrder,
  mockListOrderLogs,
  mockListOrders,
  mockListRefunds,
  mockSetRefundStatus,
  mockUpdateOrderRemark,
} from '@/mock'

/** 订单列表 */
export function listOrders(params: ListOrdersParams = {}): Promise<ListOrdersResponse> {
  return withMock(
    '订单列表',
    () => get<ListOrdersResponse>('/orders', { params }),
    () => mockListOrders(params),
  )
}

/** 订单详情 */
export function getOrder(id: number): Promise<OrderDetail> {
  return withMock('订单详情', () => get<OrderDetail>(`/orders/${id}`), () => mockGetOrder(id))
}

/** 订单状态日志 */
export function listOrderLogs(orderId: number): Promise<ListOrderLogsResponse> {
  return withMock(
    '订单状态日志',
    () => get<ListOrderLogsResponse>(`/orders/${orderId}/logs`),
    () => mockListOrderLogs(orderId),
  )
}

/** 写入订单备注 */
export function updateOrderRemark(id: number, adminRemark: string): Promise<Order> {
  return withMock(
    '订单备注',
    () => put<Order>(`/admin/orders/${id}/remark`, { id, admin_remark: adminRemark }),
    () => mockUpdateOrderRemark(id, adminRemark),
  )
}

/** 创建发货单 */
export function createShipment(payload: {
  order_id: number
  company: string
  company_code?: string
  tracking_no: string
  freight_cents?: number
  remark?: string
}): Promise<{ id: number }> {
  return withMock(
    '订单发货',
    () => post<{ id: number }>('/admin/shipments', payload),
    () => ({ id: mockCreateShipment(payload).id }),
  )
}

/** 退款列表 */
export function listRefunds(params: ListRefundsParams = {}): Promise<ListRefundsResponse> {
  return withMock(
    '退款列表',
    () => get<ListRefundsResponse>('/admin/refunds', { params }),
    () => mockListRefunds(params),
  )
}

/** 设置退款状态（0 待审核 1 通过 2 驳回 3 已退款） */
export function setRefundStatus(
  id: number,
  status: number,
  adminRemark?: string,
): Promise<Refund> {
  return withMock(
    '退款审核',
    () => put<Refund>(`/admin/refunds/${id}/status`, { id, status, admin_remark: adminRemark }),
    () => mockSetRefundStatus(id, status, adminRemark),
  )
}

// ---------------------------------------------------------------------------
// 售后 / 退款原因 / 后台订单 / 订单统计 / 订单日志
// ---------------------------------------------------------------------------

/** 售后单列表（后台） */
export function listAfterSales(
  params: { keyword?: string; status?: number; type?: number; page?: number; page_size?: number } = {},
): Promise<ListAfterSalesResponse> {
  return withMock(
    '售后单列表',
    () => get<ListAfterSalesResponse>('/admin/after-sales', { params }),
    () => mockListAfterSales(params),
  )
}

/** 售后单详情 */
export function getAfterSale(id: number): Promise<AfterSale> {
  return withMock(
    '售后单详情',
    () => get<AfterSale>(`/after-sales/${id}`),
    () => mockGetAfterSale(id),
  )
}

/** 审核售后单（0 待审核 1 通过 2 驳回 3 已退款 4 已完成） */
export function setAfterSaleStatus(
  id: number,
  status: number,
  adminRemark: string,
): Promise<AfterSale> {
  return withMock(
    '售后审核',
    () => put<AfterSale>(`/admin/after-sales/${id}/status`, { id, status, admin_remark: adminRemark }),
    () => mockSetAfterSaleStatus(id, status, adminRemark),
  )
}

/** 退款原因列表（后台） */
export function listRefundReasons(params: { type?: number } = {}): Promise<ListRefundReasonsResponse> {
  return withMock(
    '退款原因',
    () => get<ListRefundReasonsResponse>('/refund-reasons', { params }),
    () => mockListRefundReasons(params),
  )
}

/** 保存退款原因 */
export function saveRefundReason(payload: SaveRefundReasonRequest): Promise<RefundReason> {
  return withMock(
    '保存退款原因',
    () => post<RefundReason>('/admin/refund-reasons', payload),
    () => mockSaveRefundReason(payload),
  )
}

/** 删除退款原因 */
export function deleteRefundReason(id: number): Promise<OperationResult> {
  return withMock(
    '删除退款原因',
    () => del<OperationResult>(`/admin/refund-reasons/${id}`),
    () => mockDeleteRefundReason(id),
  )
}

/** 后台全部订单（多维筛选） */
export function listAdminOrders(
  params: {
    keyword?: string
    status?: number
    payment_method?: number
    user_id?: number
    start_time?: number
    end_time?: number
    page?: number
    page_size?: number
  } = {},
): Promise<AdminListOrdersResponse> {
  return withMock(
    '后台订单列表',
    () => get<AdminListOrdersResponse>('/admin/orders', { params }),
    () => {
      const result = mockListOrders(params as ListOrdersParams)
      return { orders: result.orders, meta: result.meta }
    },
  )
}

/** 订单统计 · 支付渠道 */
export function orderStatsByChannel(): Promise<AdminOrderStatsByChannelResponse> {
  return withMock(
    '订单渠道统计',
    () => get<AdminOrderStatsByChannelResponse>('/admin/orders/stats/channels'),
    () => mockOrderStatsByChannel(),
  )
}

/** 订单统计 · 时段 */
export function orderStatsByHour(): Promise<AdminOrderStatsByHourResponse> {
  return withMock(
    '订单时段统计',
    () => get<AdminOrderStatsByHourResponse>('/admin/orders/stats/hours'),
    () => mockOrderStatsByHour(),
  )
}

/** 订单统计 · 收货地区 */
export function orderStatsByRegion(): Promise<AdminOrderStatsByRegionResponse> {
  return withMock(
    '订单地区统计',
    () => get<AdminOrderStatsByRegionResponse>('/admin/orders/stats/regions'),
    () => mockOrderStatsByRegion(),
  )
}

/** 后台订单日志 */
export function listAdminOrderLogs(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListAdminOrderLogsResponse> {
  return withMock(
    '后台订单日志',
    () => get<ListAdminOrderLogsResponse>('/admin/order-logs', { params }),
    () => mockListAdminOrderLogs(params),
  )
}
