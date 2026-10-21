/**
 * 枚举 → 中文 / 颜色映射
 * proto 中枚举字段在 JSON 中以字符串形式返回（如 "ORDER_STATUS_PAID"），
 * 少数后台接口使用 int32 状态值，单独维护数值映射表。
 */
import type { TagProps } from 'antd'

export type TagColor = TagProps['color']

export interface EnumMeta {
  label: string
  color: TagColor
}

const UNKNOWN: EnumMeta = { label: '未知', color: 'default' }

/** 字符串枚举映射 */
export const ENUM_MAPS = {
  order: {
    ORDER_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    ORDER_STATUS_PENDING_PAYMENT: { label: '待付款', color: 'gold' },
    ORDER_STATUS_PAID: { label: '待发货', color: 'processing' },
    ORDER_STATUS_SHIPPED: { label: '待收货', color: 'cyan' },
    ORDER_STATUS_COMPLETED: { label: '已完成', color: 'success' },
    ORDER_STATUS_CANCELLED: { label: '已取消', color: 'default' },
    ORDER_STATUS_REFUNDING: { label: '退款中', color: 'warning' },
    ORDER_STATUS_REFUNDED: { label: '已退款', color: 'error' },
    ORDER_STATUS_CLOSED: { label: '已关闭', color: 'default' },
  } satisfies Record<string, EnumMeta>,
  product: {
    PRODUCT_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    PRODUCT_STATUS_DRAFT: { label: '草稿', color: 'default' },
    PRODUCT_STATUS_ON_SHELF: { label: '已上架', color: 'success' },
    PRODUCT_STATUS_OFF_SHELF: { label: '已下架', color: 'error' },
  } satisfies Record<string, EnumMeta>,
  user: {
    USER_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    USER_STATUS_ACTIVE: { label: '正常', color: 'success' },
    USER_STATUS_DISABLED: { label: '已禁用', color: 'error' },
    USER_STATUS_FROZEN: { label: '已冻结', color: 'warning' },
  } satisfies Record<string, EnumMeta>,
  review: {
    REVIEW_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    REVIEW_STATUS_PENDING: { label: '待审核', color: 'warning' },
    REVIEW_STATUS_APPROVED: { label: '已通过', color: 'success' },
    REVIEW_STATUS_REJECTED: { label: '已驳回', color: 'error' },
  } satisfies Record<string, EnumMeta>,
  payment: {
    PAYMENT_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    PAYMENT_STATUS_PENDING: { label: '待支付', color: 'warning' },
    PAYMENT_STATUS_SUCCESS: { label: '支付成功', color: 'success' },
    PAYMENT_STATUS_FAILED: { label: '支付失败', color: 'error' },
    PAYMENT_STATUS_CLOSED: { label: '已关闭', color: 'default' },
  } satisfies Record<string, EnumMeta>,
  channel: {
    PAYMENT_CHANNEL_UNSPECIFIED: { label: '未知渠道', color: 'default' },
    PAYMENT_CHANNEL_WECHAT: { label: '微信支付', color: 'success' },
    PAYMENT_CHANNEL_ALIPAY: { label: '支付宝', color: 'processing' },
    PAYMENT_CHANNEL_BALANCE: { label: '余额支付', color: 'gold' },
  } satisfies Record<string, EnumMeta>,
  coupon: {
    COUPON_TYPE_UNSPECIFIED: { label: '未知类型', color: 'default' },
    COUPON_TYPE_FIXED: { label: '满减券', color: 'processing' },
    COUPON_TYPE_PERCENT: { label: '折扣券', color: 'purple' },
    COUPON_TYPE_SHIPPING: { label: '免运费券', color: 'cyan' },
  } satisfies Record<string, EnumMeta>,
  shipment: {
    SHIPMENT_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    SHIPMENT_STATUS_PENDING: { label: '待发货', color: 'warning' },
    SHIPMENT_STATUS_SHIPPED: { label: '已发货', color: 'processing' },
    SHIPMENT_STATUS_DELIVERED: { label: '已签收', color: 'success' },
    SHIPMENT_STATUS_EXCEPTION: { label: '物流异常', color: 'error' },
  } satisfies Record<string, EnumMeta>,
  notification: {
    NOTIFICATION_TYPE_UNSPECIFIED: { label: '未知', color: 'default' },
    NOTIFICATION_TYPE_ORDER: { label: '订单', color: 'processing' },
    NOTIFICATION_TYPE_LOGISTICS: { label: '物流', color: 'cyan' },
    NOTIFICATION_TYPE_PROMOTION: { label: '营销', color: 'purple' },
    NOTIFICATION_TYPE_SYSTEM: { label: '系统', color: 'default' },
  } satisfies Record<string, EnumMeta>,
  userCoupon: {
    USER_COUPON_STATUS_UNSPECIFIED: { label: '未知', color: 'default' },
    USER_COUPON_STATUS_UNUSED: { label: '未使用', color: 'processing' },
    USER_COUPON_STATUS_USED: { label: '已使用', color: 'success' },
    USER_COUPON_STATUS_EXPIRED: { label: '已过期', color: 'default' },
  } satisfies Record<string, EnumMeta>,
  gender: {
    GENDER_UNSPECIFIED: { label: '未设置', color: 'default' },
    GENDER_MALE: { label: '男', color: 'processing' },
    GENDER_FEMALE: { label: '女', color: 'magenta' },
    GENDER_UNKNOWN: { label: '保密', color: 'default' },
  } satisfies Record<string, EnumMeta>,
} as const

export type EnumKind = keyof typeof ENUM_MAPS

/** 数值型枚举映射（int32 状态值） */
export const NUMERIC_ENUM_MAPS = {
  order: {
    0: { label: '未知', color: 'default' },
    1: { label: '待付款', color: 'gold' },
    2: { label: '待发货', color: 'processing' },
    3: { label: '待收货', color: 'cyan' },
    4: { label: '已完成', color: 'success' },
    5: { label: '已取消', color: 'default' },
    6: { label: '退款中', color: 'warning' },
    7: { label: '已退款', color: 'error' },
    8: { label: '已关闭', color: 'default' },
  } satisfies Record<number, EnumMeta>,
  product: {
    0: { label: '未知', color: 'default' },
    1: { label: '草稿', color: 'default' },
    2: { label: '已上架', color: 'success' },
    3: { label: '已下架', color: 'error' },
  } satisfies Record<number, EnumMeta>,
  user: {
    0: { label: '未知', color: 'default' },
    1: { label: '正常', color: 'success' },
    2: { label: '已禁用', color: 'error' },
    3: { label: '已冻结', color: 'warning' },
  } satisfies Record<number, EnumMeta>,
  review: {
    0: { label: '未知', color: 'default' },
    1: { label: '待审核', color: 'warning' },
    2: { label: '已通过', color: 'success' },
    3: { label: '已驳回', color: 'error' },
  } satisfies Record<number, EnumMeta>,
  payment: {
    0: { label: '未知', color: 'default' },
    1: { label: '待支付', color: 'warning' },
    2: { label: '支付成功', color: 'success' },
    3: { label: '支付失败', color: 'error' },
    4: { label: '已关闭', color: 'default' },
  } satisfies Record<number, EnumMeta>,
  channel: {
    0: { label: '未知渠道', color: 'default' },
    1: { label: '微信支付', color: 'success' },
    2: { label: '支付宝', color: 'processing' },
    3: { label: '余额支付', color: 'gold' },
  } satisfies Record<number, EnumMeta>,
  coupon: {
    0: { label: '未知类型', color: 'default' },
    1: { label: '满减券', color: 'processing' },
    2: { label: '折扣券', color: 'purple' },
    3: { label: '免运费券', color: 'cyan' },
  } satisfies Record<number, EnumMeta>,
  shipment: {
    0: { label: '未知', color: 'default' },
    1: { label: '待发货', color: 'warning' },
    2: { label: '已发货', color: 'processing' },
    3: { label: '已签收', color: 'success' },
    4: { label: '物流异常', color: 'error' },
  } satisfies Record<number, EnumMeta>,
  /** 退款状态：0 待审核 1 已通过 2 已驳回 3 已退款 */
  refund: {
    0: { label: '待审核', color: 'warning' },
    1: { label: '已通过', color: 'processing' },
    2: { label: '已驳回', color: 'error' },
    3: { label: '已退款', color: 'success' },
  } satisfies Record<number, EnumMeta>,
  /** 活动状态：0 未开始 1 进行中 2 已结束 3 已下线 */
  promotion: {
    0: { label: '未开始', color: 'default' },
    1: { label: '进行中', color: 'success' },
    2: { label: '已结束', color: 'default' },
    3: { label: '已下线', color: 'error' },
  } satisfies Record<number, EnumMeta>,
  /** 活动类型：1 满减 2 折扣 3 秒杀 4 拼团 */
  promotionType: {
    1: { label: '满减', color: 'processing' },
    2: { label: '折扣', color: 'purple' },
    3: { label: '秒杀', color: 'error' },
    4: { label: '拼团', color: 'cyan' },
  } satisfies Record<number, EnumMeta>,
  /** 库存变更类型：1 入库 2 预扣 3 释放 4 扣减 5 调整 6 退货入库 */
  inventoryChange: {
    1: { label: '入库', color: 'success' },
    2: { label: '预扣', color: 'processing' },
    3: { label: '释放', color: 'cyan' },
    4: { label: '扣减', color: 'warning' },
    5: { label: '调整', color: 'purple' },
    6: { label: '退货入库', color: 'success' },
  } satisfies Record<number, EnumMeta>,
  /** 短信状态：0 待发送 1 成功 2 失败 */
  sms: {
    0: { label: '待发送', color: 'default' },
    1: { label: '发送成功', color: 'success' },
    2: { label: '发送失败', color: 'error' },
  } satisfies Record<number, EnumMeta>,
} as const

export type NumericEnumKind = keyof typeof NUMERIC_ENUM_MAPS

/**
 * 字符串枚举 → 数值枚举
 * proto 中各 enum 均从 1 开始编号，后台列表接口的状态筛选参数为 int32
 */
export const ENUM_NUMERIC_VALUE: Record<string, number> = {
  ORDER_STATUS_PENDING_PAYMENT: 1,
  ORDER_STATUS_PAID: 2,
  ORDER_STATUS_SHIPPED: 3,
  ORDER_STATUS_COMPLETED: 4,
  ORDER_STATUS_CANCELLED: 5,
  ORDER_STATUS_REFUNDING: 6,
  ORDER_STATUS_REFUNDED: 7,
  ORDER_STATUS_CLOSED: 8,
  PRODUCT_STATUS_DRAFT: 1,
  PRODUCT_STATUS_ON_SHELF: 2,
  PRODUCT_STATUS_OFF_SHELF: 3,
  USER_STATUS_ACTIVE: 1,
  USER_STATUS_DISABLED: 2,
  USER_STATUS_FROZEN: 3,
  REVIEW_STATUS_PENDING: 1,
  REVIEW_STATUS_APPROVED: 2,
  REVIEW_STATUS_REJECTED: 3,
  PAYMENT_STATUS_PENDING: 1,
  PAYMENT_STATUS_SUCCESS: 2,
  PAYMENT_STATUS_FAILED: 3,
  PAYMENT_STATUS_CLOSED: 4,
  PAYMENT_CHANNEL_WECHAT: 1,
  PAYMENT_CHANNEL_ALIPAY: 2,
  PAYMENT_CHANNEL_BALANCE: 3,
  COUPON_TYPE_FIXED: 1,
  COUPON_TYPE_PERCENT: 2,
  COUPON_TYPE_SHIPPING: 3,
  SHIPMENT_STATUS_PENDING: 1,
  SHIPMENT_STATUS_SHIPPED: 2,
  SHIPMENT_STATUS_DELIVERED: 3,
  SHIPMENT_STATUS_EXCEPTION: 4,
}

/** 字符串枚举值转数值 */
export function enumToNumber(value?: string | null): number | undefined {
  if (!value) return undefined
  return ENUM_NUMERIC_VALUE[value]
}

/** 字符串枚举前缀 → 枚举分组，用于自动识别 */const PREFIX_KIND: Array<[string, EnumKind]> = [
  ['ORDER_STATUS_', 'order'],
  ['PRODUCT_STATUS_', 'product'],
  ['USER_STATUS_', 'user'],
  ['REVIEW_STATUS_', 'review'],
  ['PAYMENT_STATUS_', 'payment'],
  ['PAYMENT_CHANNEL_', 'channel'],
  ['COUPON_TYPE_', 'coupon'],
  ['SHIPMENT_STATUS_', 'shipment'],
  ['NOTIFICATION_TYPE_', 'notification'],
  ['USER_COUPON_STATUS_', 'userCoupon'],
  ['GENDER_', 'gender'],
]

/** 根据枚举值自动推断分组 */
export function inferEnumKind(value: string): EnumKind | undefined {
  return PREFIX_KIND.find(([prefix]) => value.startsWith(prefix))?.[1]
}

/** 取字符串枚举的元信息 */
export function getEnumMeta(kind: EnumKind, value?: string | null): EnumMeta {
  if (!value) return UNKNOWN
  const map = ENUM_MAPS[kind] as Record<string, EnumMeta>
  return map[value] ?? { label: value, color: 'default' }
}

/** 取数值枚举的元信息 */
export function getNumericEnumMeta(kind: NumericEnumKind, value?: number | null): EnumMeta {
  if (value === null || value === undefined) return UNKNOWN
  const map = NUMERIC_ENUM_MAPS[kind] as Record<number, EnumMeta>
  return map[value] ?? { label: `状态 ${value}`, color: 'default' }
}

/** 订单状态的可选值（用于筛选下拉） */
export const ORDER_STATUS_OPTIONS = [
  { label: '待付款', value: 'ORDER_STATUS_PENDING_PAYMENT' },
  { label: '待发货', value: 'ORDER_STATUS_PAID' },
  { label: '待收货', value: 'ORDER_STATUS_SHIPPED' },
  { label: '已完成', value: 'ORDER_STATUS_COMPLETED' },
  { label: '已取消', value: 'ORDER_STATUS_CANCELLED' },
  { label: '退款中', value: 'ORDER_STATUS_REFUNDING' },
  { label: '已退款', value: 'ORDER_STATUS_REFUNDED' },
  { label: '已关闭', value: 'ORDER_STATUS_CLOSED' },
]

/** 商品状态可选值 */
export const PRODUCT_STATUS_OPTIONS = [
  { label: '草稿', value: 'PRODUCT_STATUS_DRAFT' },
  { label: '已上架', value: 'PRODUCT_STATUS_ON_SHELF' },
  { label: '已下架', value: 'PRODUCT_STATUS_OFF_SHELF' },
]

/** 评价状态可选值 */
export const REVIEW_STATUS_OPTIONS = [
  { label: '待审核', value: 'REVIEW_STATUS_PENDING' },
  { label: '已通过', value: 'REVIEW_STATUS_APPROVED' },
  { label: '已驳回', value: 'REVIEW_STATUS_REJECTED' },
]

/** 支付状态可选值 */
export const PAYMENT_STATUS_OPTIONS = [
  { label: '待支付', value: 'PAYMENT_STATUS_PENDING' },
  { label: '支付成功', value: 'PAYMENT_STATUS_SUCCESS' },
  { label: '支付失败', value: 'PAYMENT_STATUS_FAILED' },
  { label: '已关闭', value: 'PAYMENT_STATUS_CLOSED' },
]

/** 支付渠道可选值 */
export const PAYMENT_CHANNEL_OPTIONS = [
  { label: '微信支付', value: 'PAYMENT_CHANNEL_WECHAT' },
  { label: '支付宝', value: 'PAYMENT_CHANNEL_ALIPAY' },
  { label: '余额支付', value: 'PAYMENT_CHANNEL_BALANCE' },
]

/** 物流状态可选值 */
export const SHIPMENT_STATUS_OPTIONS = [
  { label: '待发货', value: 'SHIPMENT_STATUS_PENDING' },
  { label: '已发货', value: 'SHIPMENT_STATUS_SHIPPED' },
  { label: '已签收', value: 'SHIPMENT_STATUS_DELIVERED' },
  { label: '物流异常', value: 'SHIPMENT_STATUS_EXCEPTION' },
]

/** 优惠券类型可选值 */
export const COUPON_TYPE_OPTIONS = [
  { label: '满减券', value: 1 },
  { label: '折扣券', value: 2 },
  { label: '免运费券', value: 3 },
]

/** 退款状态可选值 */
export const REFUND_STATUS_OPTIONS = [
  { label: '待审核', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
  { label: '已退款', value: 3 },
]

/** 活动状态可选值 */
export const PROMOTION_STATUS_OPTIONS = [
  { label: '未开始', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 },
  { label: '已下线', value: 3 },
]

/** 活动类型可选值 */
export const PROMOTION_TYPE_OPTIONS = [
  { label: '满减', value: 1 },
  { label: '折扣', value: 2 },
  { label: '秒杀', value: 3 },
  { label: '拼团', value: 4 },
]

/** 轮播位置可选值 */
export const BANNER_POSITION_OPTIONS = [
  { label: '首页轮播', value: 'home_banner' },
  { label: '首页浮窗', value: 'home_float' },
  { label: '分类页', value: 'category' },
]

/** 用户状态可选值 */
export const USER_STATUS_OPTIONS = [
  { label: '正常', value: 1 },
  { label: '已禁用', value: 2 },
  { label: '已冻结', value: 3 },
]
