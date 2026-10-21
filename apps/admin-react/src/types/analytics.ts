/**
 * 经营分析类型 —— 对齐 proto/shopstack/order/v1/order.proto(AdminOrderStatsResponse)
 */

/** 订单趋势点（OrderTrendPoint） */
export interface OrderTrendPoint {
  date: string
  order_count: number
  revenue_cents: number
  new_users: number
}

/** 订单分类统计（OrderCategoryStat） */
export interface OrderCategoryStat {
  category_id: number
  category_name: string
  sales_count: number
  revenue_cents: number
}

/** 订单热销商品（OrderTopProduct） */
export interface OrderTopProduct {
  product_id: number
  title: string
  cover: string
  sales_count: number
  revenue_cents: number
}

/** 订单经营统计（AdminOrderStatsResponse） */
export interface AdminOrderStats {
  total_orders: number
  paid_orders: number
  pending_payment: number
  pending_shipment: number
  pending_receipt: number
  refunding: number
  cancelled: number
  completed: number
  total_revenue_cents: number
  today_revenue_cents: number
  today_orders: number
  total_users: number
  trend: OrderTrendPoint[]
  category_stats: OrderCategoryStat[]
  top_products: OrderTopProduct[]
}
