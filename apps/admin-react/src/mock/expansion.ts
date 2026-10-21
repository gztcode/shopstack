/**
 * 扩展页面的 Mock 兜底数据 —— 结构与真实接口 JSON 完全一致（snake_case）
 *
 * 后端对应接口未就绪或返回非 0 时，src/api/* 会回退到这里的实现。
 */
import type {
  AfterSale,
  BalanceLog,
  Channel,
  DeliveryRange,
  Feedback,
  GrowthLog,
  GroupBuy,
  GroupBuyMember,
  Guarantee,
  ListAdminOrderLogsResponse,
  ListAfterSalesResponse,
  ListBalanceLogsResponse,
  ListChannelsResponse,
  ListDeliveryRangesResponse,
  ListFeedbacksResponse,
  ListGrowthLogsResponse,
  ListGroupBuysResponse,
  ListGuaranteesResponse,
  ListInboundOrdersResponse,
  ListLogisticsCompaniesResponse,
  ListMarketingTasksResponse,
  ListNotificationCategoriesResponse,
  ListNotificationTemplatesResponse,
  ListOutboundOrdersResponse,
  ListPayChannelsResponse,
  ListProductParamsResponse,
  ListPromotionSessionsResponse,
  ListQuestionsResponse,
  ListRechargesResponse,
  ListRefundReasonsResponse,
  ListReviewTagsResponse,
  ListSensitiveWordsResponse,
  ListSmsTemplatesResponse,
  ListStockCheckItemsResponse,
  ListStockChecksResponse,
  ListUserLevelsResponse,
  ListWarehousesResponse,
  LogisticsCompany,
  MarketingTask,
  NotificationCategory,
  NotificationTemplate,
  OrderChannelStat,
  OrderHourStat,
  OrderRegionStat,
  PayChannel,
  ProductQuestion,
  RefundReason,
  RechargeOrder,
  ReviewTag,
  SaveChannelRequest,
  SaveGuaranteeRequest,
  SaveGroupBuyRequest,
  SaveLogisticsCompanyRequest,
  SaveMarketingTaskRequest,
  SaveNotificationTemplateRequest,
  SavePayChannelRequest,
  SaveRefundReasonRequest,
  SaveReviewTagRequest,
  SaveSensitiveWordRequest,
  SaveSmsTemplateRequest,
  SaveUserLevelRequest,
  SaveWarehouseRequest,
  SensitiveWord,
  SignInConfig,
  SmsTemplate,
  StockCheck,
  StockCheckItem,
  StockMoveItem,
  UserLevel,
  Warehouse,
} from '@/types'
import type { PageMeta } from '@/types/common'
import { mockOrderLogs, mockOrders, mockProducts, mockUsers } from './data'

/** 统一分页处理（与 src/mock/index.ts 保持一致） */
function paginate<T>(items: T[], page = 1, pageSize = 20): { items: T[]; meta: PageMeta } {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / safeSize))
  const start = (safePage - 1) * safeSize
  return {
    items: items.slice(start, start + safeSize),
    meta: { page: safePage, page_size: safeSize, total, total_pages: totalPages },
  }
}

/** 相对当前时间偏移若干天，返回 RFC3339 字符串 */
function daysAgo(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/** 当前时间偏移若干天，返回 unix 秒 */
function unixDaysAgo(days: number, hour = 10): number {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

// ---------------------------------------------------------------------------
// 商品与内容
// ---------------------------------------------------------------------------

/** 演示频道 */
export const mockChannels: Channel[] = [
  { id: 1, name: '推荐', code: 'recommend', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=RC', banner_url: '', description: '首页默认推荐位', sort: 1, type: 1, status: 1, product_count: 12, created_at: daysAgo(120) },
  { id: 2, name: '新品', code: 'newest', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=NEW', banner_url: '', description: '最近上架商品', sort: 2, type: 2, status: 1, product_count: 8, created_at: daysAgo(110) },
  { id: 3, name: '热销', code: 'hot', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=HOT', banner_url: '', description: '近七日销量榜', sort: 3, type: 3, status: 1, product_count: 10, created_at: daysAgo(100) },
  { id: 4, name: '限时', code: 'flash', icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=FL', banner_url: '', description: '限时折扣商品', sort: 4, type: 4, status: 1, product_count: 6, created_at: daysAgo(90) },
  { id: 5, name: '预售', code: 'presale', icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=PRE', banner_url: '', description: '预售新商品', sort: 5, type: 5, status: 1, product_count: 3, created_at: daysAgo(80) },
  { id: 6, name: '清仓', code: 'clearance', icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=CL', banner_url: '', description: '清仓特卖专区', sort: 6, type: 6, status: 0, product_count: 2, created_at: daysAgo(70) },
  { id: 7, name: '包邮', code: 'freeship', icon: 'https://placehold.co/64x64/2E9E6B/FFFFFF?text=FS', banner_url: '', description: '全场包邮商品', sort: 7, type: 7, status: 1, product_count: 14, created_at: daysAgo(60) },
  { id: 8, name: '跨境', code: 'cross', icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=CB', banner_url: '', description: '跨境进口商品', sort: 8, type: 8, status: 1, product_count: 4, created_at: daysAgo(50) },
]

/** 演示评价标签 */
export const mockReviewTags: ReviewTag[] = [
  { id: 1, name: '质量好', sort: 1, enabled: true },
  { id: 2, name: '物流快', sort: 2, enabled: true },
  { id: 3, name: '性价比高', sort: 3, enabled: true },
  { id: 4, name: '包装精美', sort: 4, enabled: true },
  { id: 5, name: '客服耐心', sort: 5, enabled: false },
  { id: 6, name: '与描述不符', sort: 6, enabled: true },
]

/** 演示服务保障 */
export const mockGuarantees: Guarantee[] = [
  { id: 1, name: '正品保障', icon: 'https://placehold.co/64x64/2E9E6B/FFFFFF?text=OK', description: '官方正品，假一赔十', sort: 1, enabled: true },
  { id: 2, name: '七天无理由', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=7D', description: '签收后 7 天内可无理由退换', sort: 2, enabled: true },
  { id: 3, name: '闪电发货', icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=FAST', description: '现货 48 小时内发出', sort: 3, enabled: true },
  { id: 4, name: '运费险', icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=INS', description: '投保后退货可获运费补贴', sort: 4, enabled: true },
]

/** 演示商品问答 */
export const mockQuestions: ProductQuestion[] = [
  { id: 1, product_id: 1, product_title: '轻量跑鞋 男款缓震透气', user_id: 11, user_nickname: '林**', content: '这款跑鞋尺码偏大还是偏小？', images: [], reply: '标准码，建议按平时尺码选择。', reply_at: daysAgo(3), created_at: daysAgo(4) },
  { id: 2, product_id: 1, product_title: '轻量跑鞋 男款缓震透气', user_id: 12, user_nickname: '陈**', content: '支持七天无理由退换吗？', images: [], reply: '', reply_at: '', created_at: daysAgo(2) },
  { id: 3, product_id: 2, product_title: '真无线蓝牙耳机 降噪长续航', user_id: 13, user_nickname: '周**', content: '耳机防水等级是多少？', images: ['https://placehold.co/600x600/9AA5B1/FFFFFF?text=IMG'], reply: '生活防水，汗水与雨水无碍。', reply_at: daysAgo(1), created_at: daysAgo(6) },
  { id: 4, product_id: 3, product_title: '304 不锈钢保温杯 500ml', user_id: 14, user_nickname: '吴**', content: '保温时间能到多久？', images: [], reply: '', reply_at: '', created_at: daysAgo(1) },
  { id: 5, product_id: 4, product_title: '轻薄笔记本电脑 14 英寸', user_id: 15, user_nickname: '郑**', content: '机器预装系统吗？可以升级内存吗？', images: [], reply: '预装正版系统，内存为板载不可更换。', reply_at: daysAgo(5), created_at: daysAgo(8) },
  { id: 6, product_id: 5, product_title: '纯棉短袖 T 恤 春夏薄款', user_id: 16, user_nickname: '王**', content: '衣服会缩水吗？', images: [], reply: '纯棉面料正常洗涤缩水率在 3% 以内。', reply_at: daysAgo(2), created_at: daysAgo(9) },
]

// ---------------------------------------------------------------------------
// 交易与售后
// ---------------------------------------------------------------------------

/** 演示售后单 */
export const mockAfterSales: AfterSale[] = [
  { id: 1, after_sale_no: 'AS20241018001', order_id: 101, order_no: 'NO2024101800001', user_id: 11, user_nickname: '林**', type: 1, amount_cents: 19900, reason: '七天无理由', description: '尺码不合适，申请仅退款', item_ids: [1], status: 0, admin_remark: '', refund_id: 0, created_at: daysAgo(2), processed_at: '' },
  { id: 2, after_sale_no: 'AS20241017002', order_id: 102, order_no: 'NO2024101700002', user_id: 12, user_nickname: '陈**', type: 2, amount_cents: 39900, reason: '商品破损', description: '外箱运输途中挤压变形', item_ids: [2], status: 1, admin_remark: '同意退货退款', refund_id: 0, created_at: daysAgo(3), processed_at: daysAgo(2) },
  { id: 3, after_sale_no: 'AS20241016003', order_id: 103, order_no: 'NO2024101600003', user_id: 13, user_nickname: '周**', type: 3, amount_cents: 8900, reason: '换货', description: '颜色换成黑色', item_ids: [3], status: 2, admin_remark: '超出换货期限', refund_id: 0, created_at: daysAgo(4), processed_at: daysAgo(3) },
  { id: 4, after_sale_no: 'AS20241015004', order_id: 104, order_no: 'NO2024101500004', user_id: 14, user_nickname: '吴**', type: 1, amount_cents: 12900, reason: '不想要了', description: '拍错型号', item_ids: [4], status: 3, admin_remark: '已原路退回', refund_id: 501, created_at: daysAgo(6), processed_at: daysAgo(5) },
  { id: 5, after_sale_no: 'AS20241014005', order_id: 105, order_no: 'NO2024101400005', user_id: 15, user_nickname: '郑**', type: 2, amount_cents: 25900, reason: '少发漏发', description: '少发一件配件', item_ids: [5], status: 4, admin_remark: '已补发并退款', refund_id: 502, created_at: daysAgo(8), processed_at: daysAgo(6) },
  { id: 6, after_sale_no: 'AS20241013006', order_id: 106, order_no: 'NO2024101300006', user_id: 16, user_nickname: '王**', type: 1, amount_cents: 5900, reason: '质量问题', description: '按键失灵', item_ids: [6], status: 0, admin_remark: '', refund_id: 0, created_at: daysAgo(1), processed_at: '' },
]

/** 演示退款原因 */
export const mockRefundReasons: RefundReason[] = [
  { id: 1, name: '七天无理由退换', type: 2, sort: 1, enabled: true },
  { id: 2, name: '商品质量问题', type: 2, sort: 2, enabled: true },
  { id: 3, name: '少发漏发', type: 2, sort: 3, enabled: true },
  { id: 4, name: '拍错型号/规格', type: 1, sort: 4, enabled: true },
  { id: 5, name: '不想要了', type: 1, sort: 5, enabled: true },
  { id: 6, name: '换货', type: 3, sort: 6, enabled: true },
  { id: 7, name: '发货太慢', type: 1, sort: 7, enabled: false },
]

/** 演示支付渠道 */
export const mockPayChannels: PayChannel[] = [
  { id: 1, name: '微信支付', channel: 1, code: 'wechat', icon: 'https://placehold.co/64x64/2E9E6B/FFFFFF?text=WX', enabled: true, sort: 1, config: '{"mch_id":"1900000001","notify_url":"https://pay.example.com/notify"}', created_at: daysAgo(200) },
  { id: 2, name: '支付宝', channel: 2, code: 'alipay', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=ALI', enabled: true, sort: 2, config: '{"app_id":"2021000000000000"}', created_at: daysAgo(200) },
  { id: 3, name: '余额支付', channel: 3, code: 'balance', icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=BAL', enabled: true, sort: 3, config: '{}', created_at: daysAgo(190) },
  { id: 4, name: '银联云闪付', channel: 4, code: 'unionpay', icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=UP', enabled: false, sort: 4, config: '{}', created_at: daysAgo(180) },
]

/** 演示充值订单 */
export const mockRecharges: RechargeOrder[] = [
  { id: 1, recharge_no: 'RC20241018001', user_id: 11, amount_cents: 10000, bonus_cents: 500, status: 1, channel: 1, payment_no: 'WX202410180001', paid_at: daysAgo(2), created_at: daysAgo(2) },
  { id: 2, recharge_no: 'RC20241017002', user_id: 12, amount_cents: 50000, bonus_cents: 5000, status: 1, channel: 2, payment_no: 'ALI202410170002', paid_at: daysAgo(3), created_at: daysAgo(3) },
  { id: 3, recharge_no: 'RC20241016003', user_id: 13, amount_cents: 20000, bonus_cents: 1000, status: 0, channel: 1, payment_no: '', paid_at: '', created_at: daysAgo(1) },
  { id: 4, recharge_no: 'RC20241015004', user_id: 14, amount_cents: 100000, bonus_cents: 15000, status: 2, channel: 3, payment_no: '', paid_at: '', created_at: daysAgo(5) },
  { id: 5, recharge_no: 'RC20241014005', user_id: 15, amount_cents: 30000, bonus_cents: 2000, status: 1, channel: 1, payment_no: 'WX202410140005', paid_at: daysAgo(6), created_at: daysAgo(6) },
  { id: 6, recharge_no: 'RC20241013006', user_id: 16, amount_cents: 10000, bonus_cents: 500, status: 1, channel: 2, payment_no: 'ALI202410130006', paid_at: daysAgo(7), created_at: daysAgo(7) },
]

/** 演示余额流水 */
export const mockBalanceLogs: BalanceLog[] = [
  { id: 1, user_id: 11, change: 10000, balance: 128000, title: '账户充值', biz_type: 'recharge', created_at: daysAgo(2) },
  { id: 2, user_id: 11, change: -19900, balance: 118000, title: '订单支付 NO2024101800001', biz_type: 'order', created_at: daysAgo(3) },
  { id: 3, user_id: 12, change: 50000, balance: 86000, title: '账户充值', biz_type: 'recharge', created_at: daysAgo(3) },
  { id: 4, user_id: 12, change: 2500, balance: 88500, title: '退款返还', biz_type: 'refund', created_at: daysAgo(4) },
  { id: 5, user_id: 13, change: -5900, balance: 34100, title: '订单支付 NO2024101600003', biz_type: 'order', created_at: daysAgo(5) },
  { id: 6, user_id: 14, change: -12900, balance: 72100, title: '订单支付 NO2024101500004', biz_type: 'order', created_at: daysAgo(6) },
]

// ---------------------------------------------------------------------------
// 库存与仓储
// ---------------------------------------------------------------------------

/** 演示仓库 */
export const mockWarehouses: Warehouse[] = [
  { id: 1, code: 'WH_BJ', name: '北京主仓', address: '北京市大兴区物流园 1 号库', contact: '张仓管', phone: '010-88880001', enabled: true, sort: 1, created_at: daysAgo(300) },
  { id: 2, code: 'WH_SH', name: '上海分仓', address: '上海市青浦区仓储路 8 号', contact: '李仓管', phone: '021-88880002', enabled: true, sort: 2, created_at: daysAgo(260) },
  { id: 3, code: 'WH_GZ', name: '广州前置仓', address: '广州市白云区物流三路 22 号', contact: '王仓管', phone: '020-88880003', enabled: true, sort: 3, created_at: daysAgo(200) },
  { id: 4, code: 'WH_CD', name: '成都中转仓', address: '成都市双流区国际物流园 5 栋', phone: '028-88880004', contact: '赵仓管', enabled: false, sort: 4, created_at: daysAgo(150) },
]

/** 演示出入库明细 */
const mockStockItems: StockMoveItem[] = [
  { sku_id: 101, sku_code: 'SKU-P1-SILVER', spec_text: '银色 / 12+256GB', quantity: 20 },
  { sku_id: 102, sku_code: 'SKU-P1-BLACK', spec_text: '黑色 / 16+512GB', quantity: 12 },
  { sku_id: 103, sku_code: 'SKU-P2-WHITE', spec_text: '白色 / 标准版', quantity: 30 },
]

/** 演示入库单 */
export const mockInboundOrders = [
  { id: 1, inbound_no: 'IN20241018001', warehouse_id: 1, warehouse_name: '北京主仓', supplier: '深圳智造供应链', status: 1, total_quantity: 32, remark: '常规补货', operator: '张仓管', items: mockStockItems, created_at: daysAgo(2) },
  { id: 2, inbound_no: 'IN20241017002', warehouse_id: 2, warehouse_name: '上海分仓', supplier: '苏州电子厂', status: 1, total_quantity: 20, remark: '新品首批入库', operator: '李仓管', items: mockStockItems, created_at: daysAgo(4) },
  { id: 3, inbound_no: 'IN20241016003', warehouse_id: 1, warehouse_name: '北京主仓', supplier: '广州服饰厂', status: 0, total_quantity: 12, remark: '待质检', operator: '张仓管', items: mockStockItems, created_at: daysAgo(1) },
  { id: 4, inbound_no: 'IN20241015004', warehouse_id: 3, warehouse_name: '广州前置仓', supplier: '东莞五金厂', status: 2, total_quantity: 0, remark: '供应商取消', operator: '王仓管', items: [], created_at: daysAgo(6) },
]

/** 演示出库单 */
export const mockOutboundOrders = [
  { id: 1, outbound_no: 'OUT20241018001', warehouse_id: 1, warehouse_name: '北京主仓', order_id: 101, order_no: 'NO2024101800001', status: 1, total_quantity: 2, remark: '常规出库', operator: '张仓管', items: mockStockItems, created_at: daysAgo(1) },
  { id: 2, outbound_no: 'OUT20241017002', warehouse_id: 2, warehouse_name: '上海分仓', order_id: 102, order_no: 'NO2024101700002', status: 0, total_quantity: 1, remark: '待拣货', operator: '李仓管', items: mockStockItems, created_at: daysAgo(1) },
  { id: 3, outbound_no: 'OUT20241016003', warehouse_id: 3, warehouse_name: '广州前置仓', order_id: 103, order_no: 'NO2024101600003', status: 1, total_quantity: 3, remark: '加急出库', operator: '王仓管', items: mockStockItems, created_at: daysAgo(3) },
  { id: 4, outbound_no: 'OUT20241015004', warehouse_id: 1, warehouse_name: '北京主仓', order_id: 104, order_no: 'NO2024101500004', status: 2, total_quantity: 0, remark: '用户取消', operator: '张仓管', items: [], created_at: daysAgo(5) },
]

/** 演示盘点单 */
export const mockStockChecks: StockCheck[] = [
  { id: 1, check_no: 'SC20241018001', warehouse_id: 1, warehouse_name: '北京主仓', status: 0, total_count: 128, diff_count: 3, remark: '月度全盘', operator: '张仓管', created_at: daysAgo(1) },
  { id: 2, check_no: 'SC20241010002', warehouse_id: 2, warehouse_name: '上海分仓', status: 1, total_count: 96, diff_count: 0, remark: '季度抽盘', operator: '李仓管', created_at: daysAgo(10) },
  { id: 3, check_no: 'SC20240928003', warehouse_id: 3, warehouse_name: '广州前置仓', status: 1, total_count: 54, diff_count: 2, remark: '专项盘点', operator: '王仓管', created_at: daysAgo(20) },
  { id: 4, check_no: 'SC20240920004', warehouse_id: 4, warehouse_name: '成都中转仓', status: 2, total_count: 0, diff_count: 0, remark: '仓库停用取消', operator: '赵仓管', created_at: daysAgo(30) },
]

/** 演示盘点明细 */
export const mockStockCheckItems: StockCheckItem[] = [
  { id: 1, stock_check_id: 1, sku_id: 101, sku_code: 'SKU-P1-SILVER', spec_text: '银色 / 12+256GB', book_quantity: 120, actual_quantity: 118, diff_quantity: -2 },
  { id: 2, stock_check_id: 1, sku_id: 102, sku_code: 'SKU-P1-BLACK', spec_text: '黑色 / 16+512GB', book_quantity: 86, actual_quantity: 86, diff_quantity: 0 },
  { id: 3, stock_check_id: 1, sku_id: 103, sku_code: 'SKU-P2-WHITE', spec_text: '白色 / 标准版', book_quantity: 54, actual_quantity: 55, diff_quantity: 1 },
  { id: 4, stock_check_id: 2, sku_id: 101, sku_code: 'SKU-P1-SILVER', spec_text: '银色 / 12+256GB', book_quantity: 200, actual_quantity: 200, diff_quantity: 0 },
  { id: 5, stock_check_id: 2, sku_id: 103, sku_code: 'SKU-P2-WHITE', spec_text: '白色 / 标准版', book_quantity: 60, actual_quantity: 60, diff_quantity: 0 },
]

// ---------------------------------------------------------------------------
// 用户与营销
// ---------------------------------------------------------------------------

/** 演示会员等级 */
export const mockUserLevels: UserLevel[] = [
  { id: 1, name: '普通会员', level: 1, min_growth: 0, max_growth: 999, discount_percent: 100, icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=L1', description: '注册即可享有', benefits: ['生日券', '基础积分'], sort: 1 },
  { id: 2, name: '银卡会员', level: 2, min_growth: 1000, max_growth: 4999, discount_percent: 98, icon: 'https://placehold.co/64x64/9AA5B1/FFFFFF?text=L2', description: '成长值满 1000 升级', benefits: ['9.8 折', '专属客服', '每月券'], sort: 2 },
  { id: 3, name: '金卡会员', level: 3, min_growth: 5000, max_growth: 19999, discount_percent: 95, icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=L3', description: '成长值满 5000 升级', benefits: ['9.5 折', '优先发货', '双倍积分'], sort: 3 },
  { id: 4, name: '钻石会员', level: 4, min_growth: 20000, max_growth: 999999, discount_percent: 90, icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=L4', description: '成长值满 20000 升级', benefits: ['9 折', '专属客服', '免费包邮', '生日礼盒'], sort: 4 },
]

/** 演示成长值流水 */
export const mockGrowthLogs: GrowthLog[] = [
  { id: 1, user_id: 11, change: 100, balance: 2680, title: '完成订单获得成长值', biz_type: 'order', created_at: daysAgo(1) },
  { id: 2, user_id: 11, change: 50, balance: 2580, title: '发布评价获得成长值', biz_type: 'review', created_at: daysAgo(2) },
  { id: 3, user_id: 12, change: 200, balance: 12400, title: '完成订单获得成长值', biz_type: 'order', created_at: daysAgo(3) },
  { id: 4, user_id: 13, change: 20, balance: 860, title: '每日签到获得成长值', biz_type: 'sign_in', created_at: daysAgo(4) },
  { id: 5, user_id: 14, change: -500, balance: 4200, title: '等级重算扣减', biz_type: 'level_adjust', created_at: daysAgo(5) },
  { id: 6, user_id: 15, change: 80, balance: 9300, title: '邀请好友注册获得成长值', biz_type: 'invite', created_at: daysAgo(6) },
]

/** 演示用户反馈 */
export const mockFeedbacks: Feedback[] = [
  { id: 1, user_id: 11, user_nickname: '林**', type: 1, content: '商品页面加载很慢，图片经常加载不出来。', images: ['https://placehold.co/600x600/9AA5B1/FFFFFF?text=IMG'], contact: 'lin@example.com', status: 0, reply: '', created_at: daysAgo(1), processed_at: '' },
  { id: 2, user_id: 12, user_nickname: '陈**', type: 2, content: '希望增加发票抬头模板批量导入功能。', images: [], contact: '13800000001', status: 1, reply: '已记录到需求池，预计下个版本支持。', created_at: daysAgo(2), processed_at: '' },
  { id: 3, user_id: 13, user_nickname: '周**', type: 1, content: '客服响应速度可以再快一些。', images: [], contact: 'zhou@example.com', status: 2, reply: '已优化客服排班，感谢反馈。', created_at: daysAgo(4), processed_at: daysAgo(3) },
  { id: 4, user_id: 14, user_nickname: '吴**', type: 3, content: '优惠券使用说明不清楚，不知道怎么叠加。', images: [], contact: 'wu@example.com', status: 3, reply: '已关闭，规则已在券详情页补充说明。', created_at: daysAgo(6), processed_at: daysAgo(5) },
  { id: 5, user_id: 15, user_nickname: '郑**', type: 1, content: '搜索结果排序不符合预期。', images: [], contact: 'zheng@example.com', status: 0, reply: '', created_at: daysAgo(1), processed_at: '' },
  { id: 6, user_id: 16, user_nickname: '王**', type: 2, content: '建议增加批量编辑商品功能。', images: [], contact: 'wang@example.com', status: 1, reply: '正在评估实现成本。', created_at: daysAgo(3), processed_at: '' },
]

/** 演示拼团活动 */
export const mockGroupBuys: GroupBuy[] = [
  { id: 1, name: '双人成团 · 轻量跑鞋', description: '两人成团立减 100 元', promotion_id: 1, product_id: 1, product_title: '轻量跑鞋 男款缓震透气', product_image: 'https://placehold.co/600x600/2A4AD9/FFFFFF?text=GB', price_cents: 19900, original_price_cents: 29900, required_members: 2, joined_members: 1, group_size: 12, status: 1, start_time: unixDaysAgo(3), end_time: unixDaysAgo(-3), banner_image: '' },
  { id: 2, name: '三人成团 · 蓝牙耳机', description: '三人成团送收纳包', promotion_id: 2, product_id: 2, product_title: '真无线蓝牙耳机 降噪长续航', product_image: 'https://placehold.co/600x600/E4572E/FFFFFF?text=GB', price_cents: 39900, original_price_cents: 59900, required_members: 3, joined_members: 2, group_size: 8, status: 1, start_time: unixDaysAgo(1), end_time: unixDaysAgo(-5), banner_image: '' },
  { id: 3, name: '五人群 · 保温杯', description: '家庭装 5 件拼团', promotion_id: 3, product_id: 3, product_title: '304 不锈钢保温杯 500ml', product_image: 'https://placehold.co/600x600/2E9E6B/FFFFFF?text=GB', price_cents: 8900, original_price_cents: 12900, required_members: 5, joined_members: 5, group_size: 20, status: 2, start_time: unixDaysAgo(10), end_time: unixDaysAgo(2), banner_image: '' },
  { id: 4, name: '新品首发团 · 笔记本', description: '首发价拼团，限量 30 团', promotion_id: 4, product_id: 4, product_title: '轻薄笔记本电脑 14 英寸', product_image: 'https://placehold.co/600x600/6B7A8F/FFFFFF?text=GB', price_cents: 599900, original_price_cents: 699900, required_members: 2, joined_members: 0, group_size: 30, status: 0, start_time: unixDaysAgo(-2), end_time: unixDaysAgo(-9), banner_image: '' },
  { id: 5, name: '清仓团 · 短袖 T 恤', description: '清仓价拼团，售完即止', promotion_id: 5, product_id: 5, product_title: '纯棉短袖 T 恤 春夏薄款', product_image: 'https://placehold.co/600x600/E4572E/FFFFFF?text=GB', price_cents: 3900, original_price_cents: 7900, required_members: 2, joined_members: 1, group_size: 10, status: 3, start_time: unixDaysAgo(20), end_time: unixDaysAgo(12), banner_image: '' },
]

/** 演示拼团成员 */
export const mockGroupBuyMembers: GroupBuyMember[] = [
  { id: 1, group_buy_id: 1, user_id: 11, user_nickname: '林**', joined_at: daysAgo(2) },
  { id: 2, group_buy_id: 1, user_id: 12, user_nickname: '陈**', joined_at: daysAgo(1) },
  { id: 3, group_buy_id: 2, user_id: 13, user_nickname: '周**', joined_at: daysAgo(1) },
  { id: 4, group_buy_id: 2, user_id: 14, user_nickname: '吴**', joined_at: daysAgo(1) },
  { id: 5, group_buy_id: 3, user_id: 15, user_nickname: '郑**', joined_at: daysAgo(8) },
  { id: 6, group_buy_id: 3, user_id: 16, user_nickname: '王**', joined_at: daysAgo(7) },
  { id: 7, group_buy_id: 3, user_id: 11, user_nickname: '林**', joined_at: daysAgo(6) },
]

/** 演示营销任务 */
export const mockMarketingTasks: MarketingTask[] = [
  { id: 1, name: '每日签到', description: '每日签到领积分，连续签到奖励翻倍', type: 5, target_count: 1, reward_points: 10, reward_coupon_id: 0, sort: 1, enabled: true, icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=01' },
  { id: 2, name: '浏览商品', description: '每日浏览 5 件商品', type: 1, target_count: 5, reward_points: 20, reward_coupon_id: 0, sort: 2, enabled: true, icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=02' },
  { id: 3, name: '完成下单', description: '每日完成 1 笔订单', type: 2, target_count: 1, reward_points: 50, reward_coupon_id: 12, sort: 3, enabled: true, icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=03' },
  { id: 4, name: '分享商品', description: '每日分享 2 件商品给好友', type: 3, target_count: 2, reward_points: 15, reward_coupon_id: 0, sort: 4, enabled: true, icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=04' },
  { id: 5, name: '发表评价', description: '发布 1 条带图评价', type: 4, target_count: 1, reward_points: 30, reward_coupon_id: 13, sort: 5, enabled: false, icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=05' },
  { id: 6, name: '邀请好友', description: '邀请 1 位新用户注册', type: 6, target_count: 1, reward_points: 200, reward_coupon_id: 14, sort: 6, enabled: true, icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=06' },
]

/** 演示签到配置 */
export const mockSignInConfig: SignInConfig = {
  enabled: true,
  continuous_days_required: 7,
  points_awarded: 10,
  continuous_step: 1,
  max_points: 20,
  calendar_days: 31,
  description: '连续签到 7 天额外奖励 50 积分，断签后重新计数。',
  updated_at: daysAgo(3),
}

/** 演示活动场次 */
export const mockPromotionSessions = [
  { id: 1, promotion_id: 1, name: '10:00 场', start_time: unixDaysAgo(1, 10), end_time: unixDaysAgo(1, 12), stock: 200, sold_count: 156, status: 2 },
  { id: 2, promotion_id: 1, name: '14:00 场', start_time: unixDaysAgo(1, 14), end_time: unixDaysAgo(1, 16), stock: 200, sold_count: 84, status: 2 },
  { id: 3, promotion_id: 2, name: '今日场', start_time: unixDaysAgo(0, 0), end_time: unixDaysAgo(-1, 0), stock: 500, sold_count: 312, status: 1 },
  { id: 4, promotion_id: 3, name: '周末场', start_time: unixDaysAgo(-2, 0), end_time: unixDaysAgo(-4, 0), stock: 300, sold_count: 0, status: 0 },
]

// ---------------------------------------------------------------------------
// 物流与通知
// ---------------------------------------------------------------------------

/** 演示快递公司 */
export const mockLogisticsCompanies: LogisticsCompany[] = [
  { id: 1, name: '顺丰速运', code: 'sf', logo: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=SF', phone: '95338', enabled: true, sort: 1, supports_cod: true },
  { id: 2, name: '中通快递', code: 'zt', logo: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=ZT', phone: '95311', enabled: true, sort: 2, supports_cod: false },
  { id: 3, name: '圆通速递', code: 'yt', logo: 'https://placehold.co/64x64/2E9E6B/FFFFFF?text=YT', phone: '95554', enabled: true, sort: 3, supports_cod: false },
  { id: 4, name: '韵达快递', code: 'yd', logo: 'https://placehold.co/64x64/E4572E/FFFFFF?text=YD', phone: '95546', enabled: true, sort: 4, supports_cod: false },
  { id: 5, name: '京东物流', code: 'jd', logo: 'https://placehold.co/64x64/E4572E/FFFFFF?text=JD', phone: '950616', enabled: true, sort: 5, supports_cod: true },
  { id: 6, name: '邮政EMS', code: 'ems', logo: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=EMS', phone: '11183', enabled: false, sort: 6, supports_cod: false },
]

/** 演示配送范围 */
export const mockDeliveryRanges: DeliveryRange[] = [
  { id: 1, template_id: 1, template_name: '默认运费模板', regions: '北京市 北京市 朝阳区', freight_cents: 800, free_freight_amount_cents: 99000, enabled: true },
  { id: 2, template_id: 1, template_name: '默认运费模板', regions: '上海市 上海市 浦东新区', freight_cents: 1000, free_freight_amount_cents: 99000, enabled: true },
  { id: 3, template_id: 1, template_name: '默认运费模板', regions: '广东省 广州市 天河区', freight_cents: 900, free_freight_amount_cents: 99000, enabled: true },
  { id: 4, template_id: 2, template_name: '大件专线', regions: '四川省 成都市 双流区', freight_cents: 2500, free_freight_amount_cents: 299000, enabled: true },
  { id: 5, template_id: 2, template_name: '大件专线', regions: '新疆维吾尔自治区 乌鲁木齐市 天山区', freight_cents: 6800, free_freight_amount_cents: 299000, enabled: false },
]

/** 演示通知模板 */
export const mockNotificationTemplates: NotificationTemplate[] = [
  { id: 1, code: 'order_paid', name: '订单支付成功', type: 1, title: '订单 {{order_no}} 支付成功', content: '您已支付 ¥{{amount}}，我们将尽快为您安排发货。', link: '/orders/{{order_no}}', enabled: true, updated_at: daysAgo(5) },
  { id: 2, code: 'order_shipped', name: '订单已发货', type: 2, title: '订单 {{order_no}} 已发货', content: '快递公司 {{company}}，运单号 {{tracking_no}}。', link: '/logistics/track', enabled: true, updated_at: daysAgo(4) },
  { id: 3, code: 'refund_result', name: '退款结果通知', type: 1, title: '退款申请已处理', content: '退款金额 ¥{{amount}}，预计 1-3 个工作日到账。', link: '/refunds', enabled: true, updated_at: daysAgo(3) },
  { id: 4, code: 'promotion_start', name: '活动开始提醒', type: 3, title: '{{promotion_name}} 即将开始', content: '活动开始时间 {{start_time}}，请提前关注。', link: '/promotions', enabled: true, updated_at: daysAgo(2) },
  { id: 5, code: 'coupon_expire', name: '优惠券即将过期', type: 3, title: '你有 {{count}} 张优惠券即将过期', content: '有效期至 {{expire_at}}，快去使用吧。', link: '/coupons', enabled: false, updated_at: daysAgo(10) },
  { id: 6, code: 'system_notice', name: '系统公告', type: 4, title: '{{title}}', content: '{{content}}', link: '/dashboard', enabled: true, updated_at: daysAgo(1) },
]

/** 演示短信模板 */
export const mockSmsTemplates: SmsTemplate[] = [
  { id: 1, code: 'register', name: '注册验证码', content: '您的验证码是 {{code}}，5 分钟内有效。', enabled: true, updated_at: daysAgo(30) },
  { id: 2, code: 'login', name: '登录验证码', content: '登录验证码 {{code}}，请勿泄露给他人。', enabled: true, updated_at: daysAgo(30) },
  { id: 3, code: 'order_paid', name: '订单支付成功', content: '订单 {{order_no}} 支付成功，金额 {{amount}}。', enabled: true, updated_at: daysAgo(20) },
  { id: 4, code: 'order_shipped', name: '订单发货通知', content: '您的订单 {{order_no}} 已发货，运单号 {{tracking_no}}。', enabled: true, updated_at: daysAgo(20) },
  { id: 5, code: 'refund_done', name: '退款到账通知', content: '退款 ¥{{amount}} 已原路退回，请注意查收。', enabled: true, updated_at: daysAgo(15) },
  { id: 6, code: 'sign_in', name: '签到提醒', content: '今天是第 {{days}} 天签到，连续签到可得 {{points}} 积分。', enabled: false, updated_at: daysAgo(12) },
]

/** 演示敏感词 */
export const mockSensitiveWords: SensitiveWord[] = [
  { id: 1, word: '最佳', category: 3, status: 1, created_at: daysAgo(60) },
  { id: 2, word: '第一', category: 3, status: 1, created_at: daysAgo(60) },
  { id: 3, word: '国家级', category: 1, status: 1, created_at: daysAgo(55) },
  { id: 4, word: '假货', category: 1, status: 1, created_at: daysAgo(55) },
  { id: 5, word: '骗子', category: 2, status: 1, created_at: daysAgo(40) },
  { id: 6, word: '白痴', category: 2, status: 0, created_at: daysAgo(35) },
  { id: 7, word: '点击链接领红包', category: 4, status: 1, created_at: daysAgo(25) },
  { id: 8, word: '加微信', category: 3, status: 0, created_at: daysAgo(18) },
]

/** 演示通知分类 */
export const mockNotificationCategories: NotificationCategory[] = [
  { type: 1, name: '订单通知', icon: 'https://placehold.co/64x64/2A4AD9/FFFFFF?text=ORD', count: 128, unread_count: 12 },
  { type: 2, name: '物流通知', icon: 'https://placehold.co/64x64/E4572E/FFFFFF?text=LOG', count: 96, unread_count: 5 },
  { type: 3, name: '营销通知', icon: 'https://placehold.co/64x64/2E9E6B/FFFFFF?text=MKT', count: 214, unread_count: 31 },
  { type: 4, name: '系统通知', icon: 'https://placehold.co/64x64/6B7A8F/FFFFFF?text=SYS', count: 42, unread_count: 2 },
]

// ---------------------------------------------------------------------------
// Mock 查询函数
// ---------------------------------------------------------------------------

/** 频道列表 */
export function mockListChannels(params: { keyword?: string; type?: number; page?: number; page_size?: number } = {}): ListChannelsResponse {
  let list = [...mockChannels]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((c) => c.name.toLowerCase().includes(key) || c.code.toLowerCase().includes(key))
  }
  if (params.type) list = list.filter((c) => c.type === params.type)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { channels: items, meta }
}

/** 保存频道 */
export function mockSaveChannel(payload: SaveChannelRequest): Channel {
  const existed = mockChannels.find((c) => c.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const channel: Channel = {
    id: Math.max(...mockChannels.map((c) => c.id)) + 1,
    name: payload.name,
    code: payload.code,
    icon: payload.icon ?? '',
    banner_url: payload.banner_url ?? '',
    description: payload.description ?? '',
    sort: payload.sort ?? 0,
    type: payload.type ?? 1,
    status: payload.status ?? 1,
    product_count: 0,
    created_at: new Date().toISOString(),
  }
  mockChannels.push(channel)
  return channel
}

/** 删除频道 */
export function mockDeleteChannel(id: number): { success: boolean; message: string } {
  const index = mockChannels.findIndex((c) => c.id === id)
  if (index < 0) return { success: false, message: '频道不存在' }
  mockChannels.splice(index, 1)
  return { success: true, message: '频道已删除' }
}

/** 频道商品 */
export function mockListChannelProducts(params: { channel_id?: number; keyword?: string; sort?: string; page?: number; page_size?: number } = {}): { channel: Channel; products: typeof mockProducts; meta: PageMeta } {
  const channel = mockChannels.find((c) => c.id === params.channel_id) ?? mockChannels[0]
  let list = [...mockProducts]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((p) => p.title.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { channel, products: items, meta }
}

/** 评价标签列表 */
export function mockListReviewTags(params: { keyword?: string; page?: number; page_size?: number } = {}): ListReviewTagsResponse {
  let list = [...mockReviewTags]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { tags: items, meta }
}

/** 保存评价标签 */
export function mockSaveReviewTag(payload: SaveReviewTagRequest): ReviewTag {
  const existed = mockReviewTags.find((t) => t.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const tag: ReviewTag = {
    id: Math.max(...mockReviewTags.map((t) => t.id)) + 1,
    name: payload.name,
    sort: payload.sort ?? 0,
    enabled: payload.enabled ?? true,
  }
  mockReviewTags.push(tag)
  return tag
}

/** 删除评价标签 */
export function mockDeleteReviewTag(id: number): { success: boolean; message: string } {
  const index = mockReviewTags.findIndex((t) => t.id === id)
  if (index < 0) return { success: false, message: '评价标签不存在' }
  mockReviewTags.splice(index, 1)
  return { success: true, message: '评价标签已删除' }
}

/** 服务保障列表 */
export function mockListGuarantees(params: { page?: number; page_size?: number } = {}): ListGuaranteesResponse {
  const { items, meta } = paginate([...mockGuarantees], params.page, params.page_size)
  return { guarantees: items, meta }
}

/** 保存服务保障 */
export function mockSaveGuarantee(payload: SaveGuaranteeRequest): Guarantee {
  const existed = mockGuarantees.find((g) => g.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const guarantee: Guarantee = {
    id: Math.max(...mockGuarantees.map((g) => g.id)) + 1,
    name: payload.name,
    icon: payload.icon ?? '',
    description: payload.description ?? '',
    sort: payload.sort ?? 0,
    enabled: payload.enabled ?? true,
  }
  mockGuarantees.push(guarantee)
  return guarantee
}

/** 删除服务保障 */
export function mockDeleteGuarantee(id: number): { success: boolean; message: string } {
  const index = mockGuarantees.findIndex((g) => g.id === id)
  if (index < 0) return { success: false, message: '服务保障不存在' }
  mockGuarantees.splice(index, 1)
  return { success: true, message: '服务保障已删除' }
}

/** 商品问答列表 */
export function mockListQuestions(params: { keyword?: string; product_id?: number; page?: number; page_size?: number } = {}): ListQuestionsResponse {
  let list = [...mockQuestions]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((q) => q.content.toLowerCase().includes(key) || q.product_title.toLowerCase().includes(key))
  }
  if (params.product_id) list = list.filter((q) => q.product_id === params.product_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { questions: items, meta }
}

/** 回复商品问答 */
export function mockAnswerQuestion(id: number, reply: string): ProductQuestion {
  const question = mockQuestions.find((q) => q.id === id)
  if (!question) throw new Error('问答不存在')
  question.reply = reply
  question.reply_at = new Date().toISOString()
  return question
}

/** 商品参数 */
export function mockListProductParams(productId: number): ListProductParamsResponse {
  return {
    params: [
      { id: productId * 10 + 1, product_id: productId, name: '品牌', value: 'ShopStack 严选', sort: 1 },
      { id: productId * 10 + 2, product_id: productId, name: '材质', value: '进口面料', sort: 2 },
      { id: productId * 10 + 3, product_id: productId, name: '货号', value: `SS-${productId}00`, sort: 3 },
      { id: productId * 10 + 4, product_id: productId, name: '保修期', value: '12 个月', sort: 4 },
    ],
  }
}

/** 售后列表 */
export function mockListAfterSales(params: { keyword?: string; status?: number; type?: number; page?: number; page_size?: number } = {}): ListAfterSalesResponse {
  let list = [...mockAfterSales]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((a) => a.after_sale_no.toLowerCase().includes(key) || a.order_no.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((a) => a.status === params.status)
  if (params.type) list = list.filter((a) => a.type === params.type)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { after_sales: items, meta }
}

/** 售后详情 */
export function mockGetAfterSale(id: number): AfterSale {
  return mockAfterSales.find((a) => a.id === id) ?? mockAfterSales[0]
}

/** 售后状态更新 */
export function mockSetAfterSaleStatus(id: number, status: number, adminRemark: string): AfterSale {
  const afterSale = mockAfterSales.find((a) => a.id === id)
  if (!afterSale) throw new Error('售后单不存在')
  afterSale.status = status
  afterSale.admin_remark = adminRemark
  afterSale.processed_at = new Date().toISOString()
  return afterSale
}

/** 退款原因列表 */
export function mockListRefundReasons(params: { type?: number } = {}): ListRefundReasonsResponse {
  const list = params.type ? mockRefundReasons.filter((r) => r.type === params.type) : [...mockRefundReasons]
  return { reasons: list }
}

/** 保存退款原因 */
export function mockSaveRefundReason(payload: SaveRefundReasonRequest): RefundReason {
  const existed = mockRefundReasons.find((r) => r.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const reason: RefundReason = {
    id: Math.max(...mockRefundReasons.map((r) => r.id)) + 1,
    name: payload.name,
    type: payload.type ?? 1,
    sort: payload.sort ?? 0,
    enabled: payload.enabled ?? true,
  }
  mockRefundReasons.push(reason)
  return reason
}

/** 删除退款原因 */
export function mockDeleteRefundReason(id: number): { success: boolean; message: string } {
  const index = mockRefundReasons.findIndex((r) => r.id === id)
  if (index < 0) return { success: false, message: '退款原因不存在' }
  mockRefundReasons.splice(index, 1)
  return { success: true, message: '退款原因已删除' }
}

/** 后台订单统计 · 渠道 */
export function mockOrderStatsByChannel(): { channel_stats: OrderChannelStat[] } {
  return {
    channel_stats: [
      { channel: 1, channel_name: '微信支付', order_count: 1286, amount_cents: 12860000 },
      { channel: 2, channel_name: '支付宝', order_count: 942, amount_cents: 9420000 },
      { channel: 3, channel_name: '余额支付', order_count: 318, amount_cents: 3180000 },
      { channel: 4, channel_name: '其他渠道', order_count: 96, amount_cents: 960000 },
    ],
  }
}

/** 后台订单统计 · 时段 */
export function mockOrderStatsByHour(): { hour_stats: OrderHourStat[] } {
  const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
  return {
    hour_stats: hours.map((hour) => ({
      hour,
      order_count: hour >= 9 && hour <= 22 ? 180 + ((hour * 37) % 120) : 12 + ((hour * 7) % 20),
      amount_cents: (180 + ((hour * 37) % 120)) * 9900,
    })),
  }
}

/** 后台订单统计 · 地区 */
export function mockOrderStatsByRegion(): { region_stats: OrderRegionStat[] } {
  return {
    region_stats: [
      { region: '广东省 广州市', order_count: 862, amount_cents: 8620000 },
      { region: '浙江省 杭州市', order_count: 618, amount_cents: 6180000 },
      { region: '江苏省 南京市', order_count: 542, amount_cents: 5420000 },
      { region: '北京市 北京市', order_count: 498, amount_cents: 4980000 },
      { region: '四川省 成都市', order_count: 376, amount_cents: 3760000 },
      { region: '湖北省 武汉市', order_count: 305, amount_cents: 3050000 },
      { region: '上海市 上海市', order_count: 288, amount_cents: 2880000 },
      { region: '山东省 青岛市', order_count: 196, amount_cents: 1960000 },
    ],
  }
}

/** 后台订单日志 */
export function mockListAdminOrderLogs(params: { keyword?: string; page?: number; page_size?: number } = {}): ListAdminOrderLogsResponse {
  let list = [...mockOrderLogs]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((l) => (l.action ?? '').toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { logs: items, meta }
}

/** 支付渠道列表 */
export function mockListPayChannels(params: { channel?: number; page?: number; page_size?: number } = {}): ListPayChannelsResponse {
  let list = [...mockPayChannels]
  if (params.channel) list = list.filter((c) => c.channel === params.channel)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { channels: items, meta }
}

/** 保存支付渠道 */
export function mockSavePayChannel(payload: SavePayChannelRequest): PayChannel {
  const existed = mockPayChannels.find((c) => c.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const channel: PayChannel = {
    id: Math.max(...mockPayChannels.map((c) => c.id)) + 1,
    name: payload.name,
    channel: payload.channel ?? 1,
    code: payload.code ?? '',
    icon: payload.icon ?? '',
    enabled: payload.enabled ?? true,
    sort: payload.sort ?? 0,
    config: payload.config ?? '{}',
    created_at: new Date().toISOString(),
  }
  mockPayChannels.push(channel)
  return channel
}

/** 删除支付渠道 */
export function mockDeletePayChannel(id: number): { success: boolean; message: string } {
  const index = mockPayChannels.findIndex((c) => c.id === id)
  if (index < 0) return { success: false, message: '支付渠道不存在' }
  mockPayChannels.splice(index, 1)
  return { success: true, message: '支付渠道已删除' }
}

/** 充值订单列表 */
export function mockListRecharges(params: { status?: number; page?: number; page_size?: number } = {}): ListRechargesResponse {
  let list = [...mockRecharges]
  if (params.status !== undefined) list = list.filter((r) => r.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { recharges: items, meta }
}

/** 余额流水列表 */
export function mockListBalanceLogs(params: { user_id?: number; page?: number; page_size?: number } = {}): ListBalanceLogsResponse {
  let list = [...mockBalanceLogs]
  if (params.user_id) list = list.filter((l) => l.user_id === params.user_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { logs: items, meta, current_balance: 128000 }
}

/** 仓库列表 */
export function mockListWarehouses(params: { keyword?: string; page?: number; page_size?: number } = {}): ListWarehousesResponse {
  let list = [...mockWarehouses]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((w) => w.name.toLowerCase().includes(key) || w.code.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { warehouses: items, meta }
}

/** 保存仓库 */
export function mockSaveWarehouse(payload: SaveWarehouseRequest): Warehouse {
  const existed = mockWarehouses.find((w) => w.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const warehouse: Warehouse = {
    id: Math.max(...mockWarehouses.map((w) => w.id)) + 1,
    code: payload.code,
    name: payload.name,
    address: payload.address ?? '',
    contact: payload.contact ?? '',
    phone: payload.phone ?? '',
    enabled: payload.enabled ?? true,
    sort: payload.sort ?? 0,
    created_at: new Date().toISOString(),
  }
  mockWarehouses.push(warehouse)
  return warehouse
}

/** 删除仓库 */
export function mockDeleteWarehouse(id: number): { success: boolean; message: string } {
  const index = mockWarehouses.findIndex((w) => w.id === id)
  if (index < 0) return { success: false, message: '仓库不存在' }
  mockWarehouses.splice(index, 1)
  return { success: true, message: '仓库已删除' }
}

/** 入库单列表 */
export function mockListInboundOrders(params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}): ListInboundOrdersResponse {
  let list = [...mockInboundOrders]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((o) => o.inbound_no.toLowerCase().includes(key) || o.supplier.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((o) => o.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { inbound_orders: items, meta }
}

/** 创建入库单 */
export function mockCreateInboundOrder(payload: { warehouse_id: number; supplier: string; remark: string; items: StockMoveItem[] }) {
  const warehouse = mockWarehouses.find((w) => w.id === payload.warehouse_id)
  const order = {
    id: mockInboundOrders.length + 1,
    inbound_no: `IN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(mockInboundOrders.length + 1).padStart(3, '0')}`,
    warehouse_id: payload.warehouse_id,
    warehouse_name: warehouse?.name ?? '未知仓库',
    supplier: payload.supplier,
    status: 0,
    total_quantity: payload.items.reduce((sum, item) => sum + item.quantity, 0),
    remark: payload.remark,
    operator: 'admin',
    items: payload.items,
    created_at: new Date().toISOString(),
  }
  mockInboundOrders.unshift(order)
  return order
}

/** 出库单列表 */
export function mockListOutboundOrders(params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}): ListOutboundOrdersResponse {
  let list = [...mockOutboundOrders]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((o) => o.outbound_no.toLowerCase().includes(key) || o.order_no.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((o) => o.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { outbound_orders: items, meta }
}

/** 创建出库单 */
export function mockCreateOutboundOrder(payload: { warehouse_id: number; order_id: number; remark: string; items: StockMoveItem[] }) {
  const warehouse = mockWarehouses.find((w) => w.id === payload.warehouse_id)
  const order = mockOrders.find((o) => o.id === payload.order_id)
  const created = {
    id: mockOutboundOrders.length + 1,
    outbound_no: `OUT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(mockOutboundOrders.length + 1).padStart(3, '0')}`,
    warehouse_id: payload.warehouse_id,
    warehouse_name: warehouse?.name ?? '未知仓库',
    order_id: payload.order_id,
    order_no: order?.order_no ?? '',
    status: 0,
    total_quantity: payload.items.reduce((sum, item) => sum + item.quantity, 0),
    remark: payload.remark,
    operator: 'admin',
    items: payload.items,
    created_at: new Date().toISOString(),
  }
  mockOutboundOrders.unshift(created)
  return created
}

/** 盘点单列表 */
export function mockListStockChecks(params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}): ListStockChecksResponse {
  let list = [...mockStockChecks]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((c) => c.check_no.toLowerCase().includes(key) || c.warehouse_name.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((c) => c.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { stock_checks: items, meta }
}

/** 盘点单详情 */
export function mockGetStockCheck(id: number): { stock_check: StockCheck; items: StockCheckItem[] } {
  const stockCheck = mockStockChecks.find((c) => c.id === id) ?? mockStockChecks[0]
  return { stock_check: stockCheck, items: mockStockCheckItems.filter((i) => i.stock_check_id === stockCheck.id) }
}

/** 盘点明细 */
export function mockListStockCheckItems(params: { id: number; page?: number; page_size?: number }): ListStockCheckItemsResponse {
  const list = mockStockCheckItems.filter((i) => i.stock_check_id === params.id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { items, meta }
}

/** 会员等级列表 */
export function mockListUserLevels(): ListUserLevelsResponse {
  return { levels: [...mockUserLevels] }
}

/** 保存会员等级 */
export function mockSaveUserLevel(payload: SaveUserLevelRequest): UserLevel {
  const existed = mockUserLevels.find((l) => l.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const level: UserLevel = {
    id: Math.max(...mockUserLevels.map((l) => l.id)) + 1,
    name: payload.name,
    level: payload.level ?? 1,
    min_growth: payload.min_growth ?? 0,
    max_growth: payload.max_growth ?? 0,
    discount_percent: payload.discount_percent ?? 100,
    icon: payload.icon ?? '',
    description: payload.description ?? '',
    benefits: payload.benefits ?? [],
    sort: payload.sort ?? 0,
  }
  mockUserLevels.push(level)
  return level
}

/** 成长值流水 */
export function mockListGrowthLogs(params: { user_id?: number; page?: number; page_size?: number } = {}): ListGrowthLogsResponse {
  let list = [...mockGrowthLogs]
  if (params.user_id) list = list.filter((l) => l.user_id === params.user_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { logs: items, meta, current_growth: 2680 }
}

/** 用户反馈列表 */
export function mockListFeedbacks(params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}): ListFeedbacksResponse {
  let list = [...mockFeedbacks]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((f) => f.content.toLowerCase().includes(key) || f.user_nickname.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((f) => f.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { feedbacks: items, meta }
}

/** 处理用户反馈 */
export function mockSetFeedbackStatus(id: number, status: number, reply: string): Feedback {
  const feedback = mockFeedbacks.find((f) => f.id === id)
  if (!feedback) throw new Error('反馈不存在')
  feedback.status = status
  feedback.reply = reply
  feedback.processed_at = new Date().toISOString()
  return feedback
}

/** 拼团列表 */
export function mockListGroupBuys(params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}): ListGroupBuysResponse {
  let list = [...mockGroupBuys]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((g) => g.name.toLowerCase().includes(key) || g.product_title.toLowerCase().includes(key))
  }
  if (params.status !== undefined) list = list.filter((g) => g.status === params.status)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { group_buys: items, meta }
}

/** 拼团详情 */
export function mockGetGroupBuy(id: number): { group_buy: GroupBuy; members: GroupBuyMember[] } {
  const groupBuy = mockGroupBuys.find((g) => g.id === id) ?? mockGroupBuys[0]
  return { group_buy: groupBuy, members: mockGroupBuyMembers.filter((m) => m.group_buy_id === groupBuy.id) }
}

/** 拼团成员 */
export function mockListGroupBuyMembers(params: { group_buy_id?: number }): { members: GroupBuyMember[] } {
  const list = params.group_buy_id
    ? mockGroupBuyMembers.filter((m) => m.group_buy_id === params.group_buy_id)
    : [...mockGroupBuyMembers]
  return { members: list }
}

/** 保存拼团活动 */
export function mockSaveGroupBuy(payload: SaveGroupBuyRequest): GroupBuy {
  const existed = mockGroupBuys.find((g) => g.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const product = mockProducts.find((p) => p.id === payload.product_id)
  const groupBuy: GroupBuy = {
    id: Math.max(...mockGroupBuys.map((g) => g.id)) + 1,
    name: payload.name,
    description: payload.description ?? '',
    promotion_id: payload.promotion_id ?? 0,
    product_id: payload.product_id ?? 0,
    product_title: product?.title ?? '',
    product_image: product?.cover ?? '',
    price_cents: payload.price_cents ?? 0,
    original_price_cents: product?.min_price_cents ?? 0,
    required_members: payload.required_members ?? 2,
    joined_members: 0,
    group_size: 0,
    status: 0,
    start_time: payload.start_time ?? 0,
    end_time: payload.end_time ?? 0,
    banner_image: payload.banner_image ?? '',
  }
  mockGroupBuys.unshift(groupBuy)
  return groupBuy
}

/** 营销任务列表 */
export function mockListMarketingTasks(params: { keyword?: string; page?: number; page_size?: number } = {}): ListMarketingTasksResponse {
  let list = [...mockMarketingTasks]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { tasks: items, meta }
}

/** 保存营销任务 */
export function mockSaveMarketingTask(payload: SaveMarketingTaskRequest): MarketingTask {
  const existed = mockMarketingTasks.find((t) => t.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const task: MarketingTask = {
    id: Math.max(...mockMarketingTasks.map((t) => t.id)) + 1,
    name: payload.name,
    description: payload.description ?? '',
    type: payload.type ?? 1,
    target_count: payload.target_count ?? 1,
    reward_points: payload.reward_points ?? 0,
    reward_coupon_id: payload.reward_coupon_id ?? 0,
    sort: payload.sort ?? 0,
    enabled: payload.enabled ?? true,
    icon: payload.icon ?? '',
  }
  mockMarketingTasks.push(task)
  return task
}

/** 签到配置 */
export function mockGetSignInConfig(): SignInConfig {
  return { ...mockSignInConfig }
}

/** 保存签到配置 */
export function mockSaveSignInConfig(payload: Partial<SignInConfig>): SignInConfig {
  Object.assign(mockSignInConfig, payload, { updated_at: new Date().toISOString() })
  return { ...mockSignInConfig }
}

/** 活动场次列表 */
export function mockListPromotionSessions(params: { promotion_id?: number; page?: number; page_size?: number } = {}): ListPromotionSessionsResponse {
  let list = [...mockPromotionSessions]
  if (params.promotion_id) list = list.filter((s) => s.promotion_id === params.promotion_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { sessions: items, meta }
}

/** 保存活动场次 */
export function mockSavePromotionSession(payload: { id?: number; promotion_id: number; name: string; start_time: number; end_time: number; stock: number }) {
  const existed = mockPromotionSessions.find((s) => s.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const session = {
    id: Math.max(...mockPromotionSessions.map((s) => s.id)) + 1,
    promotion_id: payload.promotion_id,
    name: payload.name,
    start_time: payload.start_time,
    end_time: payload.end_time,
    stock: payload.stock,
    sold_count: 0,
    status: 0,
  }
  mockPromotionSessions.push(session)
  return session
}

/** 快递公司列表 */
export function mockListLogisticsCompanies(params: { keyword?: string; page?: number; page_size?: number } = {}): ListLogisticsCompaniesResponse {
  let list = [...mockLogisticsCompanies]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((c) => c.name.toLowerCase().includes(key) || c.code.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { companies: items, meta }
}

/** 保存快递公司 */
export function mockSaveLogisticsCompany(payload: SaveLogisticsCompanyRequest): LogisticsCompany {
  const existed = mockLogisticsCompanies.find((c) => c.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const company: LogisticsCompany = {
    id: Math.max(...mockLogisticsCompanies.map((c) => c.id)) + 1,
    name: payload.name,
    code: payload.code,
    logo: payload.logo ?? '',
    phone: payload.phone ?? '',
    enabled: payload.enabled ?? true,
    sort: payload.sort ?? 0,
    supports_cod: payload.supports_cod ?? false,
  }
  mockLogisticsCompanies.push(company)
  return company
}

/** 删除快递公司 */
export function mockDeleteLogisticsCompany(id: number): { success: boolean; message: string } {
  const index = mockLogisticsCompanies.findIndex((c) => c.id === id)
  if (index < 0) return { success: false, message: '快递公司不存在' }
  mockLogisticsCompanies.splice(index, 1)
  return { success: true, message: '快递公司已删除' }
}

/** 配送范围列表 */
export function mockListDeliveryRanges(params: { template_id?: number; page?: number; page_size?: number } = {}): ListDeliveryRangesResponse {
  let list = [...mockDeliveryRanges]
  if (params.template_id) list = list.filter((r) => r.template_id === params.template_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { ranges: items, meta }
}

/** 保存配送范围 */
export function mockSaveDeliveryRange(payload: { id?: number; template_id: number; regions: string; freight_cents: number; free_freight_amount_cents: number; enabled: boolean }): DeliveryRange {
  const existed = mockDeliveryRanges.find((r) => r.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const range: DeliveryRange = {
    id: Math.max(...mockDeliveryRanges.map((r) => r.id)) + 1,
    template_id: payload.template_id,
    template_name: `模板 ${payload.template_id}`,
    regions: payload.regions,
    freight_cents: payload.freight_cents,
    free_freight_amount_cents: payload.free_freight_amount_cents,
    enabled: payload.enabled,
  }
  mockDeliveryRanges.push(range)
  return range
}

/** 运费试算 */
export function mockCalculateFreight(payload: { template_id: number; amount_cents: number; region: string; quantity: number }): { freight_cents: number; free_freight_amount_cents: number; free: boolean; template_name: string; remark: string } {
  const range = mockDeliveryRanges.find((r) => r.template_id === payload.template_id) ?? mockDeliveryRanges[0]
  const free = payload.amount_cents >= range.free_freight_amount_cents
  return {
    freight_cents: free ? 0 : range.freight_cents,
    free_freight_amount_cents: range.free_freight_amount_cents,
    free,
    template_name: range.template_name,
    remark: free ? '已满足包邮门槛，运费为 0' : `按首重规则收取运费 ¥${(range.freight_cents / 100).toFixed(2)}`,
  }
}

/** 通知模板列表 */
export function mockListNotificationTemplates(params: { keyword?: string; type?: number; page?: number; page_size?: number } = {}): ListNotificationTemplatesResponse {
  let list = [...mockNotificationTemplates]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(key) || t.code.toLowerCase().includes(key))
  }
  if (params.type) list = list.filter((t) => t.type === params.type)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { templates: items, meta }
}

/** 保存通知模板 */
export function mockSaveNotificationTemplate(payload: SaveNotificationTemplateRequest): NotificationTemplate {
  const existed = mockNotificationTemplates.find((t) => t.id === payload.id)
  if (existed) {
    Object.assign(existed, payload, { updated_at: new Date().toISOString() })
    return existed
  }
  const template: NotificationTemplate = {
    id: Math.max(...mockNotificationTemplates.map((t) => t.id)) + 1,
    code: payload.code,
    name: payload.name,
    type: payload.type ?? 1,
    title: payload.title ?? '',
    content: payload.content ?? '',
    link: payload.link ?? '',
    enabled: payload.enabled ?? true,
    updated_at: new Date().toISOString(),
  }
  mockNotificationTemplates.push(template)
  return template
}

/** 删除通知模板 */
export function mockDeleteNotificationTemplate(id: number): { success: boolean; message: string } {
  const index = mockNotificationTemplates.findIndex((t) => t.id === id)
  if (index < 0) return { success: false, message: '通知模板不存在' }
  mockNotificationTemplates.splice(index, 1)
  return { success: true, message: '通知模板已删除' }
}

/** 短信模板列表 */
export function mockListSmsTemplates(params: { keyword?: string; page?: number; page_size?: number } = {}): ListSmsTemplatesResponse {
  let list = [...mockSmsTemplates]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(key) || t.code.toLowerCase().includes(key))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { templates: items, meta }
}

/** 保存短信模板 */
export function mockSaveSmsTemplate(payload: SaveSmsTemplateRequest): SmsTemplate {
  const existed = mockSmsTemplates.find((t) => t.id === payload.id)
  if (existed) {
    Object.assign(existed, payload, { updated_at: new Date().toISOString() })
    return existed
  }
  const template: SmsTemplate = {
    id: Math.max(...mockSmsTemplates.map((t) => t.id)) + 1,
    code: payload.code,
    name: payload.name,
    content: payload.content ?? '',
    enabled: payload.enabled ?? true,
    updated_at: new Date().toISOString(),
  }
  mockSmsTemplates.push(template)
  return template
}

/** 删除短信模板 */
export function mockDeleteSmsTemplate(id: number): { success: boolean; message: string } {
  const index = mockSmsTemplates.findIndex((t) => t.id === id)
  if (index < 0) return { success: false, message: '短信模板不存在' }
  mockSmsTemplates.splice(index, 1)
  return { success: true, message: '短信模板已删除' }
}

/** 敏感词列表 */
export function mockListSensitiveWords(params: { keyword?: string; category?: number; page?: number; page_size?: number } = {}): ListSensitiveWordsResponse {
  let list = [...mockSensitiveWords]
  if (params.keyword) {
    const key = params.keyword.toLowerCase()
    list = list.filter((w) => w.word.toLowerCase().includes(key))
  }
  if (params.category) list = list.filter((w) => w.category === params.category)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { words: items, meta }
}

/** 保存敏感词 */
export function mockSaveSensitiveWord(payload: SaveSensitiveWordRequest): SensitiveWord {
  const existed = mockSensitiveWords.find((w) => w.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const word: SensitiveWord = {
    id: Math.max(...mockSensitiveWords.map((w) => w.id)) + 1,
    word: payload.word,
    category: payload.category ?? 4,
    status: payload.status ?? 1,
    created_at: new Date().toISOString(),
  }
  mockSensitiveWords.push(word)
  return word
}

/** 删除敏感词 */
export function mockDeleteSensitiveWord(id: number): { success: boolean; message: string } {
  const index = mockSensitiveWords.findIndex((w) => w.id === id)
  if (index < 0) return { success: false, message: '敏感词不存在' }
  mockSensitiveWords.splice(index, 1)
  return { success: true, message: '敏感词已删除' }
}

/** 通知分类 */
export function mockListNotificationCategories(): ListNotificationCategoriesResponse {
  return { categories: [...mockNotificationCategories] }
}

/** 用户等级分布（用于统计页） */
export function mockUserLevelDistribution(): { levels: Array<UserLevel & { user_count: number }> } {
  const counts = [8420, 3260, 1180, 342]
  return {
    levels: mockUserLevels.map((level, index) => ({ ...level, user_count: counts[index] ?? 0 })),
  }
}

/** 演示用户（供按等级筛选用户列表） */
export function mockUsersByLevel(level: number): typeof mockUsers {
  return mockUsers.filter((u) => u.level === level)
}
