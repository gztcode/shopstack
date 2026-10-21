/**
 * 扩展页面对应的实体类型 —— 对齐 proto/shopstack 下各服务的 v1 proto 定义
 *
 * 字段名与后端 JSON 完全一致（snake_case），保证 Mock 兜底数据与真实响应结构相同。
 */
import type { PageMeta } from './common'
import type { Order, OrderStatusLog } from './order'
import type { Product, ProductAttribute } from './product'

// ---------------------------------------------------------------------------
// 商品与内容
// ---------------------------------------------------------------------------

/** 频道 */
export interface Channel {
  id: number
  name: string
  code: string
  icon: string
  banner_url: string
  description: string
  sort: number
  type: number
  status: number
  product_count: number
  created_at: string
}

/** 频道列表响应 */
export interface ListChannelsResponse {
  channels: Channel[]
  meta: PageMeta
}

/** 保存频道请求 */
export interface SaveChannelRequest {
  id?: number
  name: string
  code: string
  icon: string
  banner_url: string
  description: string
  sort: number
  type: number
  status: number
}

/** 频道商品响应 */
export interface ListChannelProductsResponse {
  channel: Channel
  products: Product[]
  meta: PageMeta
}

/** 评价标签 */
export interface ReviewTag {
  id: number
  name: string
  sort: number
  enabled: boolean
}

/** 评价标签列表响应 */
export interface ListReviewTagsResponse {
  tags: ReviewTag[]
  meta: PageMeta
}

/** 保存评价标签请求 */
export interface SaveReviewTagRequest {
  id?: number
  name: string
  sort: number
  enabled: boolean
}

/** 服务保障项 */
export interface Guarantee {
  id: number
  name: string
  icon: string
  description: string
  sort: number
  enabled: boolean
}

/** 服务保障列表响应 */
export interface ListGuaranteesResponse {
  guarantees: Guarantee[]
  meta: PageMeta
}

/** 保存服务保障请求 */
export interface SaveGuaranteeRequest {
  id?: number
  name: string
  icon: string
  description: string
  sort: number
  enabled: boolean
}

/** 商品问答 */
export interface ProductQuestion {
  id: number
  product_id: number
  product_title: string
  user_id: number
  user_nickname: string
  content: string
  images: string[]
  reply: string
  reply_at: string
  created_at: string
}

/** 问答列表响应 */
export interface ListQuestionsResponse {
  questions: ProductQuestion[]
  meta: PageMeta
}

/** 回复问答请求 */
export interface AnswerQuestionRequest {
  id: number
  reply: string
}

/** 商品参数响应 */
export interface ListProductParamsResponse {
  params: ProductAttribute[]
}

// ---------------------------------------------------------------------------
// 交易与售后
// ---------------------------------------------------------------------------

/** 售后单 */
export interface AfterSale {
  id: number
  after_sale_no: string
  order_id: number
  order_no: string
  user_id: number
  user_nickname: string
  type: number
  amount_cents: number
  reason: string
  description: string
  item_ids: number[]
  status: number
  admin_remark: string
  refund_id: number
  created_at: string
  processed_at: string
}

/** 售后列表响应 */
export interface ListAfterSalesResponse {
  after_sales: AfterSale[]
  meta: PageMeta
}

/** 售后状态更新请求 */
export interface SetAfterSaleStatusRequest {
  id: number
  status: number
  admin_remark: string
}

/** 退款原因 */
export interface RefundReason {
  id: number
  name: string
  type: number
  sort: number
  enabled: boolean
}

/** 退款原因列表响应 */
export interface ListRefundReasonsResponse {
  reasons: RefundReason[]
}

/** 保存退款原因请求 */
export interface SaveRefundReasonRequest {
  id?: number
  name: string
  type: number
  sort: number
  enabled: boolean
}

/** 后台订单列表响应 */
export interface AdminListOrdersResponse {
  orders: Order[]
  meta: PageMeta
}

/** 订单渠道统计项 */
export interface OrderChannelStat {
  channel: number
  channel_name: string
  order_count: number
  amount_cents: number
}

/** 订单渠道统计响应 */
export interface AdminOrderStatsByChannelResponse {
  channel_stats: OrderChannelStat[]
}

/** 订单时段统计项 */
export interface OrderHourStat {
  hour: number
  order_count: number
  amount_cents: number
}

/** 订单时段统计响应 */
export interface AdminOrderStatsByHourResponse {
  hour_stats: OrderHourStat[]
}

/** 订单地区统计项 */
export interface OrderRegionStat {
  region: string
  order_count: number
  amount_cents: number
}

/** 订单地区统计响应 */
export interface AdminOrderStatsByRegionResponse {
  region_stats: OrderRegionStat[]
}

/** 后台订单日志响应 */
export interface ListAdminOrderLogsResponse {
  logs: OrderStatusLog[]
  meta: PageMeta
}

/** 支付渠道 */
export interface PayChannel {
  id: number
  name: string
  channel: number
  code: string
  icon: string
  enabled: boolean
  sort: number
  config: string
  created_at: string
}

/** 支付渠道列表响应 */
export interface ListPayChannelsResponse {
  channels: PayChannel[]
  meta: PageMeta
}

/** 保存支付渠道请求 */
export interface SavePayChannelRequest {
  id?: number
  name: string
  channel: number
  code: string
  icon: string
  enabled: boolean
  sort: number
  config: string
}

/** 充值订单 */
export interface RechargeOrder {
  id: number
  recharge_no: string
  user_id: number
  amount_cents: number
  bonus_cents: number
  status: number
  channel: number
  payment_no: string
  paid_at: string
  created_at: string
}

/** 充值订单列表响应 */
export interface ListRechargesResponse {
  recharges: RechargeOrder[]
  meta: PageMeta
}

/** 余额流水 */
export interface BalanceLog {
  id: number
  user_id: number
  change: number
  balance: number
  title: string
  biz_type: string
  created_at: string
}

/** 余额流水列表响应 */
export interface ListBalanceLogsResponse {
  logs: BalanceLog[]
  meta: PageMeta
  current_balance: number
}

// ---------------------------------------------------------------------------
// 库存与仓储
// ---------------------------------------------------------------------------

/** 仓库 */
export interface Warehouse {
  id: number
  code: string
  name: string
  address: string
  contact: string
  phone: string
  enabled: boolean
  sort: number
  created_at: string
}

/** 仓库列表响应 */
export interface ListWarehousesResponse {
  warehouses: Warehouse[]
  meta: PageMeta
}

/** 保存仓库请求 */
export interface SaveWarehouseRequest {
  id?: number
  code: string
  name: string
  address: string
  contact: string
  phone: string
  enabled: boolean
  sort: number
}

/** 出入库明细项 */
export interface StockMoveItem {
  sku_id: number
  sku_code: string
  spec_text: string
  quantity: number
}

/** 入库单 */
export interface InboundOrder {
  id: number
  inbound_no: string
  warehouse_id: number
  warehouse_name: string
  supplier: string
  status: number
  total_quantity: number
  remark: string
  operator: string
  items: StockMoveItem[]
  created_at: string
}

/** 入库单列表响应 */
export interface ListInboundOrdersResponse {
  inbound_orders: InboundOrder[]
  meta: PageMeta
}

/** 创建入库单请求 */
export interface CreateInboundOrderRequest {
  warehouse_id: number
  supplier: string
  remark: string
  items: StockMoveItem[]
}

/** 出库单 */
export interface OutboundOrder {
  id: number
  outbound_no: string
  warehouse_id: number
  warehouse_name: string
  order_id: number
  order_no: string
  status: number
  total_quantity: number
  remark: string
  operator: string
  items: StockMoveItem[]
  created_at: string
}

/** 出库单列表响应 */
export interface ListOutboundOrdersResponse {
  outbound_orders: OutboundOrder[]
  meta: PageMeta
}

/** 创建出库单请求 */
export interface CreateOutboundOrderRequest {
  warehouse_id: number
  order_id: number
  remark: string
  items: StockMoveItem[]
}

/** 盘点单 */
export interface StockCheck {
  id: number
  check_no: string
  warehouse_id: number
  warehouse_name: string
  status: number
  total_count: number
  diff_count: number
  remark: string
  operator: string
  created_at: string
}

/** 盘点单列表响应 */
export interface ListStockChecksResponse {
  stock_checks: StockCheck[]
  meta: PageMeta
}

/** 盘点明细项 */
export interface StockCheckItem {
  id: number
  stock_check_id: number
  sku_id: number
  sku_code: string
  spec_text: string
  book_quantity: number
  actual_quantity: number
  diff_quantity: number
}

/** 盘点单详情 */
export interface StockCheckDetail {
  stock_check: StockCheck
  items: StockCheckItem[]
}

/** 盘点明细列表响应 */
export interface ListStockCheckItemsResponse {
  items: StockCheckItem[]
  meta: PageMeta
}

// ---------------------------------------------------------------------------
// 用户与营销
// ---------------------------------------------------------------------------

/** 会员等级 */
export interface UserLevel {
  id: number
  name: string
  level: number
  min_growth: number
  max_growth: number
  discount_percent: number
  icon: string
  description: string
  benefits: string[]
  sort: number
}

/** 会员等级列表响应 */
export interface ListUserLevelsResponse {
  levels: UserLevel[]
}

/** 保存会员等级请求 */
export interface SaveUserLevelRequest {
  id?: number
  name: string
  level: number
  min_growth: number
  max_growth: number
  discount_percent: number
  icon: string
  description: string
  benefits: string[]
  sort: number
}

/** 成长值流水 */
export interface GrowthLog {
  id: number
  user_id: number
  change: number
  balance: number
  title: string
  biz_type: string
  created_at: string
}

/** 成长值流水列表响应 */
export interface ListGrowthLogsResponse {
  logs: GrowthLog[]
  meta: PageMeta
  current_growth: number
}

/** 用户反馈 */
export interface Feedback {
  id: number
  user_id: number
  user_nickname: string
  type: number
  content: string
  images: string[]
  contact: string
  status: number
  reply: string
  created_at: string
  processed_at: string
}

/** 用户反馈列表响应 */
export interface ListFeedbacksResponse {
  feedbacks: Feedback[]
  meta: PageMeta
}

/** 处理用户反馈请求 */
export interface SetFeedbackStatusRequest {
  id: number
  status: number
  reply: string
}

/** 拼团活动 */
export interface GroupBuy {
  id: number
  name: string
  description: string
  promotion_id: number
  product_id: number
  product_title: string
  product_image: string
  price_cents: number
  original_price_cents: number
  required_members: number
  joined_members: number
  group_size: number
  status: number
  start_time: number
  end_time: number
  banner_image: string
}

/** 拼团成员 */
export interface GroupBuyMember {
  id: number
  group_buy_id: number
  user_id: number
  user_nickname: string
  joined_at: string
}

/** 拼团详情响应 */
export interface GetGroupBuyResponse {
  group_buy: GroupBuy
  members: GroupBuyMember[]
}

/** 拼团列表响应 */
export interface ListGroupBuysResponse {
  group_buys: GroupBuy[]
  meta: PageMeta
}

/** 保存拼团活动请求 */
export interface SaveGroupBuyRequest {
  id?: number
  name: string
  description: string
  promotion_id: number
  product_id: number
  price_cents: number
  required_members: number
  start_time: number
  end_time: number
  banner_image: string
}

/** 营销任务 */
export interface MarketingTask {
  id: number
  name: string
  description: string
  type: number
  target_count: number
  reward_points: number
  reward_coupon_id: number
  sort: number
  enabled: boolean
  icon: string
}

/** 营销任务列表响应 */
export interface ListMarketingTasksResponse {
  tasks: MarketingTask[]
  meta: PageMeta
}

/** 保存营销任务请求 */
export interface SaveMarketingTaskRequest {
  id?: number
  name: string
  description: string
  type: number
  target_count: number
  reward_points: number
  reward_coupon_id: number
  sort: number
  enabled: boolean
  icon: string
}

/** 签到配置 */
export interface SignInConfig {
  enabled: boolean
  continuous_days_required: number
  points_awarded: number
  continuous_step: number
  max_points: number
  calendar_days: number
  description: string
  updated_at: string
}

/** 活动场次 */
export interface PromotionSession {
  id: number
  promotion_id: number
  name: string
  start_time: number
  end_time: number
  stock: number
  sold_count: number
  status: number
}

/** 活动场次列表响应 */
export interface ListPromotionSessionsResponse {
  sessions: PromotionSession[]
  meta: PageMeta
}

/** 保存活动场次请求 */
export interface SavePromotionSessionRequest {
  id?: number
  promotion_id: number
  name: string
  start_time: number
  end_time: number
  stock: number
}

// ---------------------------------------------------------------------------
// 物流与通知
// ---------------------------------------------------------------------------

/** 快递公司 */
export interface LogisticsCompany {
  id: number
  name: string
  code: string
  logo: string
  phone: string
  enabled: boolean
  sort: number
  supports_cod: boolean
}

/** 快递公司列表响应 */
export interface ListLogisticsCompaniesResponse {
  companies: LogisticsCompany[]
  meta: PageMeta
}

/** 保存快递公司请求 */
export interface SaveLogisticsCompanyRequest {
  id?: number
  name: string
  code: string
  logo: string
  phone: string
  enabled: boolean
  sort: number
  supports_cod: boolean
}

/** 配送范围 */
export interface DeliveryRange {
  id: number
  template_id: number
  template_name: string
  regions: string
  freight_cents: number
  free_freight_amount_cents: number
  enabled: boolean
}

/** 配送范围列表响应 */
export interface ListDeliveryRangesResponse {
  ranges: DeliveryRange[]
  meta: PageMeta
}

/** 保存配送范围请求 */
export interface SaveDeliveryRangeRequest {
  id?: number
  template_id: number
  regions: string
  freight_cents: number
  free_freight_amount_cents: number
  enabled: boolean
}

/** 运费试算请求 */
export interface CalculateFreightRequest {
  template_id: number
  amount_cents: number
  region: string
  quantity: number
}

/** 运费试算响应 */
export interface CalculateFreightResponse {
  freight_cents: number
  free_freight_amount_cents: number
  free: boolean
  template_name: string
  remark: string
}

/** 通知模板 */
export interface NotificationTemplate {
  id: number
  code: string
  name: string
  type: number
  title: string
  content: string
  link: string
  enabled: boolean
  updated_at: string
}

/** 通知模板列表响应 */
export interface ListNotificationTemplatesResponse {
  templates: NotificationTemplate[]
  meta: PageMeta
}

/** 保存通知模板请求 */
export interface SaveNotificationTemplateRequest {
  id?: number
  code: string
  name: string
  type: number
  title: string
  content: string
  link: string
  enabled: boolean
}

/** 短信模板 */
export interface SmsTemplate {
  id: number
  code: string
  name: string
  content: string
  enabled: boolean
  updated_at: string
}

/** 短信模板列表响应 */
export interface ListSmsTemplatesResponse {
  templates: SmsTemplate[]
  meta: PageMeta
}

/** 保存短信模板请求 */
export interface SaveSmsTemplateRequest {
  id?: number
  code: string
  name: string
  content: string
  enabled: boolean
}

/** 敏感词 */
export interface SensitiveWord {
  id: number
  word: string
  category: number
  status: number
  created_at: string
}

/** 敏感词列表响应 */
export interface ListSensitiveWordsResponse {
  words: SensitiveWord[]
  meta: PageMeta
}

/** 保存敏感词请求 */
export interface SaveSensitiveWordRequest {
  id?: number
  word: string
  category: number
  status: number
}

/** 通知分类 */
export interface NotificationCategory {
  type: number
  name: string
  icon: string
  count: number
  unread_count: number
}

/** 通知分类列表响应 */
export interface ListNotificationCategoriesResponse {
  categories: NotificationCategory[]
}
