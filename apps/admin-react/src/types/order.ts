/**
 * 订单 / 退款类型 —— 对齐 proto/shopstack/order/v1/order.proto
 */
import type { Address, OrderStatus, PageMeta, PageRequest } from './common'

/** 订单项（OrderItem） */
export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_title: string
  spec_text: string
  image: string
  price_cents: number
  quantity: number
  subtotal_cents: number
  refunded_cents: number
  reviewed: boolean
}

/** 订单（Order） */
export interface Order {
  id: number
  order_no: string
  user_id: number
  user_nickname: string
  status: OrderStatus
  total_amount_cents: number
  discount_cents: number
  freight_cents: number
  payable_cents: number
  paid_cents: number
  refunded_cents: number
  item_count: number
  total_quantity: number
  address: Address
  remark: string
  payment_method: string
  paid_at: string
  shipped_at: string
  completed_at: string
  cancelled_at: string
  created_at: string
  updated_at: string
  admin_remark: string
  shipment_id: number
}

/** 订单状态日志（OrderStatusLog） */
export interface OrderStatusLog {
  id: number
  order_id: number
  from_status: number
  to_status: number
  action: string
  operator: string
  remark: string
  created_at: string
}

/** 订单详情（OrderDetail） */
export interface OrderDetail {
  order: Order
  items: OrderItem[]
  logs: OrderStatusLog[]
  coupon_id: number
  coupon_name: string
  payment_id: number
  shipment_id: number
  tracking_no: string
  logistics_company: string
  logistics_tracks: string[]
  can_cancel: boolean
  can_pay: boolean
  can_confirm: boolean
  can_refund: boolean
  can_review: boolean
}

/** 退款单（Refund） */
export interface Refund {
  id: number
  refund_no: string
  order_id: number
  order_no: string
  user_id: number
  amount_cents: number
  reason: string
  description: string
  item_ids: number[]
  /** 0 待审核 1 已通过 2 已驳回 3 已退款 */
  status: number
  admin_remark: string
  created_at: string
  processed_at: string
}

/** 订单列表查询（ListOrdersRequest） */
export interface ListOrdersParams extends Partial<PageRequest> {
  user_id?: number
  status?: number
  keyword?: string
  start_time?: number
  end_time?: number
}

/** 订单列表响应（ListOrdersResponse） */
export interface ListOrdersResponse {
  orders: Order[]
  meta: PageMeta
  pending_payment_count: number
  pending_shipment_count: number
  pending_receipt_count: number
  refunding_count: number
}

/** 退款列表查询（ListRefundsRequest） */
export interface ListRefundsParams extends Partial<PageRequest> {
  status?: number
  user_id?: number
  keyword?: string
}

/** 退款列表响应（ListRefundsResponse） */
export interface ListRefundsResponse {
  refunds: Refund[]
  meta: PageMeta
}

/** 订单状态日志响应（ListOrderLogsResponse） */
export interface ListOrderLogsResponse {
  logs: OrderStatusLog[]
}
