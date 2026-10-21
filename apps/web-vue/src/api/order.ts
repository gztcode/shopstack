import { httpGet, httpPost } from '@/api/client'
import * as mock from '@/mock'
import { getCachedUser } from '@/utils/auth'
import type {
  AfterSale,
  CreateOrderRequest,
  ListAfterSalesResponse,
  ListOrdersResponse,
  ListRefundReasonsResponse,
  Order,
  OrderCount,
  OrderDetail,
  OrderStatusLog,
  Refund,
} from '@/types'

/** 当前登录用户 ID（网关的用户接口需要显式传入） */
function currentUserId(): number {
  const user = getCachedUser<{ id?: number }>()
  return user?.id ?? 0
}

/** 创建订单 */
export function createOrder(payload: CreateOrderRequest): Promise<Order> {
  return httpPost<Order>('/api/v1/orders', payload, { fallback: () => mock.createOrder(payload) })
}

/** 订单详情 */
export function getOrder(id: number): Promise<OrderDetail> {
  return httpGet<OrderDetail>(
    `/api/v1/orders/${id}`,
    undefined,
    { fallback: () => mock.orderDetail(id) },
  )
}

/** 订单列表 */
export function listOrders(params: {
  page?: number
  page_size?: number
  status?: number
  keyword?: string
}): Promise<ListOrdersResponse> {
  return httpGet<ListOrdersResponse>(
    '/api/v1/orders',
    {
      'page.page': params.page,
      'page.page_size': params.page_size,
      status: params.status,
      keyword: params.keyword,
    },
    { fallback: () => mock.listOrders(params) },
  )
}

/** 订单状态流转日志 */
export function listOrderLogs(orderId: number): Promise<{ logs: OrderStatusLog[] }> {
  return httpGet<{ logs: OrderStatusLog[] }>(
    `/api/v1/orders/${orderId}/logs`,
    undefined,
    { fallback: () => mock.listOrderLogs(orderId) },
  )
}

/** 订单角标数量 */
export function getOrderCount(): Promise<OrderCount> {
  return httpGet<OrderCount>(
    '/api/v1/orders/count',
    undefined,
    { fallback: () => mock.getOrderCount() },
  )
}

/** 取消订单 */
export function cancelOrder(orderId: number, reason?: string): Promise<Order> {
  return httpPost<Order>(
    `/api/v1/orders/${orderId}/cancel`,
    { reason: reason ?? '' },
    { fallback: () => mock.cancelOrder(orderId, reason) },
  )
}

/** 确认收货 */
export function confirmReceipt(orderId: number): Promise<Order> {
  return httpPost<Order>(
    `/api/v1/orders/${orderId}/confirm`,
    {},
    { fallback: () => mock.confirmReceipt(orderId) },
  )
}

/** 申请退款 */
export function applyRefund(payload: {
  order_id: number
  item_ids?: number[]
  amount_cents?: number
  reason: string
  description?: string
}): Promise<Refund> {
  return httpPost<Refund>(
    `/api/v1/orders/${payload.order_id}/refund`,
    payload,
    { fallback: () => mock.applyRefund(payload) },
  )
}

/* ---------------------------------------------------------------------------
 * 售后工单 / 退款原因（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 售后工单列表 */
export function listAfterSales(params?: {
  page?: number
  page_size?: number
  status?: number
  type?: number
}): Promise<ListAfterSalesResponse> {
  return httpGet<ListAfterSalesResponse>(
    '/api/v1/after-sales',
    {
      user_id: currentUserId() || undefined,
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      status: params?.status,
      type: params?.type,
    },
    {
      fallback: () =>
        mock.listAfterSales({
          page: params?.page,
          page_size: params?.page_size,
          status: params?.status,
          type: params?.type,
        }),
    },
  )
}

/** 售后工单详情 */
export function getAfterSale(id: number): Promise<AfterSale> {
  return httpGet<AfterSale>(
    `/api/v1/after-sales/${id}`,
    { user_id: currentUserId() || undefined },
    { fallback: () => mock.getAfterSale(id) },
  )
}

/** 退款原因 */
export function listRefundReasons(type?: number): Promise<ListRefundReasonsResponse> {
  return httpGet<ListRefundReasonsResponse>(
    '/api/v1/refund-reasons',
    { type },
    { fallback: () => mock.listRefundReasons(type) },
  )
}
