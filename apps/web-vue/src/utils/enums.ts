/**
 * 枚举中文映射
 * proto 枚举在 JSON 中序列化为字符串（如 "ORDER_STATUS_PAID"），此处统一转成展示文案。
 */

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const ORDER_STATUS_TEXT: Record<string, string> = {
  ORDER_STATUS_UNSPECIFIED: '未知',
  ORDER_STATUS_PENDING_PAYMENT: '待付款',
  ORDER_STATUS_PAID: '待发货',
  ORDER_STATUS_SHIPPED: '待收货',
  ORDER_STATUS_COMPLETED: '已完成',
  ORDER_STATUS_CANCELLED: '已取消',
  ORDER_STATUS_REFUNDING: '退款中',
  ORDER_STATUS_REFUNDED: '已退款',
  ORDER_STATUS_CLOSED: '已关闭',
}

const ORDER_STATUS_TONE: Record<string, Tone> = {
  ORDER_STATUS_PENDING_PAYMENT: 'warning',
  ORDER_STATUS_PAID: 'accent',
  ORDER_STATUS_SHIPPED: 'accent',
  ORDER_STATUS_COMPLETED: 'success',
  ORDER_STATUS_CANCELLED: 'neutral',
  ORDER_STATUS_REFUNDING: 'warning',
  ORDER_STATUS_REFUNDED: 'neutral',
  ORDER_STATUS_CLOSED: 'neutral',
}

const PAYMENT_STATUS_TEXT: Record<string, string> = {
  PAYMENT_STATUS_UNSPECIFIED: '未知',
  PAYMENT_STATUS_PENDING: '待支付',
  PAYMENT_STATUS_SUCCESS: '支付成功',
  PAYMENT_STATUS_FAILED: '支付失败',
  PAYMENT_STATUS_CLOSED: '已关闭',
}

const PAYMENT_CHANNEL_TEXT: Record<string, string> = {
  PAYMENT_CHANNEL_UNSPECIFIED: '未知',
  PAYMENT_CHANNEL_WECHAT: '微信支付',
  PAYMENT_CHANNEL_ALIPAY: '支付宝',
  PAYMENT_CHANNEL_BALANCE: '余额支付',
}

const PRODUCT_STATUS_TEXT: Record<string, string> = {
  PRODUCT_STATUS_UNSPECIFIED: '未知',
  PRODUCT_STATUS_DRAFT: '草稿',
  PRODUCT_STATUS_ON_SHELF: '已上架',
  PRODUCT_STATUS_OFF_SHELF: '已下架',
}

const REVIEW_STATUS_TEXT: Record<string, string> = {
  REVIEW_STATUS_UNSPECIFIED: '未知',
  REVIEW_STATUS_PENDING: '待审核',
  REVIEW_STATUS_APPROVED: '已通过',
  REVIEW_STATUS_REJECTED: '已驳回',
}

const COUPON_TYPE_TEXT: Record<string, string> = {
  COUPON_TYPE_UNSPECIFIED: '未知',
  COUPON_TYPE_FIXED: '满减券',
  COUPON_TYPE_PERCENT: '折扣券',
  COUPON_TYPE_SHIPPING: '免运费券',
}

const USER_COUPON_STATUS_TEXT: Record<string, string> = {
  USER_COUPON_STATUS_UNSPECIFIED: '未知',
  USER_COUPON_STATUS_UNUSED: '未使用',
  USER_COUPON_STATUS_USED: '已使用',
  USER_COUPON_STATUS_EXPIRED: '已过期',
}

const USER_COUPON_STATUS_TONE: Record<string, Tone> = {
  USER_COUPON_STATUS_UNUSED: 'success',
  USER_COUPON_STATUS_USED: 'neutral',
  USER_COUPON_STATUS_EXPIRED: 'neutral',
}

const SHIPMENT_STATUS_TEXT: Record<string, string> = {
  SHIPMENT_STATUS_UNSPECIFIED: '未知',
  SHIPMENT_STATUS_PENDING: '待发货',
  SHIPMENT_STATUS_SHIPPED: '运输中',
  SHIPMENT_STATUS_DELIVERED: '已签收',
  SHIPMENT_STATUS_EXCEPTION: '物流异常',
}

const NOTIFICATION_TYPE_TEXT: Record<string, string> = {
  NOTIFICATION_TYPE_UNSPECIFIED: '系统消息',
  NOTIFICATION_TYPE_ORDER: '订单消息',
  NOTIFICATION_TYPE_LOGISTICS: '物流消息',
  NOTIFICATION_TYPE_PROMOTION: '优惠活动',
  NOTIFICATION_TYPE_SYSTEM: '系统通知',
}

const USER_STATUS_TEXT: Record<string, string> = {
  USER_STATUS_UNSPECIFIED: '未知',
  USER_STATUS_ACTIVE: '正常',
  USER_STATUS_DISABLED: '已禁用',
  USER_STATUS_FROZEN: '已冻结',
}

const GENDER_TEXT: Record<string, string> = {
  GENDER_UNSPECIFIED: '未设置',
  GENDER_MALE: '男',
  GENDER_FEMALE: '女',
  GENDER_UNKNOWN: '保密',
}

const REFUND_STATUS_TEXT: Record<string, string> = {
  '0': '待审核',
  '1': '已通过',
  '2': '已驳回',
  '3': '已退款',
}

function pick(map: Record<string, string>, value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  const key = String(value)
  return map[key] ?? key
}

/** 订单状态文案 */
export function orderStatusText(value?: string | number | null): string {
  return pick(ORDER_STATUS_TEXT, value)
}

/** 订单状态色板 */
export function orderStatusTone(value?: string | number | null): Tone {
  return ORDER_STATUS_TONE[String(value ?? '')] ?? 'default'
}

/** 支付状态文案 */
export function paymentStatusText(value?: string | number | null): string {
  return pick(PAYMENT_STATUS_TEXT, value)
}

/** 支付渠道文案 */
export function paymentChannelText(value?: string | number | null): string {
  return pick(PAYMENT_CHANNEL_TEXT, value)
}

/** 商品状态文案 */
export function productStatusText(value?: string | number | null): string {
  return pick(PRODUCT_STATUS_TEXT, value)
}

/** 评价状态文案 */
export function reviewStatusText(value?: string | number | null): string {
  return pick(REVIEW_STATUS_TEXT, value)
}

/** 优惠券类型文案 */
export function couponTypeText(value?: string | number | null): string {
  return pick(COUPON_TYPE_TEXT, value)
}

/** 用户券状态文案 */
export function userCouponStatusText(value?: string | number | null): string {
  return pick(USER_COUPON_STATUS_TEXT, value)
}

/** 用户券状态色板 */
export function userCouponStatusTone(value?: string | number | null): Tone {
  return USER_COUPON_STATUS_TONE[String(value ?? '')] ?? 'default'
}

/** 物流状态文案 */
export function shipmentStatusText(value?: string | number | null): string {
  return pick(SHIPMENT_STATUS_TEXT, value)
}

/** 通知类型文案 */
export function notificationTypeText(value?: string | number | null): string {
  return pick(NOTIFICATION_TYPE_TEXT, value)
}

/** 用户状态文案 */
export function userStatusText(value?: string | number | null): string {
  return pick(USER_STATUS_TEXT, value)
}

/** 性别文案 */
export function genderText(value?: string | number | null): string {
  return pick(GENDER_TEXT, value)
}

/** 退款单状态文案 */
export function refundStatusText(value?: string | number | null): string {
  return pick(REFUND_STATUS_TEXT, value)
}

/** 优惠券面额展示 */
export function couponValueText(
  type?: string | number | null,
  faceValueCents = 0,
  percent = 0,
): string {
  if (String(type ?? '').endsWith('PERCENT')) return `${percent / 10} 折`
  if (String(type ?? '').endsWith('SHIPPING')) return '免运费'
  return `¥${(Number(faceValueCents) / 100).toFixed(2)}`
}

/* ---------------------------------------------------------------------------
 * 积分 / 发票 / 促销
 * --------------------------------------------------------------------------- */
const POINTS_BIZ_TEXT: Record<string, string> = {
  sign: '签到奖励',
  register: '注册奖励',
  order: '下单奖励',
  review: '评价奖励',
  exchange: '积分兑换',
  admin: '人工调整',
  earn: '获得积分',
  consume: '消费积分',
  expire: '积分过期',
  refund: '积分退回',
}

/** 积分变动业务类型文案（后端实际取值以 sign / exchange / review 为主） */
export function pointsBizText(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '积分变动'
  const key = String(value)
  return POINTS_BIZ_TEXT[key] ?? key
}

const INVOICE_STATUS_TEXT: Record<string, string> = {
  '0': '待开票',
  '1': '已开票',
  '2': '已驳回',
}

const INVOICE_STATUS_TONE: Record<string, Tone> = {
  '0': 'warning',
  '1': 'success',
  '2': 'danger',
}

/** 发票状态文案 */
export function invoiceStatusText(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '未知'
  return INVOICE_STATUS_TEXT[String(value)] ?? String(value)
}

/** 发票状态色板 */
export function invoiceStatusTone(value?: string | number | null): Tone {
  return INVOICE_STATUS_TONE[String(value ?? '')] ?? 'default'
}

const PROMOTION_TYPE_TEXT: Record<string, string> = {
  '1': '满减',
  '2': '折扣',
  '3': '秒杀',
  '4': '拼团',
}

/** 促销活动类型文案 */
export function promotionTypeText(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '活动'
  return PROMOTION_TYPE_TEXT[String(value)] ?? String(value)
}

const PROMOTION_STATUS_TEXT: Record<string, string> = {
  '0': '未开始',
  '1': '进行中',
  '2': '已结束',
  '3': '已下线',
}

/** 促销活动状态文案 */
export function promotionStatusText(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '未知'
  return PROMOTION_STATUS_TEXT[String(value)] ?? String(value)
}
