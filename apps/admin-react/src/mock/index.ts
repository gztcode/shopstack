/**
 * Mock 兜底数据源 —— 与 src/api/* 的导出函数保持同名同签名
 */
import type {
  Admin,
  AdminOrderStats,
  AuthResponse,
  Banner,
  Category,
  Coupon,
  DashboardOverview,
  Inventory,
  Invoice,
  ListInvoicesParams,
  ListInvoicesResponse,
  ListMaterialsParams,
  ListMaterialsResponse,
  ListShipmentTracksResponse,
  ListSystemSettingsResponse,
  Material,
  ListAuditLogsParams,
  ListAuditLogsResponse,
  ListCategoriesResponse,
  ListCouponsParams,
  ListCouponsResponse,
  ListInventoriesParams,
  ListInventoriesResponse,
  ListInventoryLogsParams,
  ListInventoryLogsResponse,
  ListNotificationsParams,
  ListNotificationsResponse,
  ListOrderLogsResponse,
  ListOrdersParams,
  ListOrdersResponse,
  ListPaymentsParams,
  ListPaymentsResponse,
  ListProductsParams,
  ListProductsResponse,
  ListPromotionsParams,
  ListPromotionsResponse,
  ListRefundsParams,
  ListRefundsResponse,
  ListReviewsParams,
  ListReviewsResponse,
  ListSmsRecordsParams,
  ListSmsRecordsResponse,
  ListShipmentsParams,
  ListShipmentsResponse,
  ListTemplatesResponse,
  ListUsersParams,
  ListUsersResponse,
  LogisticTemplate,
  OperationResult,
  Order,
  OrderDetail,
  PaymentSummary,
  Permission,
  Product,
  ProductDetail,
  Promotion,
  Refund,
  Review,
  Role,
  SaveMaterialRequest,
  SaveCouponRequest,
  SaveCategoryRequest,
  SavePromotionRequest,
  SaveRoleRequest,
  SaveTemplateRequest,
  Shipment,
  ShipmentTrack,
  StockWarningResponse,
  User,
} from '@/types'
import type { PageMeta } from '@/types/common'
import {
  mockAdmins,
  mockAuditLogs,
  mockBanners,
  mockCategories,
  mockCategoryStats,
  mockCoupons,
  mockInventories,
  mockInventoryLogs,
  mockInvoices,
  mockMaterials,
  mockNotifications,
  mockOrderItems,
  mockOrderLogs,
  mockOrderCategoryStats,
  mockOrderTopProducts,
  mockOrderTrend,
  mockOrders,
  mockPaymentTrend,
  mockPayments,
  mockPermissions,
  mockProductSkus,
  mockProducts,
  mockPromotions,
  mockRefunds,
  mockReviews,
  mockRoles,
  mockShipments,
  mockShipmentTracks,
  mockSettings,
  mockSmsRecords,
  mockTemplates,
  mockTopProducts,
  mockTrend,
  mockUsers,
} from './data'

/** 统一分页处理 */
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

/** 是否包含关键词（忽略大小写） */
function matchKeyword(keyword: string | undefined, ...fields: Array<string | undefined>): boolean {
  if (!keyword) return true
  const key = keyword.trim().toLowerCase()
  if (!key) return true
  return fields.some((field) => (field ?? '').toLowerCase().includes(key))
}

/** 当前管理员资料（演示） */
export function mockGetAdminProfile(): Admin {
  return mockAdmins[0]
}

/** 演示登录：仅接受种子数据中的演示账号密码 */
export function mockAdminLogin(username: string, password: string): AuthResponse {
  if (!username.trim() || password !== 'admin123456') {
    throw new Error('账号或密码错误（演示模式仅支持 admin / admin123456）')
  }
  const admin = mockAdmins.find((a) => a.username === username) ?? mockAdmins[0]
  const rolePermissions: Record<string, string[]> = {
    admin: mockPermissions.map((p) => p.code),
    operator: ['product:view', 'product:create', 'product:update', 'category:view', 'category:update', 'order:view', 'order:update', 'refund:audit', 'marketing:view', 'coupon:update', 'promotion:update', 'content:view', 'banner:update', 'system:dashboard'],
    service: ['order:view', 'order:update', 'refund:audit', 'user:view', 'system:dashboard'],
  }
  return {
    access_token: `mock-access-token-${admin.id}`,
    refresh_token: `mock-refresh-token-${admin.id}`,
    expires_in: 7200,
    token_type: 'Bearer',
    admin,
    permissions: rolePermissions[admin.username] ?? rolePermissions.admin,
  }
}

// ---------------------------------------------------------------------------
// 后台 / 用户 / 角色 / 权限
// ---------------------------------------------------------------------------
export function mockListUsers(params: ListUsersParams = {}): ListUsersResponse {
  let list = [...mockUsers]
  if (params.keyword) {
    list = list.filter((u) => matchKeyword(params.keyword, u.username, u.nickname, u.phone, u.email))
  }
  if (params.status) {
    list = list.filter((u) => u.status.endsWith(String(params.status)))
  }
  if (params.level) {
    list = list.filter((u) => u.level === params.level)
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { users: items, meta }
}

export function mockUpdateUserStatus(userId: number, status: number): OperationResult {
  const user = mockUsers.find((u) => u.id === userId)
  if (!user) return { success: false, message: '用户不存在' }
  const map: Record<number, User['status']> = {
    1: 'USER_STATUS_ACTIVE',
    2: 'USER_STATUS_DISABLED',
    3: 'USER_STATUS_FROZEN',
  }
  user.status = map[status] ?? user.status
  return { success: true, message: '用户状态已更新' }
}

export function mockListRoles(): { roles: Role[] } {
  return { roles: [...mockRoles] }
}

export function mockSaveRole(payload: SaveRoleRequest): Role {
  const permissions = mockPermissions.filter((p) => payload.permission_ids.includes(p.id))
  const existed = mockRoles.find((r) => r.id === payload.id)
  if (existed) {
    existed.name = payload.name
    existed.code = payload.code
    existed.description = payload.description ?? ''
    existed.permission_ids = payload.permission_ids
    existed.permission_codes = permissions.map((p) => p.code)
    return existed
  }
  const role: Role = {
    id: Math.max(...mockRoles.map((r) => r.id)) + 1,
    name: payload.name,
    code: payload.code,
    description: payload.description ?? '',
    permission_ids: payload.permission_ids,
    permission_codes: permissions.map((p) => p.code),
    user_count: 0,
    created_at: new Date().toISOString(),
  }
  mockRoles.push(role)
  return role
}

export function mockDeleteRole(id: number): OperationResult {
  const index = mockRoles.findIndex((r) => r.id === id)
  if (index < 0) return { success: false, message: '角色不存在' }
  mockRoles.splice(index, 1)
  return { success: true, message: '角色已删除' }
}

export function mockListPermissions(): { permissions: Permission[] } {
  return { permissions: [...mockPermissions] }
}

export function mockDashboardOverview(days = 30): DashboardOverview {
  const trend = mockTrend.slice(-days)
  const totalRevenue = trend.reduce((sum, point) => sum + point.revenue_cents, 0)
  const todayRevenue = trend.length ? trend[trend.length - 1].revenue_cents : 0
  return {
    total_users: mockUsers.length * 137 + 1842,
    new_users: trend.reduce((sum, point) => sum + point.new_users, 0),
    total_products: mockProducts.length * 26 + 118,
    on_shelf_products: mockProducts.length * 22 + 96,
    total_orders: mockOrders.length * 63 + 4218,
    pending_shipment: mockOrders.filter((o) => o.status === 'ORDER_STATUS_PAID').length * 7 + 26,
    paid_orders: mockOrders.filter((o) => o.paid_cents > 0).length * 61 + 3982,
    total_revenue_cents: totalRevenue,
    today_revenue_cents: todayRevenue,
    pending_refunds: mockRefunds.filter((r) => r.status === 0).length + 5,
    trend,
    category_stats: mockCategoryStats,
    top_products: mockTopProducts,
  }
}

// ---------------------------------------------------------------------------
// 商品 / 分类 / 评价 / 轮播
// ---------------------------------------------------------------------------
export function mockListProducts(params: ListProductsParams = {}): ListProductsResponse {
  let list = [...mockProducts]
  if (params.keyword) {
    list = list.filter((p) => matchKeyword(params.keyword, p.title, p.subtitle, p.tags.join(',')))
  }
  if (params.category_id) {
    list = list.filter((p) => p.category_id === params.category_id)
  }
  if (params.status) {
    const target = Number(params.status)
    list = list.filter((p) => p.status.endsWith(String(target)))
  }
  if (params.only_in_stock) {
    list = list.filter((p) => p.stock_total > 0)
  }
  if (params.tags && params.tags.length) {
    list = list.filter((p) => params.tags!.some((tag) => p.tags.includes(tag)))
  }
  if (params.sort === 'sales') list.sort((a, b) => b.sales_count - a.sales_count)
  if (params.sort === 'price_asc') list.sort((a, b) => a.min_price_cents - b.min_price_cents)
  if (params.sort === 'price_desc') list.sort((a, b) => b.min_price_cents - a.min_price_cents)
  if (params.sort === 'newest') list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { products: items, meta }
}

export function mockGetProduct(id: number): ProductDetail {
  const product = mockProducts.find((p) => p.id === id) ?? mockProducts[0]
  return {
    product,
    skus: mockProductSkus.filter((s) => s.product_id === product.id),
    images: [{ url: product.cover, alt: product.title, sort: 1 }],
    attributes: [],
    reviews: mockReviews.filter((r) => r.product_id === product.id),
    review_count: mockReviews.filter((r) => r.product_id === product.id).length,
    review_rating: 4.6,
    related: mockProducts.filter((p) => p.category_id === product.category_id && p.id !== product.id),
  }
}

export function mockSaveProduct(payload: Partial<Product> & { title: string }): Product {
  const category = mockCategories.find((c) => c.id === payload.category_id)
  if (payload.id) {
    const existed = mockProducts.find((p) => p.id === payload.id)
    if (existed) {
      Object.assign(existed, payload, { category_name: category?.name ?? existed.category_name })
      return existed
    }
  }
  const product: Product = {
    id: Math.max(...mockProducts.map((p) => p.id)) + 1,
    title: payload.title,
    subtitle: payload.subtitle ?? '',
    cover: payload.cover ?? '',
    category_id: payload.category_id ?? 0,
    category_name: category?.name ?? '未分类',
    min_price_cents: payload.min_price_cents ?? 0,
    max_price_cents: payload.max_price_cents ?? payload.min_price_cents ?? 0,
    sales_count: payload.sales_count ?? 0,
    stock_total: payload.stock_total ?? 0,
    status: payload.status ?? 'PRODUCT_STATUS_DRAFT',
    description: payload.description ?? '',
    tags: payload.tags ?? [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  mockProducts.unshift(product)
  return product
}

export function mockSetProductStatus(id: number, status: number): Product {
  const product = mockProducts.find((p) => p.id === id)
  if (!product) throw new Error('商品不存在')
  const map: Record<number, Product['status']> = {
    1: 'PRODUCT_STATUS_DRAFT',
    2: 'PRODUCT_STATUS_ON_SHELF',
    3: 'PRODUCT_STATUS_OFF_SHELF',
  }
  product.status = map[status] ?? product.status
  product.updated_at = new Date().toISOString()
  return product
}

export function mockDeleteProduct(id: number): OperationResult {
  const index = mockProducts.findIndex((p) => p.id === id)
  if (index < 0) return { success: false, message: '商品不存在' }
  mockProducts.splice(index, 1)
  return { success: true, message: '商品已删除' }
}

export function mockListCategories(): ListCategoriesResponse {
  const roots = mockCategories.filter((c) => c.parent_id === 0)
  const tree = roots.map((root) => ({
    ...root,
    children: mockCategories.filter((c) => c.parent_id === root.id),
  }))
  return { categories: tree }
}

export function mockSaveCategory(payload: SaveCategoryRequest): Category {
  const existed = mockCategories.find((c) => c.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const category: Category = {
    id: Math.max(...mockCategories.map((c) => c.id)) + 1,
    name: payload.name,
    parent_id: payload.parent_id ?? 0,
    icon: payload.icon ?? '',
    description: payload.description ?? '',
    sort: payload.sort ?? 0,
    visible: payload.visible ?? true,
    product_count: 0,
    children: [],
  }
  mockCategories.push(category)
  return category
}

export function mockDeleteCategory(id: number): OperationResult {
  const index = mockCategories.findIndex((c) => c.id === id)
  if (index < 0) return { success: false, message: '分类不存在' }
  mockCategories.splice(index, 1)
  return { success: true, message: '分类已删除' }
}

export function mockListReviews(params: ListReviewsParams = {}): ListReviewsResponse {
  let list = [...mockReviews]
  if (params.keyword) {
    list = list.filter((r) => matchKeyword(params.keyword, r.content, r.product_title, r.user_nickname))
  }
  if (params.status) {
    const target = Number(params.status)
    list = list.filter((r) => r.status.endsWith(String(target)))
  }
  if (params.product_id) list = list.filter((r) => r.product_id === params.product_id)
  if (params.user_id) list = list.filter((r) => r.user_id === params.user_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  const rated = list.length ? list : mockReviews
  const summary = {
    total: rated.length,
    good: rated.filter((r) => r.rating >= 4).length,
    medium: rated.filter((r) => r.rating === 3).length,
    bad: rated.filter((r) => r.rating <= 2).length,
    average: rated.length ? Number((rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)) : 0,
  }
  return { reviews: items, meta, summary }
}

export function mockSetReviewStatus(id: number, status: number, adminReply?: string): Review {
  const review = mockReviews.find((r) => r.id === id)
  if (!review) throw new Error('评价不存在')
  const map: Record<number, Review['status']> = {
    1: 'REVIEW_STATUS_PENDING',
    2: 'REVIEW_STATUS_APPROVED',
    3: 'REVIEW_STATUS_REJECTED',
  }
  review.status = map[status] ?? review.status
  if (adminReply !== undefined) review.admin_reply = adminReply
  return review
}

export function mockListBanners(): { banners: Banner[] } {
  return { banners: [...mockBanners] }
}

export function mockSaveBanner(payload: Partial<Banner> & { title: string }): Banner {
  const existed = mockBanners.find((b) => b.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const banner: Banner = {
    id: Math.max(...mockBanners.map((b) => b.id)) + 1,
    title: payload.title,
    image: payload.image ?? '',
    link: payload.link ?? '',
    sort: payload.sort ?? 0,
    position: payload.position ?? 'home_banner',
    visible: payload.visible ?? true,
    created_at: new Date().toISOString(),
  }
  mockBanners.push(banner)
  return banner
}

export function mockDeleteBanner(id: number): OperationResult {
  const index = mockBanners.findIndex((b) => b.id === id)
  if (index < 0) return { success: false, message: '轮播不存在' }
  mockBanners.splice(index, 1)
  return { success: true, message: '轮播已删除' }
}

// ---------------------------------------------------------------------------
// 订单 / 退款 / 支付
// ---------------------------------------------------------------------------
export function mockListOrders(params: ListOrdersParams = {}): ListOrdersResponse {
  let list = [...mockOrders]
  if (params.keyword) {
    list = list.filter((o) => matchKeyword(params.keyword, o.order_no, o.user_nickname))
  }
  if (params.status) {
    const target = Number(params.status)
    list = list.filter((o) => o.status.endsWith(String(target)))
  }
  if (params.user_id) list = list.filter((o) => o.user_id === params.user_id)
  list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const { items, meta } = paginate(list, params.page, params.page_size)
  return {
    orders: items,
    meta,
    pending_payment_count: mockOrders.filter((o) => o.status === 'ORDER_STATUS_PENDING_PAYMENT').length,
    pending_shipment_count: mockOrders.filter((o) => o.status === 'ORDER_STATUS_PAID').length,
    pending_receipt_count: mockOrders.filter((o) => o.status === 'ORDER_STATUS_SHIPPED').length,
    refunding_count: mockOrders.filter((o) => o.status === 'ORDER_STATUS_REFUNDING').length,
  }
}

export function mockGetOrder(id: number): OrderDetail {
  const order = mockOrders.find((o) => o.id === id) ?? mockOrders[0]
  return {
    order,
    items: mockOrderItems.filter((i) => i.order_id === order.id),
    logs: mockOrderLogs.filter((l) => l.order_id === order.id),
    coupon_id: 0,
    coupon_name: '',
    payment_id: mockPayments.find((p) => p.order_id === order.id)?.id ?? 0,
    shipment_id: order.shipment_id,
    tracking_no: mockShipments.find((s) => s.order_id === order.id)?.tracking_no ?? '',
    logistics_company: mockShipments.find((s) => s.order_id === order.id)?.company ?? '',
    logistics_tracks: [],
    can_cancel: order.status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_pay: order.status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_confirm: order.status === 'ORDER_STATUS_SHIPPED',
    can_refund: order.status === 'ORDER_STATUS_COMPLETED',
    can_review: order.status === 'ORDER_STATUS_COMPLETED',
  }
}

export function mockListOrderLogs(orderId: number): ListOrderLogsResponse {
  return { logs: mockOrderLogs.filter((l) => l.order_id === orderId) }
}

export function mockUpdateOrderRemark(id: number, adminRemark: string): Order {
  const order = mockOrders.find((o) => o.id === id)
  if (!order) throw new Error('订单不存在')
  order.admin_remark = adminRemark
  return order
}

export function mockCreateShipment(payload: {
  order_id: number
  company: string
  tracking_no: string
}): Shipment {
  const order = mockOrders.find((o) => o.id === payload.order_id)
  const shipment: Shipment = {
    id: Math.max(...mockShipments.map((s) => s.id)) + 1,
    order_id: payload.order_id,
    order_no: order?.order_no ?? '',
    tracking_no: payload.tracking_no,
    company: payload.company,
    company_code: '',
    status: 'SHIPMENT_STATUS_SHIPPED',
    receiver: order?.address.receiver ?? '',
    phone: order?.address.phone ?? '',
    address: order ? `${order.address.province}${order.address.city}${order.address.district}${order.address.detail}` : '',
    freight_cents: 0,
    item_count: order?.total_quantity ?? 0,
    shipped_at: new Date().toISOString(),
    delivered_at: '',
    created_at: new Date().toISOString(),
    remark: '',
  }
  mockShipments.unshift(shipment)
  if (order) {
    order.status = 'ORDER_STATUS_SHIPPED'
    order.shipped_at = shipment.shipped_at
    order.shipment_id = shipment.id
  }
  return shipment
}

export function mockListRefunds(params: ListRefundsParams = {}): ListRefundsResponse {
  let list = [...mockRefunds]
  if (params.keyword) {
    list = list.filter((r) => matchKeyword(params.keyword, r.refund_no, r.order_no, r.reason))
  }
  if (params.status !== undefined) {
    list = list.filter((r) => r.status === params.status)
  }
  if (params.user_id) list = list.filter((r) => r.user_id === params.user_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { refunds: items, meta }
}

export function mockSetRefundStatus(id: number, status: number, adminRemark?: string): Refund {
  const refund = mockRefunds.find((r) => r.id === id)
  if (!refund) throw new Error('退款单不存在')
  refund.status = status
  if (adminRemark !== undefined) refund.admin_remark = adminRemark
  refund.processed_at = new Date().toISOString()
  return refund
}

export function mockListPayments(params: ListPaymentsParams = {}): ListPaymentsResponse {
  let list = [...mockPayments]
  if (params.keyword) {
    list = list.filter((p) => matchKeyword(params.keyword, p.payment_no, p.order_no))
  }
  if (params.status) {
    const target = Number(params.status)
    list = list.filter((p) => p.status.endsWith(String(target)))
  }
  if (params.channel) {
    const target = Number(params.channel)
    list = list.filter((p) => p.channel.endsWith(String(target)))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return {
    payments: items,
    meta,
    total_amount_cents: list.reduce((sum, p) => sum + p.amount_cents, 0),
    total_refunded_cents: list.reduce((sum, p) => sum + p.refunded_cents, 0),
  }
}

export function mockPaymentSummary(): PaymentSummary {
  const success = mockPayments.filter((p) => p.status === 'PAYMENT_STATUS_SUCCESS')
  return {
    today_count: mockPayments.filter((p) => p.paid_at.startsWith(new Date().toISOString().slice(0, 10))).length,
    today_amount_cents: success.slice(0, 4).reduce((sum, p) => sum + p.amount_cents, 0),
    total_count: mockPayments.length,
    total_amount_cents: mockPayments.reduce((sum, p) => sum + p.amount_cents, 0),
    refunded_amount_cents: mockPayments.reduce((sum, p) => sum + p.refunded_cents, 0),
    success_rate: mockPayments.length
      ? Math.round((success.length / mockPayments.length) * 100)
      : 0,
    trend: mockPaymentTrend,
  }
}

// ---------------------------------------------------------------------------
// 库存
// ---------------------------------------------------------------------------
export function mockListInventories(params: ListInventoriesParams = {}): ListInventoriesResponse {
  let list = [...mockInventories]
  if (params.keyword) {
    list = list.filter((i) => matchKeyword(params.keyword, i.sku_code, i.spec_text))
  }
  if (params.product_id) list = list.filter((i) => i.product_id === params.product_id)
  if (params.low_stock_only) {
    list = list.filter((i) => i.available_stock <= i.safety_stock)
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { inventories: items, meta }
}

export function mockListInventoryLogs(params: ListInventoryLogsParams = {}): ListInventoryLogsResponse {
  let list = [...mockInventoryLogs]
  if (params.sku_id) list = list.filter((l) => l.sku_id === params.sku_id)
  if (params.product_id) list = list.filter((l) => l.product_id === params.product_id)
  if (params.biz_id) list = list.filter((l) => l.biz_id === params.biz_id)
  if (params.change_type) list = list.filter((l) => l.change_type === params.change_type)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { logs: items, meta }
}

export function mockStockWarning(): StockWarningResponse {
  const list = mockInventories.filter((i) => i.available_stock <= i.safety_stock)
  return { inventories: list, count: list.length }
}

export function mockAdjustStock(payload: {
  sku_id: number
  quantity: number
  reason: string
  safety_stock?: number
  warehouse?: string
}): Inventory {
  const inventory = mockInventories.find((i) => i.sku_id === payload.sku_id)
  if (!inventory) throw new Error('库存记录不存在')
  inventory.available_stock = payload.quantity
  inventory.total_stock = payload.quantity + inventory.locked_stock
  if (payload.safety_stock !== undefined) inventory.safety_stock = payload.safety_stock
  if (payload.warehouse) inventory.warehouse = payload.warehouse
  inventory.updated_at = new Date().toISOString()
  mockInventoryLogs.unshift({
    id: Math.max(...mockInventoryLogs.map((l) => l.id)) + 1,
    sku_id: payload.sku_id,
    product_id: inventory.product_id,
    sku_code: inventory.sku_code,
    change_type: 5,
    quantity: payload.quantity,
    before_stock: inventory.available_stock,
    after_stock: payload.quantity,
    biz_type: 'manual',
    biz_id: '',
    operator: '运营后台',
    remark: payload.reason,
    created_at: new Date().toISOString(),
  })
  return inventory
}

// ---------------------------------------------------------------------------
// 营销
// ---------------------------------------------------------------------------
export function mockListCoupons(params: ListCouponsParams = {}): ListCouponsResponse {
  let list = [...mockCoupons]
  if (params.keyword) {
    list = list.filter((c) => matchKeyword(params.keyword, c.name, c.code))
  }
  if (params.type) {
    const target = Number(params.type)
    list = list.filter((c) => c.type.endsWith(String(target)))
  }
  if (params.enabled !== undefined) {
    list = list.filter((c) => c.enabled === params.enabled)
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { coupons: items, meta }
}

export function mockSaveCoupon(payload: SaveCouponRequest): Coupon {
  const existed = mockCoupons.find((c) => c.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const coupon: Coupon = {
    id: Math.max(...mockCoupons.map((c) => c.id)) + 1,
    name: payload.name,
    code: payload.code,
    type: (['COUPON_TYPE_FIXED', 'COUPON_TYPE_PERCENT', 'COUPON_TYPE_SHIPPING'] as const)[
      Math.max(0, payload.type - 1)
    ],
    face_value_cents: payload.face_value_cents ?? 0,
    percent: payload.percent ?? 100,
    min_amount_cents: payload.min_amount_cents ?? 0,
    max_discount_cents: payload.max_discount_cents ?? 0,
    total_quantity: payload.total_quantity ?? 0,
    received_quantity: 0,
    used_quantity: 0,
    per_user_limit: payload.per_user_limit ?? 1,
    start_time: payload.start_time ?? 0,
    end_time: payload.end_time ?? 0,
    category_id: payload.category_id ?? 0,
    enabled: payload.enabled ?? true,
    created_at: new Date().toISOString(),
  }
  mockCoupons.unshift(coupon)
  return coupon
}

export function mockDeleteCoupon(id: number): OperationResult {
  const index = mockCoupons.findIndex((c) => c.id === id)
  if (index < 0) return { success: false, message: '优惠券不存在' }
  mockCoupons.splice(index, 1)
  return { success: true, message: '优惠券已删除' }
}

export function mockListPromotions(params: ListPromotionsParams = {}): ListPromotionsResponse {
  let list = [...mockPromotions]
  if (params.keyword) {
    list = list.filter((p) => matchKeyword(params.keyword, p.name, p.description))
  }
  if (params.status !== undefined) list = list.filter((p) => p.status === params.status)
  if (params.type) list = list.filter((p) => p.type === params.type)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { promotions: items, meta }
}

export function mockSavePromotion(payload: SavePromotionRequest): Promotion {
  const existed = mockPromotions.find((p) => p.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const promotion: Promotion = {
    id: Math.max(...mockPromotions.map((p) => p.id)) + 1,
    name: payload.name,
    description: payload.description ?? '',
    type: payload.type,
    status: payload.status,
    start_time: payload.start_time,
    end_time: payload.end_time,
    min_amount_cents: payload.min_amount_cents,
    discount_cents: payload.discount_cents,
    percent: payload.percent,
    product_id: payload.product_id,
    limit_per_user: payload.limit_per_user,
    sold_count: 0,
    banner_image: payload.banner_image ?? '',
    created_at: new Date().toISOString(),
  }
  mockPromotions.unshift(promotion)
  return promotion
}

export function mockDeletePromotion(id: number): OperationResult {
  const index = mockPromotions.findIndex((p) => p.id === id)
  if (index < 0) return { success: false, message: '活动不存在' }
  mockPromotions.splice(index, 1)
  return { success: true, message: '活动已删除' }
}

// ---------------------------------------------------------------------------
// 物流
// ---------------------------------------------------------------------------
export function mockListTemplates(): ListTemplatesResponse {
  return { templates: [...mockTemplates] }
}

export function mockSaveTemplate(payload: SaveTemplateRequest): LogisticTemplate {
  const existed = mockTemplates.find((t) => t.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const template: LogisticTemplate = {
    id: Math.max(...mockTemplates.map((t) => t.id)) + 1,
    name: payload.name,
    company: payload.company,
    company_code: payload.company_code,
    freight_cents: payload.freight_cents,
    free_freight_amount_cents: payload.free_freight_amount_cents,
    enabled: payload.enabled,
    sort: payload.sort,
    regions: payload.regions,
  }
  mockTemplates.push(template)
  return template
}

export function mockDeleteTemplate(id: number): OperationResult {
  const index = mockTemplates.findIndex((t) => t.id === id)
  if (index < 0) return { success: false, message: '运费模板不存在' }
  mockTemplates.splice(index, 1)
  return { success: true, message: '运费模板已删除' }
}

export function mockListShipments(params: ListShipmentsParams = {}): ListShipmentsResponse {
  let list = [...mockShipments]
  if (params.keyword) {
    list = list.filter((s) => matchKeyword(params.keyword, s.tracking_no, s.order_no, s.company))
  }
  if (params.status) {
    const target = Number(params.status)
    list = list.filter((s) => s.status.endsWith(String(target)))
  }
  if (params.order_id) list = list.filter((s) => s.order_id === params.order_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { shipments: items, meta }
}

// ---------------------------------------------------------------------------
// 通知 / 短信 / 操作日志
// ---------------------------------------------------------------------------
export function mockListNotifications(params: ListNotificationsParams = {}): ListNotificationsResponse {
  let list = [...mockNotifications]
  if (params.unread_only) list = list.filter((n) => !n.read)
  if (params.type) {
    const target = Number(params.type)
    list = list.filter((n) => n.type.endsWith(String(target)))
  }
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { notifications: items, meta, unread_count: mockNotifications.filter((n) => !n.read).length }
}

export function mockMarkNotificationRead(id: number): OperationResult {
  const notification = mockNotifications.find((n) => n.id === id)
  if (!notification) return { success: false, message: '通知不存在' }
  notification.read = true
  notification.read_at = new Date().toISOString()
  return { success: true, message: '已标记为已读' }
}

export function mockMarkAllNotificationsRead(): OperationResult {
  mockNotifications.forEach((n) => {
    n.read = true
    n.read_at = new Date().toISOString()
  })
  return { success: true, message: '全部通知已读' }
}

export function mockListSmsRecords(params: ListSmsRecordsParams = {}): ListSmsRecordsResponse {
  let list = [...mockSmsRecords]
  if (params.phone) list = list.filter((r) => r.phone.includes(params.phone!))
  if (params.scene) list = list.filter((r) => r.scene === params.scene)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { records: items, meta }
}

export function mockListAuditLogs(params: ListAuditLogsParams = {}): ListAuditLogsResponse {
  let list = [...mockAuditLogs]
  if (params.module) list = list.filter((l) => l.module === params.module)
  if (params.action) list = list.filter((l) => l.action === params.action)
  if (params.admin_id) list = list.filter((l) => l.admin_id === params.admin_id)
  if (params.keyword) {
    list = list.filter((l) => matchKeyword(params.keyword, l.detail, l.admin_name, l.target_id))
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at))
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { logs: items, meta }
}

// ---------------------------------------------------------------------------
// 素材库
// ---------------------------------------------------------------------------
export function mockListMaterials(params: ListMaterialsParams = {}): ListMaterialsResponse {
  let list = [...mockMaterials]
  if (params.keyword) {
    list = list.filter((m) => matchKeyword(params.keyword, m.name, m.url, m.folder))
  }
  if (params.type) list = list.filter((m) => m.type === params.type)
  if (params.folder) list = list.filter((m) => m.folder === params.folder)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { materials: items, meta }
}

export function mockSaveMaterial(payload: SaveMaterialRequest): Material {
  const existed = mockMaterials.find((m) => m.id === payload.id)
  if (existed) {
    Object.assign(existed, payload)
    return existed
  }
  const material: Material = {
    id: Math.max(...mockMaterials.map((m) => m.id)) + 1,
    name: payload.name,
    url: payload.url,
    type: payload.type,
    size: payload.size,
    folder: payload.folder,
    sort: payload.sort,
    created_at: new Date().toISOString(),
  }
  mockMaterials.unshift(material)
  return material
}

export function mockDeleteMaterial(id: number): OperationResult {
  const index = mockMaterials.findIndex((m) => m.id === id)
  if (index < 0) return { success: false, message: '素材不存在' }
  mockMaterials.splice(index, 1)
  return { success: true, message: '素材已删除' }
}

// ---------------------------------------------------------------------------
// 发票
// ---------------------------------------------------------------------------
export function mockListInvoices(params: ListInvoicesParams = {}): ListInvoicesResponse {
  let list = [...mockInvoices]
  if (params.status !== undefined) list = list.filter((i) => i.status === params.status)
  if (params.user_id) list = list.filter((i) => i.user_id === params.user_id)
  const { items, meta } = paginate(list, params.page, params.page_size)
  return { invoices: items, meta }
}

export function mockSetInvoiceStatus(
  id: number,
  status: number,
  invoiceUrl?: string,
  remark?: string,
): Invoice {
  const invoice = mockInvoices.find((i) => i.id === id)
  if (!invoice) throw new Error('发票不存在')
  invoice.status = status
  if (invoiceUrl !== undefined) invoice.invoice_url = invoiceUrl
  if (remark !== undefined) invoice.remark = remark
  return invoice
}

// ---------------------------------------------------------------------------
// 系统设置
// ---------------------------------------------------------------------------
export function mockListSystemSettings(group?: string): ListSystemSettingsResponse {
  const list = group ? mockSettings.filter((s) => s.group === group) : [...mockSettings]
  return { settings: list }
}

export function mockUpdateSystemSettings(
  group: string,
  values: Record<string, string>,
): ListSystemSettingsResponse {
  mockSettings
    .filter((s) => s.group === group)
    .forEach((setting) => {
      if (values[setting.key] !== undefined) {
        setting.value = values[setting.key]
        setting.updated_at = new Date().toISOString()
      }
    })
  return { settings: mockSettings.filter((s) => s.group === group) }
}

// ---------------------------------------------------------------------------
// 经营分析
// ---------------------------------------------------------------------------
export function mockAdminOrderStats(days = 30): AdminOrderStats {
  const trend = mockOrderTrend.slice(-days)
  const totalRevenue = trend.reduce((sum, point) => sum + point.revenue_cents, 0)
  const today = trend[trend.length - 1]
  return {
    total_orders: 4218,
    paid_orders: 3982,
    pending_payment: 86,
    pending_shipment: 54,
    pending_receipt: 37,
    refunding: 12,
    cancelled: 63,
    completed: 3611,
    total_revenue_cents: totalRevenue,
    today_revenue_cents: today?.revenue_cents ?? 0,
    today_orders: today?.order_count ?? 0,
    total_users: 3212,
    trend,
    category_stats: mockOrderCategoryStats,
    top_products: mockOrderTopProducts,
  }
}

// ---------------------------------------------------------------------------
// 物流轨迹
// ---------------------------------------------------------------------------
export function mockListTracks(orderId?: number): ListShipmentTracksResponse {
  const shipment = mockShipments.find((s) => s.order_id === orderId)
  if (!shipment) return { tracks: [], shipment: undefined }
  const tracks = mockShipmentTracks.filter((t) => t.shipment_id === shipment.id)
  return { tracks, shipment }
}

export function mockListTracksByOrder(orderId: number): ShipmentTrack[] {
  const shipment = mockShipments.find((s) => s.order_id === orderId)
  if (!shipment) return []
  return mockShipmentTracks.filter((t) => t.shipment_id === shipment.id)
}

// ---------------------------------------------------------------------------
// 扩展页面（频道 / 仓储 / 售后 / 拼团 / 模板 等）的 Mock 兜底数据
// ---------------------------------------------------------------------------
export * from './expansion'
