/**
 * ShopStack 用户端类型定义
 * 严格对齐 proto 中各服务 v1 目录下的消息与字段名（snake_case）。
 */

/* ---------------------------------------------------------------------------
 * 枚举（JSON 中为字符串）
 * --------------------------------------------------------------------------- */
export type Gender = 'GENDER_UNSPECIFIED' | 'GENDER_MALE' | 'GENDER_FEMALE' | 'GENDER_UNKNOWN'

export type UserStatus =
  | 'USER_STATUS_UNSPECIFIED'
  | 'USER_STATUS_ACTIVE'
  | 'USER_STATUS_DISABLED'
  | 'USER_STATUS_FROZEN'

export type ProductStatus =
  | 'PRODUCT_STATUS_UNSPECIFIED'
  | 'PRODUCT_STATUS_DRAFT'
  | 'PRODUCT_STATUS_ON_SHELF'
  | 'PRODUCT_STATUS_OFF_SHELF'

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

export type PaymentStatus =
  | 'PAYMENT_STATUS_UNSPECIFIED'
  | 'PAYMENT_STATUS_PENDING'
  | 'PAYMENT_STATUS_SUCCESS'
  | 'PAYMENT_STATUS_FAILED'
  | 'PAYMENT_STATUS_CLOSED'

export type PaymentChannel =
  | 'PAYMENT_CHANNEL_UNSPECIFIED'
  | 'PAYMENT_CHANNEL_WECHAT'
  | 'PAYMENT_CHANNEL_ALIPAY'
  | 'PAYMENT_CHANNEL_BALANCE'

export type ReviewStatus =
  | 'REVIEW_STATUS_UNSPECIFIED'
  | 'REVIEW_STATUS_PENDING'
  | 'REVIEW_STATUS_APPROVED'
  | 'REVIEW_STATUS_REJECTED'

export type CouponType =
  | 'COUPON_TYPE_UNSPECIFIED'
  | 'COUPON_TYPE_FIXED'
  | 'COUPON_TYPE_PERCENT'
  | 'COUPON_TYPE_SHIPPING'

export type UserCouponStatus =
  | 'USER_COUPON_STATUS_UNSPECIFIED'
  | 'USER_COUPON_STATUS_UNUSED'
  | 'USER_COUPON_STATUS_USED'
  | 'USER_COUPON_STATUS_EXPIRED'

export type ShipmentStatus =
  | 'SHIPMENT_STATUS_UNSPECIFIED'
  | 'SHIPMENT_STATUS_PENDING'
  | 'SHIPMENT_STATUS_SHIPPED'
  | 'SHIPMENT_STATUS_DELIVERED'
  | 'SHIPMENT_STATUS_EXCEPTION'

export type NotificationType =
  | 'NOTIFICATION_TYPE_UNSPECIFIED'
  | 'NOTIFICATION_TYPE_ORDER'
  | 'NOTIFICATION_TYPE_LOGISTICS'
  | 'NOTIFICATION_TYPE_PROMOTION'
  | 'NOTIFICATION_TYPE_SYSTEM'

/* ---------------------------------------------------------------------------
 * 通用结构
 * --------------------------------------------------------------------------- */
export interface PageRequest {
  page?: number
  page_size?: number
  order_by?: string
  order_dir?: string
}

export interface PageMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface Money {
  amount_cents: number
  currency: string
}

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

export interface ImageItem {
  url: string
  alt: string
  sort: number
}

export interface OperationResult {
  success: boolean
  message: string
}

/* ---------------------------------------------------------------------------
 * 商品域
 * --------------------------------------------------------------------------- */
export interface Category {
  id: number
  name: string
  parent_id: number
  icon: string
  description: string
  sort: number
  visible: boolean
  product_count: number
  children?: Category[]
}

export interface Product {
  id: number
  title: string
  subtitle: string
  cover: string
  category_id: number
  category_name: string
  min_price_cents: number
  max_price_cents: number
  sales_count: number
  stock_total: number
  status: ProductStatus
  description: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ProductSku {
  id: number
  product_id: number
  sku_code: string
  spec_text: string
  specs: Record<string, string>
  price_cents: number
  original_price_cents: number
  stock: number
  locked_stock: number
  image: string
  sort: number
  sales_count: number
  enabled: boolean
  weight_grams: number
}

export interface ProductAttribute {
  id: number
  product_id: number
  name: string
  value: string
  sort: number
}

export interface ReviewSummary {
  total: number
  good: number
  medium: number
  bad: number
  average: number
}

export interface ProductDetail {
  product: Product
  skus: ProductSku[]
  images: ImageItem[]
  attributes: ProductAttribute[]
  reviews: ReviewSummary[]
  review_count: number
  review_rating: number
  related: Product[]
}

export interface Banner {
  id: number
  title: string
  image: string
  link: string
  sort: number
  position: string
  visible: boolean
  created_at: string
}

export interface Review {
  id: number
  product_id: number
  product_title: string
  user_id: number
  user_nickname: string
  user_avatar: string
  rating: number
  content: string
  images: string[]
  sku_id: number
  sku_text: string
  status: ReviewStatus
  admin_reply: string
  like_count: number
  created_at: string
}

/* ---------------------------------------------------------------------------
 * 购物车
 * --------------------------------------------------------------------------- */
export interface CartItem {
  id: number
  user_id: number
  product_id: number
  sku_id: number
  product_title: string
  spec_text: string
  image: string
  price_cents: number
  quantity: number
  stock: number
  selected: boolean
  available: boolean
  subtotal_cents: number
  created_at: string
  updated_at: string
}

export interface Cart {
  user_id: number
  items: CartItem[]
  total_count: number
  selected_count: number
  selected_amount_cents: number
  selected_discount_cents: number
  selected_payable_cents: number
}

/* ---------------------------------------------------------------------------
 * 用户域
 * --------------------------------------------------------------------------- */
export interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  phone: string
  email: string
  gender: Gender
  birthday: string
  points: number
  balance_cents: number
  status: UserStatus
  wechat_openid: string
  created_at: string
  last_login_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: User
  permissions: string[]
}

export interface FavoriteProduct {
  id: number
  product_id: number
  title: string
  cover: string
  price_cents: number
  created_at: string
}

/* ---------------------------------------------------------------------------
 * 订单域
 * --------------------------------------------------------------------------- */
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
  status: number
  admin_remark: string
  created_at: string
  processed_at: string
}

export interface OrderCount {
  pending_payment: number
  pending_shipment: number
  pending_receipt: number
  refunding: number
}

export interface CreateOrderItem {
  product_id: number
  sku_id: number
  quantity: number
}

export interface CreateOrderRequest {
  user_id?: number
  items: CreateOrderItem[]
  from_cart: boolean
  cart_item_ids: number[]
  address_id: number
  coupon_id: number
  remark: string
  payment_method: string
  points_used: number
}

/* ---------------------------------------------------------------------------
 * 支付域
 * --------------------------------------------------------------------------- */
export interface Payment {
  id: number
  payment_no: string
  order_id: number
  order_no: string
  user_id: number
  amount_cents: number
  refunded_cents: number
  status: PaymentStatus
  channel: PaymentChannel
  transaction_id: string
  prepay_id: string
  pay_params: Record<string, string>
  fail_reason: string
  paid_at: string
  created_at: string
  updated_at: string
}

/* ---------------------------------------------------------------------------
 * 营销域
 * --------------------------------------------------------------------------- */
export interface Coupon {
  id: number
  name: string
  code: string
  type: CouponType
  face_value_cents: number
  percent: number
  min_amount_cents: number
  max_discount_cents: number
  total_quantity: number
  received_quantity: number
  used_quantity: number
  per_user_limit: number
  start_time: number
  end_time: number
  category_id: number
  enabled: boolean
  created_at: string
}

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

export interface Promotion {
  id: number
  name: string
  description: string
  type: number
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

export interface StockItem {
  sku_id: number
  product_id: number
  quantity: number
  price_cents: number
}

export interface PreviewCheckoutResponse {
  total_amount_cents: number
  discount_cents: number
  coupon_discount_cents: number
  points_discount_cents: number
  freight_cents: number
  payable_cents: number
  available_coupons: UserCoupon[]
  active_promotions: Promotion[]
}

/* ---------------------------------------------------------------------------
 * 物流域
 * --------------------------------------------------------------------------- */
export interface Shipment {
  id: number
  order_id: number
  order_no: string
  tracking_no: string
  company: string
  company_code: string
  status: ShipmentStatus
  receiver: string
  phone: string
  address: string
  freight_cents: number
  item_count: number
  shipped_at: string
  delivered_at: string
  created_at: string
  remark: string
}

export interface ShipmentTrack {
  id: number
  shipment_id: number
  tracking_no: string
  location: string
  description: string
  occurred_at: string
  sort: number
}

export interface ListShipmentTracksResponse {
  tracks: ShipmentTrack[]
  shipment: Shipment
}

/* ---------------------------------------------------------------------------
 * 通知域
 * --------------------------------------------------------------------------- */
export interface Notification {
  id: number
  user_id: number
  type: NotificationType
  title: string
  content: string
  link: string
  biz_id: number
  read: boolean
  created_at: string
  read_at: string
}

/* ---------------------------------------------------------------------------
 * 列表响应
 * --------------------------------------------------------------------------- */
export interface ListProductsResponse {
  products: Product[]
  meta: PageMeta
}

export interface ListCategoriesResponse {
  categories: Category[]
}

export interface ListBannersResponse {
  banners: Banner[]
}

export interface ListReviewsResponse {
  reviews: Review[]
  meta: PageMeta
  summary: ReviewSummary
}

export interface ListAddressesResponse {
  addresses: Address[]
}

export interface ListFavoritesResponse {
  products: FavoriteProduct[]
  meta: PageMeta
}

export interface ListOrdersResponse {
  orders: Order[]
  meta: PageMeta
  pending_payment_count: number
  pending_shipment_count: number
  pending_receipt_count: number
  refunding_count: number
}

export interface ListUserCouponsResponse {
  coupons: UserCoupon[]
  meta: PageMeta
  available_count: number
}

export interface ListNotificationsResponse {
  notifications: Notification[]
  meta: PageMeta
  unread_count: number
}

/* ---------------------------------------------------------------------------
 * 积分明细 / 发票
 * --------------------------------------------------------------------------- */
export interface PointsLog {
  id: number
  user_id: number
  title: string
  change: number
  balance: number
  biz_type: string
  biz_id: string
  created_at: string
}

export interface ListPointsLogsResponse {
  logs: PointsLog[]
  meta: PageMeta
  current_points: number
}

export interface Invoice {
  id: number
  user_id: number
  order_no: string
  title: string
  tax_no: string
  type: string
  email: string
  amount_cents: number
  /** 0 待开票 1 已开票 2 已驳回 */
  status: number
  invoice_url: string
  remark: string
  created_at: string
}

export interface ListInvoicesResponse {
  invoices: Invoice[]
  meta: PageMeta
}

/* ---------------------------------------------------------------------------
 * 本地数据：浏览足迹 / 商品对比
 * --------------------------------------------------------------------------- */
export interface HistoryItem {
  product_id: number
  title: string
  cover: string
  price_cents: number
  viewed_at: string
}

export interface CompareItem {
  product_id: number
  sku_id: number
  title: string
  cover: string
  price_cents: number
  original_price_cents: number
  spec_text: string
  specs: Record<string, string>
  stock: number
  sales_count: number
  added_at: string
}

/* ---------------------------------------------------------------------------
 * 频道（商品域）
 * --------------------------------------------------------------------------- */
export interface Channel {
  id: number
  name: string
  code: string
  icon: string
  banner_url: string
  description: string
  sort: number
  /** 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 生鲜 */
  type: number
  /** 0 停用 1 启用 */
  status: number
  product_count: number
  created_at: string
}

export interface ListChannelsResponse {
  channels: Channel[]
  meta: PageMeta
}

export interface ListChannelProductsResponse {
  channel: Channel
  products: Product[]
  meta: PageMeta
}

/* ---------------------------------------------------------------------------
 * 商品问答 / 评价标签（商品域）
 * --------------------------------------------------------------------------- */
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

export interface ListProductQuestionsResponse {
  questions: ProductQuestion[]
  meta: PageMeta
}

export interface ListProductParamsResponse {
  params: ProductAttribute[]
}

export interface ReviewTag {
  id: number
  name: string
  sort: number
  enabled: boolean
}

export interface ListReviewTagsResponse {
  tags: ReviewTag[]
  meta: PageMeta
}

/* ---------------------------------------------------------------------------
 * 签到 / 任务（营销域）
 * --------------------------------------------------------------------------- */
export interface SignInCalendarDay {
  date: string
  signed: boolean
  points: number
}

export interface SignInStatus {
  signed_today: boolean
  continuous_days: number
  total_days: number
  points_awarded: number
  next_points: number
  calendar: SignInCalendarDay[]
}

export interface UserTask {
  task_id: number
  name: string
  description: string
  /** 1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请 */
  type: number
  progress: number
  target_count: number
  completed: boolean
  claimed: boolean
  reward_points: number
  reward_coupon_id: number
  icon: string
}

export interface ListTasksResponse {
  tasks: UserTask[]
  meta: PageMeta
}

/* ---------------------------------------------------------------------------
 * 活动场次 / 拼团（营销域）
 * --------------------------------------------------------------------------- */
export interface PromotionSession {
  id: number
  promotion_id: number
  name: string
  /** unix 秒 */
  start_time: number
  end_time: number
  stock: number
  sold_count: number
  /** 0 未开始 1 进行中 2 已结束 */
  status: number
}

export interface ListPromotionSessionsResponse {
  sessions: PromotionSession[]
  meta: PageMeta
}

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
  /** 0 未开始 1 进行中 2 已结束 3 已下线 */
  status: number
  start_time: number
  end_time: number
  banner_image: string
}

export interface GroupBuyMember {
  id: number
  group_buy_id: number
  user_id: number
  user_nickname: string
  joined_at: string
}

export interface ListGroupBuysResponse {
  group_buys: GroupBuy[]
  meta: PageMeta
}

export interface GetGroupBuyResponse {
  group_buy: GroupBuy
  members: GroupBuyMember[]
}

/* ---------------------------------------------------------------------------
 * 会员等级 / 成长值（用户域）
 * --------------------------------------------------------------------------- */
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

export interface UserLevelInfo {
  level: number
  level_name: string
  growth: number
  current_min_growth: number
  next_min_growth: number
  growth_to_next: number
  discount_percent: number
  next_level_name: string
  levels: UserLevel[]
}

export interface GrowthLog {
  id: number
  user_id: number
  change: number
  balance: number
  title: string
  biz_type: string
  created_at: string
}

export interface ListGrowthLogsResponse {
  logs: GrowthLog[]
  meta: PageMeta
  current_growth: number
}

/* ---------------------------------------------------------------------------
 * 行政区域（用户域）
 * --------------------------------------------------------------------------- */
export interface Region {
  id: number
  parent_id: number
  name: string
  code: string
  /** 1 省 2 市 3 区 */
  level: number
  sort: number
}

export interface ListRegionsResponse {
  regions: Region[]
}

/* ---------------------------------------------------------------------------
 * 发票抬头模板（用户域）
 * --------------------------------------------------------------------------- */
export interface InvoiceTemplate {
  id: number
  user_id: number
  title: string
  tax_no: string
  /** personal | company */
  type: string
  email: string
  phone: string
  address: string
  bank_name: string
  bank_account: string
  is_default: boolean
  created_at: string
}

export interface ListInvoiceTemplatesResponse {
  templates: InvoiceTemplate[]
}

/* ---------------------------------------------------------------------------
 * 通知设置 / 账号安全（用户域）
 * --------------------------------------------------------------------------- */
export interface UserNotificationSettings {
  user_id: number
  order_notice: boolean
  logistics_notice: boolean
  marketing_notice: boolean
  system_notice: boolean
  sms_notice: boolean
  email_notice: boolean
  wechat_notice: boolean
}

export interface AccountSecurityInfo {
  phone_bound: boolean
  email_bound: boolean
  wechat_bound: boolean
  realname_verified: boolean
  /** 0 安全 1 中 2 高 */
  risk_level: number
  password_changed_at: string
  warnings: string[]
}

/* ---------------------------------------------------------------------------
 * 意见反馈 / 帮助文章（用户域）
 * --------------------------------------------------------------------------- */
export interface Feedback {
  id: number
  user_id: number
  user_nickname: string
  /** 1 功能建议 2 体验问题 3 投诉 4 其他 */
  type: number
  content: string
  images: string[]
  contact: string
  /** 0 待处理 1 处理中 2 已处理 3 已关闭 */
  status: number
  reply: string
  created_at: string
  processed_at: string
}

export interface HelpArticle {
  id: number
  category_id: number
  category_name: string
  title: string
  content: string
  sort: number
  enabled: boolean
  view_count: number
  created_at: string
}

export interface ListHelpArticlesResponse {
  articles: HelpArticle[]
  meta: PageMeta
}

/* ---------------------------------------------------------------------------
 * 售后工单 / 退款原因（订单域）
 * --------------------------------------------------------------------------- */
export interface AfterSale {
  id: number
  after_sale_no: string
  order_id: number
  order_no: string
  user_id: number
  user_nickname: string
  /** 1 仅退款 2 退货退款 3 换货 */
  type: number
  amount_cents: number
  reason: string
  description: string
  item_ids: number[]
  /** 0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成 */
  status: number
  admin_remark: string
  refund_id: number
  created_at: string
  processed_at: string
}

export interface ListAfterSalesResponse {
  after_sales: AfterSale[]
  meta: PageMeta
}

export interface RefundReason {
  id: number
  name: string
  /** 1 仅退款 2 退货退款 3 换货 */
  type: number
  sort: number
  enabled: boolean
}

export interface ListRefundReasonsResponse {
  reasons: RefundReason[]
}

/* ---------------------------------------------------------------------------
 * 充值（支付域）
 * --------------------------------------------------------------------------- */
export interface RechargeConfig {
  min_amount_cents: number
  max_amount_cents: number
  preset_amounts: number[]
  register_bonus_cents: number
  first_recharge_bonus_desc: string
}

export interface RechargeOrder {
  id: number
  recharge_no: string
  user_id: number
  amount_cents: number
  bonus_cents: number
  /** 0 待支付 1 已支付 2 已取消 */
  status: number
  channel: number
  payment_no: string
  paid_at: string
  created_at: string
}

/* ---------------------------------------------------------------------------
 * 运费试算（物流域）
 * --------------------------------------------------------------------------- */
export interface FreightQuote {
  freight_cents: number
  free_freight_amount_cents: number
  free: boolean
  template_name: string
  remark: string
}

/* ---------------------------------------------------------------------------
 * 通知分类（通知域）
 * --------------------------------------------------------------------------- */
export interface NotificationCategory {
  type: number
  name: string
  icon: string
  count: number
  unread_count: number
}

export interface ListNotificationCategoriesResponse {
  categories: NotificationCategory[]
}
