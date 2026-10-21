/**
 * 营销类型 —— 对齐 proto/shopstack/marketing/v1/marketing.proto
 */
import type { CouponType, PageMeta, PageRequest, UserCouponStatus } from './common'

/** 优惠券（Coupon） */
export interface Coupon {
  id: number
  name: string
  code: string
  type: CouponType
  /** 满减金额 */
  face_value_cents: number
  /** 折扣百分比，如 85 表示 8.5 折 */
  percent: number
  /** 使用门槛 */
  min_amount_cents: number
  /** 最大优惠金额 */
  max_discount_cents: number
  /** 发行总量 */
  total_quantity: number
  received_quantity: number
  used_quantity: number
  per_user_limit: number
  start_time: number
  end_time: number
  /** 限定分类，0 = 全场 */
  category_id: number
  enabled: boolean
  created_at: string
}

/** 用户券（UserCoupon） */
export interface UserCoupon {
  id: number
  user_id: number
  coupon_id: number
  coupon: Coupon
  status: UserCouponStatus
  order_id: number
  received_at: string
  used_at: string
}

/** 促销活动（Promotion） */
export interface Promotion {
  id: number
  name: string
  description: string
  /** 1 满减 2 折扣 3 秒杀 4 拼团 */
  type: number
  /** 0 未开始 1 进行中 2 已结束 3 已下线 */
  status: number
  start_time: number
  end_time: number
  min_amount_cents: number
  discount_cents: number
  percent: number
  product_id: number
  limit_per_user: number
  sold_count: number
  banner_image: string
  created_at: string
}

/** 优惠券列表查询（ListCouponsRequest） */
export interface ListCouponsParams extends Partial<PageRequest> {
  keyword?: string
  type?: number
  enabled?: boolean
  available?: boolean
}

/** 优惠券列表响应（ListCouponsResponse） */
export interface ListCouponsResponse {
  coupons: Coupon[]
  meta: PageMeta
}

/** 保存优惠券（SaveCouponRequest） */
export interface SaveCouponRequest {
  id?: number
  name: string
  code: string
  type: number
  face_value_cents: number
  percent: number
  min_amount_cents: number
  max_discount_cents: number
  total_quantity: number
  per_user_limit: number
  start_time: number
  end_time: number
  category_id: number
  enabled: boolean
}

/** 活动列表查询（ListPromotionsRequest） */
export interface ListPromotionsParams extends Partial<PageRequest> {
  status?: number
  keyword?: string
  type?: number
}

/** 活动列表响应（ListPromotionsResponse） */
export interface ListPromotionsResponse {
  promotions: Promotion[]
  meta: PageMeta
}

/** 保存活动（SavePromotionRequest） */
export interface SavePromotionRequest {
  id?: number
  name: string
  description?: string
  type: number
  status: number
  start_time: number
  end_time: number
  min_amount_cents: number
  discount_cents: number
  percent: number
  product_id: number
  limit_per_user: number
  banner_image?: string
}
