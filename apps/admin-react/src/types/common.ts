/**
 * 通用类型 —— 对齐 proto/shopstack/common/v1/common.proto
 */

/** 统一响应信封 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  trace_id?: string
}

/** 分页请求（PageRequest） */
export interface PageRequest {
  page: number
  page_size: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
}

/** 分页元信息（PageMeta） */
export interface PageMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

/** 操作结果（OperationResult） */
export interface OperationResult {
  success: boolean
  message: string
}

/** 收货地址（Address） */
export interface Address {
  id: number
  receiver: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  postal_code: string
  tag: string
  is_default: boolean
}

/** 图片项（ImageItem） */
export interface ImageItem {
  url: string
  alt: string
  sort: number
}

/** 性别枚举（Gender） */
export type Gender = 'GENDER_UNSPECIFIED' | 'GENDER_MALE' | 'GENDER_FEMALE' | 'GENDER_UNKNOWN'

/** 用户状态枚举（UserStatus） */
export type UserStatus =
  | 'USER_STATUS_UNSPECIFIED'
  | 'USER_STATUS_ACTIVE'
  | 'USER_STATUS_DISABLED'
  | 'USER_STATUS_FROZEN'

/** 商品状态枚举（ProductStatus） */
export type ProductStatus =
  | 'PRODUCT_STATUS_UNSPECIFIED'
  | 'PRODUCT_STATUS_DRAFT'
  | 'PRODUCT_STATUS_ON_SHELF'
  | 'PRODUCT_STATUS_OFF_SHELF'

/** 订单状态枚举（OrderStatus） */
export type OrderStatus =
  | 'ORDER_STATUS_UNSPECIFIED'
  | 'ORDER_STATUS_PENDING_PAYMENT'
  | 'ORDER_STATUS_PAID'
  | 'ORDER_STATUS_SHIPPED'
  | 'ORDER_STATUS_COMPLETED'
  | 'ORDER_STATUS_CANCELLED'
  | 'ORDER_STATUS_REFUNDING'
  | 'ORDER_STATUS_REFUNDED'
  | 'ORDER_STATUS_CLOSED'

/** 支付状态枚举（PaymentStatus） */
export type PaymentStatus =
  | 'PAYMENT_STATUS_UNSPECIFIED'
  | 'PAYMENT_STATUS_PENDING'
  | 'PAYMENT_STATUS_SUCCESS'
  | 'PAYMENT_STATUS_FAILED'
  | 'PAYMENT_STATUS_CLOSED'

/** 支付渠道枚举（PaymentChannel） */
export type PaymentChannel =
  | 'PAYMENT_CHANNEL_UNSPECIFIED'
  | 'PAYMENT_CHANNEL_WECHAT'
  | 'PAYMENT_CHANNEL_ALIPAY'
  | 'PAYMENT_CHANNEL_BALANCE'

/** 评价状态枚举（ReviewStatus） */
export type ReviewStatus =
  | 'REVIEW_STATUS_UNSPECIFIED'
  | 'REVIEW_STATUS_PENDING'
  | 'REVIEW_STATUS_APPROVED'
  | 'REVIEW_STATUS_REJECTED'

/** 优惠券类型枚举（CouponType） */
export type CouponType =
  | 'COUPON_TYPE_UNSPECIFIED'
  | 'COUPON_TYPE_FIXED'
  | 'COUPON_TYPE_PERCENT'
  | 'COUPON_TYPE_SHIPPING'

/** 用户券状态枚举（UserCouponStatus） */
export type UserCouponStatus =
  | 'USER_COUPON_STATUS_UNSPECIFIED'
  | 'USER_COUPON_STATUS_UNUSED'
  | 'USER_COUPON_STATUS_USED'
  | 'USER_COUPON_STATUS_EXPIRED'

/** 物流状态枚举（ShipmentStatus） */
export type ShipmentStatus =
  | 'SHIPMENT_STATUS_UNSPECIFIED'
  | 'SHIPMENT_STATUS_PENDING'
  | 'SHIPMENT_STATUS_SHIPPED'
  | 'SHIPMENT_STATUS_DELIVERED'
  | 'SHIPMENT_STATUS_EXCEPTION'

/** 通知类型枚举（NotificationType） */
export type NotificationType =
  | 'NOTIFICATION_TYPE_UNSPECIFIED'
  | 'NOTIFICATION_TYPE_ORDER'
  | 'NOTIFICATION_TYPE_LOGISTICS'
  | 'NOTIFICATION_TYPE_PROMOTION'
  | 'NOTIFICATION_TYPE_SYSTEM'
