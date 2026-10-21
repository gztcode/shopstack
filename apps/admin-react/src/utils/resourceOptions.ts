/**
 * 扩展页面共用的下拉选项
 *
 * 数值枚举与 proto 中的 int32 状态值一一对应；
 * 与 src/utils/enums.ts 的字符串枚举表互为补充。
 */

export interface SelectOption {
  label: string
  value: number | string
}

/** 频道类型 */
export const CHANNEL_TYPE_OPTIONS: SelectOption[] = [
  { label: '推荐', value: 1 },
  { label: '新品', value: 2 },
  { label: '热销', value: 3 },
  { label: '限时', value: 4 },
  { label: '预售', value: 5 },
  { label: '清仓', value: 6 },
  { label: '包邮', value: 7 },
  { label: '跨境', value: 8 },
  { label: '楼层', value: 9 },
]

/** 频道状态 */
export const CHANNEL_STATUS_OPTIONS: SelectOption[] = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

/** 售后类型 */
export const AFTER_SALE_TYPE_OPTIONS: SelectOption[] = [
  { label: '仅退款', value: 1 },
  { label: '退货退款', value: 2 },
  { label: '换货', value: 3 },
]

/** 售后状态 */
export const AFTER_SALE_STATUS_OPTIONS: SelectOption[] = [
  { label: '待审核', value: 0 },
  { label: '审核通过', value: 1 },
  { label: '审核驳回', value: 2 },
  { label: '已退款', value: 3 },
  { label: '已完成', value: 4 },
]

/** 退款原因类型 */
export const REFUND_REASON_TYPE_OPTIONS: SelectOption[] = [
  { label: '仅退款', value: 1 },
  { label: '退货退款', value: 2 },
  { label: '换货', value: 3 },
]

/** 后台订单状态（int32） */
export const ADMIN_ORDER_STATUS_OPTIONS: SelectOption[] = [
  { label: '待付款', value: 1 },
  { label: '待发货', value: 2 },
  { label: '待收货', value: 3 },
  { label: '已完成', value: 4 },
  { label: '已取消', value: 5 },
  { label: '退款中', value: 6 },
  { label: '已退款', value: 7 },
  { label: '已关闭', value: 8 },
]

/** 支付方式（int32） */
export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { label: '微信支付', value: 1 },
  { label: '支付宝', value: 2 },
  { label: '余额支付', value: 3 },
]

/** 支付渠道类型 */
export const PAY_CHANNEL_OPTIONS: SelectOption[] = [
  { label: '微信支付', value: 1 },
  { label: '支付宝', value: 2 },
  { label: '余额支付', value: 3 },
  { label: '其他渠道', value: 4 },
]

/** 充值单状态 */
export const RECHARGE_STATUS_OPTIONS: SelectOption[] = [
  { label: '待支付', value: 0 },
  { label: '已支付', value: 1 },
  { label: '已取消', value: 2 },
]

/** 入库单状态 */
export const INBOUND_STATUS_OPTIONS: SelectOption[] = [
  { label: '待入库', value: 0 },
  { label: '已入库', value: 1 },
  { label: '已取消', value: 2 },
]

/** 出库单状态 */
export const OUTBOUND_STATUS_OPTIONS: SelectOption[] = [
  { label: '待出库', value: 0 },
  { label: '已出库', value: 1 },
  { label: '已取消', value: 2 },
]

/** 盘点单状态 */
export const STOCK_CHECK_STATUS_OPTIONS: SelectOption[] = [
  { label: '盘点中', value: 0 },
  { label: '已完成', value: 1 },
  { label: '已取消', value: 2 },
]

/** 用户反馈类型 */
export const FEEDBACK_TYPE_OPTIONS: SelectOption[] = [
  { label: '功能建议', value: 1 },
  { label: '体验问题', value: 2 },
  { label: '商品问题', value: 3 },
  { label: '其他', value: 4 },
]

/** 用户反馈状态 */
export const FEEDBACK_STATUS_OPTIONS: SelectOption[] = [
  { label: '待处理', value: 0 },
  { label: '处理中', value: 1 },
  { label: '已处理', value: 2 },
  { label: '已关闭', value: 3 },
]

/** 拼团状态 */
export const GROUP_BUY_STATUS_OPTIONS: SelectOption[] = [
  { label: '未开始', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 },
  { label: '已下线', value: 3 },
]

/** 营销任务类型 */
export const MARKETING_TASK_TYPE_OPTIONS: SelectOption[] = [
  { label: '浏览', value: 1 },
  { label: '下单', value: 2 },
  { label: '分享', value: 3 },
  { label: '评价', value: 4 },
  { label: '签到', value: 5 },
  { label: '邀请', value: 6 },
]

/** 活动场次状态 */
export const PROMOTION_SESSION_STATUS_OPTIONS: SelectOption[] = [
  { label: '未开始', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已结束', value: 2 },
]

/** 通知模板类型 */
export const NOTIFICATION_TEMPLATE_TYPE_OPTIONS: SelectOption[] = [
  { label: '订单通知', value: 1 },
  { label: '物流通知', value: 2 },
  { label: '营销通知', value: 3 },
  { label: '系统通知', value: 4 },
]

/** 敏感词分类 */
export const SENSITIVE_WORD_CATEGORY_OPTIONS: SelectOption[] = [
  { label: '违规词', value: 1 },
  { label: '辱骂', value: 2 },
  { label: '广告', value: 3 },
  { label: '其他', value: 4 },
]

/** 敏感词状态 */
export const SENSITIVE_WORD_STATUS_OPTIONS: SelectOption[] = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

/** 发货单状态（int32，与 SHIPMENT_STATUS 对应） */
export const SHIPMENT_STATUS_OPTIONS: SelectOption[] = [
  { label: '待发货', value: 1 },
  { label: '已发货', value: 2 },
  { label: '已签收', value: 3 },
  { label: '物流异常', value: 4 },
]
