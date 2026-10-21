/**
 * 枚举字典
 * ---------------------------------------------------------------
 * 后端 JSON 中的枚举值为 proto 枚举名字符串（如 "ORDER_STATUS_PAID"）。
 * 部分查询接口（ListOrders / ListUserCoupons / CreatePayment）使用 int32 传参，
 * 这里同时提供名字 -> 数值的映射。
 */

/** 订单状态 */
const ORDER_STATUS = {
  ORDER_STATUS_UNSPECIFIED: { text: '未知', tone: 'muted', value: 0 },
  ORDER_STATUS_PENDING_PAYMENT: { text: '待付款', tone: 'warning', value: 1 },
  ORDER_STATUS_PAID: { text: '待发货', tone: 'brand', value: 2 },
  ORDER_STATUS_SHIPPED: { text: '待收货', tone: 'info', value: 3 },
  ORDER_STATUS_COMPLETED: { text: '已完成', tone: 'success', value: 4 },
  ORDER_STATUS_CANCELLED: { text: '已取消', tone: 'muted', value: 5 },
  ORDER_STATUS_REFUNDING: { text: '退款中', tone: 'danger', value: 6 },
  ORDER_STATUS_REFUNDED: { text: '已退款', tone: 'muted', value: 7 },
  ORDER_STATUS_CLOSED: { text: '已关闭', tone: 'muted', value: 8 },
};

/** 商品状态 */
const PRODUCT_STATUS = {
  PRODUCT_STATUS_UNSPECIFIED: '未知',
  PRODUCT_STATUS_DRAFT: '草稿',
  PRODUCT_STATUS_ON_SHELF: '在售',
  PRODUCT_STATUS_OFF_SHELF: '已下架',
};

/** 用户优惠券状态 */
const USER_COUPON_STATUS = {
  USER_COUPON_STATUS_UNSPECIFIED: '未知',
  USER_COUPON_STATUS_UNUSED: '未使用',
  USER_COUPON_STATUS_USED: '已使用',
  USER_COUPON_STATUS_EXPIRED: '已过期',
};

/** 支付状态 */
const PAYMENT_STATUS = {
  PAYMENT_STATUS_UNSPECIFIED: '未知',
  PAYMENT_STATUS_PENDING: '待支付',
  PAYMENT_STATUS_SUCCESS: '支付成功',
  PAYMENT_STATUS_FAILED: '支付失败',
  PAYMENT_STATUS_CLOSED: '已关闭',
};

/** 支付渠道 */
const PAYMENT_CHANNEL = {
  PAYMENT_CHANNEL_UNSPECIFIED: '未知',
  PAYMENT_CHANNEL_WECHAT: '微信支付',
  PAYMENT_CHANNEL_ALIPAY: '支付宝',
  PAYMENT_CHANNEL_BALANCE: '余额支付',
};

/** 优惠券类型 */
const COUPON_TYPE = {
  COUPON_TYPE_UNSPECIFIED: '未知',
  COUPON_TYPE_FIXED: '满减券',
  COUPON_TYPE_PERCENT: '折扣券',
  COUPON_TYPE_SHIPPING: '免运费券',
};

/** 物流状态 */
const SHIPMENT_STATUS = {
  SHIPMENT_STATUS_UNSPECIFIED: '未知',
  SHIPMENT_STATUS_PENDING: '待发货',
  SHIPMENT_STATUS_SHIPPED: '已发货',
  SHIPMENT_STATUS_DELIVERED: '已签收',
  SHIPMENT_STATUS_EXCEPTION: '物流异常',
};

/** 消息通知类型 */
const NOTIFICATION_TYPE = {
  NOTIFICATION_TYPE_UNSPECIFIED: { text: '系统消息', icon: '🔔' },
  NOTIFICATION_TYPE_ORDER: { text: '订单消息', icon: '📦' },
  NOTIFICATION_TYPE_LOGISTICS: { text: '物流消息', icon: '🚚' },
  NOTIFICATION_TYPE_PROMOTION: { text: '优惠活动', icon: '🎁' },
  NOTIFICATION_TYPE_SYSTEM: { text: '系统消息', icon: '🔔' },
};

/** 性别 */
const GENDER = {
  GENDER_UNSPECIFIED: '保密',
  GENDER_MALE: '男',
  GENDER_FEMALE: '女',
  GENDER_UNKNOWN: '保密',
};

/** 用户状态 */
const USER_STATUS = {
  USER_STATUS_UNSPECIFIED: '未知',
  USER_STATUS_ACTIVE: '正常',
  USER_STATUS_DISABLED: '已禁用',
  USER_STATUS_FROZEN: '已冻结',
};

/** 评价状态 */
const REVIEW_STATUS = {
  REVIEW_STATUS_UNSPECIFIED: '未知',
  REVIEW_STATUS_PENDING: '待审核',
  REVIEW_STATUS_APPROVED: '已通过',
  REVIEW_STATUS_REJECTED: '已驳回',
};

/** 订单列表状态页签 */
const ORDER_TABS = [
  { key: '', label: '全部' },
  { key: 'ORDER_STATUS_PENDING_PAYMENT', label: '待付款' },
  { key: 'ORDER_STATUS_PAID', label: '待发货' },
  { key: 'ORDER_STATUS_SHIPPED', label: '待收货' },
  { key: 'ORDER_STATUS_REFUNDING', label: '退款中' },
];

/** 优惠券页签（status 为 int32） */
const COUPON_TABS = [
  { key: 1, label: '未使用' },
  { key: 2, label: '已使用' },
  { key: 3, label: '已过期' },
];

/** 支付方式（CreatePaymentRequest.channel 为 int32） */
const PAY_CHANNELS = [
  { value: 1, key: 'PAYMENT_CHANNEL_WECHAT', label: '微信支付', desc: '推荐使用微信支付' },
  { value: 3, key: 'PAYMENT_CHANNEL_BALANCE', label: '余额支付', desc: '使用账户余额支付' },
];

/** 商品排序方式（ListProductsRequest.sort） */
const PRODUCT_SORTS = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'price_asc', label: '价格升' },
  { key: 'price_desc', label: '价格降' },
  { key: 'newest', label: '最新' },
];

/**
 * 取枚举中文文案。
 * @param {object} dict 枚举字典
 * @param {string} value 枚举值
 * @param {string} fallback 兜底文案
 * @returns {string}
 */
function textOf(dict, value, fallback) {
  if (!value) {
    return fallback || '';
  }
  const item = dict[value];
  if (item === undefined || item === null) {
    return fallback || value;
  }
  return typeof item === 'string' ? item : item.text;
}

/**
 * 取订单状态中文文案。
 * @param {string} status 订单状态枚举
 * @returns {string}
 */
function orderStatusText(status) {
  return textOf(ORDER_STATUS, status, '未知状态');
}

/**
 * 取订单状态色调（用于 WXSS 类名）。
 * @param {string} status 订单状态枚举
 * @returns {string} brand | warning | info | success | danger | muted
 */
function orderStatusTone(status) {
  const item = ORDER_STATUS[status];
  return item && item.tone ? item.tone : 'muted';
}

/**
 * 订单状态枚举名 -> 接口查询用的 int32。
 * @param {string} status 订单状态枚举
 * @returns {number}
 */
function orderStatusValue(status) {
  const item = ORDER_STATUS[status];
  return item ? item.value : 0;
}

/**
 * 取优惠券类型中文文案。
 * @param {string} type 优惠券类型枚举
 * @returns {string}
 */
function couponTypeText(type) {
  return textOf(COUPON_TYPE, type, '优惠券');
}

module.exports = {
  ORDER_STATUS,
  PRODUCT_STATUS,
  USER_COUPON_STATUS,
  PAYMENT_STATUS,
  PAYMENT_CHANNEL,
  COUPON_TYPE,
  SHIPMENT_STATUS,
  NOTIFICATION_TYPE,
  GENDER,
  USER_STATUS,
  REVIEW_STATUS,
  ORDER_TABS,
  COUPON_TABS,
  PAY_CHANNELS,
  PRODUCT_SORTS,
  textOf,
  orderStatusText,
  orderStatusTone,
  orderStatusValue,
  couponTypeText,
};
