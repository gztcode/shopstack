/**
 * 内置 Mock 数据服务
 * 字段结构与 proto 完全一致；后端未就绪时由接口层回退到这里。
 */

import type {
  AccountSecurityInfo,
  Address,
  AfterSale,
  AuthResponse,
  Banner,
  Cart,
  CartItem,
  Channel,
  Coupon,
  FavoriteProduct,
  Feedback,
  FreightQuote,
  GrowthLog,
  GroupBuy,
  GroupBuyMember,
  HelpArticle,
  Invoice,
  InvoiceTemplate,
  ListAfterSalesResponse,
  ListBannersResponse,
  ListCategoriesResponse,
  ListChannelProductsResponse,
  ListChannelsResponse,
  ListFavoritesResponse,
  ListGrowthLogsResponse,
  ListGroupBuysResponse,
  ListHelpArticlesResponse,
  ListInvoiceTemplatesResponse,
  ListNotificationCategoriesResponse,
  ListNotificationsResponse,
  ListOrdersResponse,
  ListProductParamsResponse,
  ListProductQuestionsResponse,
  ListProductsResponse,
  ListRefundReasonsResponse,
  ListRegionsResponse,
  ListReviewTagsResponse,
  ListReviewsResponse,
  ListShipmentTracksResponse,
  ListTasksResponse,
  ListUserCouponsResponse,
  Notification,
  NotificationCategory,
  OperationResult,
  Order,
  OrderCount,
  OrderDetail,
  OrderStatusLog,
  Payment,
  PointsLog,
  PreviewCheckoutResponse,
  ProductDetail,
  ProductQuestion,
  PromotionSession,
  RechargeConfig,
  RechargeOrder,
  Refund,
  ReviewTag,
  SignInStatus,
  User,
  UserCoupon,
  UserLevel,
  UserLevelInfo,
  UserNotificationSettings,
  UserTask,
} from '@/types'

import {
  mockAddresses,
  mockAttributes,
  mockBanners,
  mockCartItems,
  mockCategories,
  mockCoupons,
  mockInvoices,
  mockNotifications,
  mockOrderItems,
  mockOrderLogs,
  mockOrders,
  mockPayments,
  mockProducts,
  mockPointsLogs,
  mockPromotions,
  mockReviews,
  mockShipmentTracks,
  mockShipments,
  mockSkus,
  mockUser,
  mockUserCoupons,
} from './data'
import {
  mockAccountSecurity,
  mockAfterSales,
  mockChannels,
  mockFeedbacks,
  mockGrowthLogs,
  mockGroupBuys,
  mockGroupBuyMembers,
  mockHelpArticles,
  mockInvoiceTemplates,
  mockNotificationSettings,
  mockProductQuestions,
  mockPromotionSessions,
  mockRechargeConfig,
  mockRecharges,
  mockRefundReasons,
  mockRegions,
  mockReviewTags,
  mockSignInCalendar,
  mockUserLevels,
  mockUserTasks,
} from './extended'

/* ---------------------------------------------------------------------------
 * 可变的演示状态
 * --------------------------------------------------------------------------- */
const state = {
  cartItems: mockCartItems.map((item) => ({ ...item })) as CartItem[],
  orders: mockOrders.map((order) => ({ ...order })) as Order[],
  orderItems: mockOrderItems.map((item) => ({ ...item })),
  addresses: mockAddresses.map((address) => ({ ...address })) as Address[],
  userCoupons: mockUserCoupons.map((item) => ({ ...item })) as UserCoupon[],
  favorites: [
    {
      id: 1,
      product_id: 3,
      title: '智能运动手表 GT4',
      cover: 'https://placehold.co/600x600/F5811F/FFFFFF?text=Watch+GT4',
      price_cents: 89900,
      created_at: '2026-10-11T02:00:00Z',
    },
    {
      id: 2,
      product_id: 9,
      title: '降噪蓝牙耳机 Air',
      cover: 'https://placehold.co/600x600/121B26/FFFFFF?text=Earphone+Air',
      price_cents: 69900,
      created_at: '2026-10-09T02:00:00Z',
    },
  ] as FavoriteProduct[],
  notifications: mockNotifications.map((item) => ({ ...item })) as Notification[],
  payments: mockPayments.map((item) => ({ ...item })) as Payment[],
}

let cartSeq = 100
let orderSeq = 1100
let paymentSeq = 4000

/* ---------------------------------------------------------------------------
 * 工具
 * --------------------------------------------------------------------------- */
function paginate<T>(list: T[], page = 1, pageSize = 20) {
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    meta: { page, page_size: pageSize, total, total_pages: totalPages },
  }
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

function categoryChain(categoryId: number): number[] {
  const ids = [categoryId]
  let current = mockCategories.find((item) => item.id === categoryId)
  while (current && current.parent_id) {
    ids.push(current.parent_id)
    current = mockCategories.find((item) => item.id === current?.parent_id)
  }
  return ids
}

function buildCart(): Cart {
  const items = state.cartItems
  const selected = items.filter((item) => item.selected && item.available)
  const selectedAmount = selected.reduce((sum, item) => sum + item.price_cents * item.quantity, 0)
  const selectedDiscount = selected.reduce(
    (sum, item) => sum + Math.max(0, item.price_cents - item.price_cents) * item.quantity,
    0,
  )
  return {
    user_id: mockUser.id,
    items,
    total_count: items.reduce((sum, item) => sum + item.quantity, 0),
    selected_count: selected.reduce((sum, item) => sum + item.quantity, 0),
    selected_amount_cents: selectedAmount,
    selected_discount_cents: selectedDiscount,
    selected_payable_cents: selectedAmount - selectedDiscount,
  }
}

/* ---------------------------------------------------------------------------
 * 商品域
 * --------------------------------------------------------------------------- */
export function listCategories(): ListCategoriesResponse {
  return { categories: mockCategories }
}

export function listBanners(position?: string): ListBannersResponse {
  const banners: Banner[] = position
    ? mockBanners.filter((banner) => banner.position === position)
    : mockBanners
  return { banners }
}

export function listProducts(params: {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
  min_price_cents?: number
  max_price_cents?: number
  sort?: string
  only_in_stock?: boolean
}): ListProductsResponse {
  let list = mockProducts.filter((product) => product.status === 'PRODUCT_STATUS_ON_SHELF')

  if (params.category_id) {
    const chain = categoryChain(params.category_id)
    list = list.filter((product) => chain.includes(product.category_id))
  }
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    list = list.filter(
      (product) =>
        product.title.toLowerCase().includes(keyword) ||
        product.subtitle.toLowerCase().includes(keyword) ||
        product.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    )
  }
  if (params.min_price_cents) {
    list = list.filter((product) => product.max_price_cents >= (params.min_price_cents ?? 0))
  }
  if (params.max_price_cents) {
    list = list.filter((product) => product.min_price_cents <= (params.max_price_cents ?? 0))
  }
  if (params.only_in_stock) {
    list = list.filter((product) => product.stock_total > 0)
  }

  const sorted = [...list]
  switch (params.sort) {
    case 'sales':
      sorted.sort((a, b) => b.sales_count - a.sales_count)
      break
    case 'price_asc':
      sorted.sort((a, b) => a.min_price_cents - b.min_price_cents)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.min_price_cents - a.min_price_cents)
      break
    case 'newest':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    default:
      sorted.sort((a, b) => b.sales_count - a.sales_count)
  }

  const page = paginate(sorted, params.page ?? 1, params.page_size ?? 20)
  return { products: page.list, meta: page.meta }
}

export function productDetail(id: number): ProductDetail {
  const product = mockProducts.find((item) => item.id === id) ?? mockProducts[0]
  const skus = mockSkus.filter((sku) => sku.product_id === product.id)
  const attributes = mockAttributes.filter((item) => item.product_id === product.id)
  const related = mockProducts
    .filter((item) => item.id !== product.id && item.category_id === product.category_id)
    .slice(0, 4)
  const reviews = mockReviews.filter((review) => review.product_id === product.id)
  const good = reviews.filter((review) => review.rating >= 4).length
  const medium = reviews.filter((review) => review.rating === 3).length
  const bad = reviews.filter((review) => review.rating <= 2).length
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0

  return {
    product,
    skus,
    images: [
      { url: product.cover, alt: `${product.title} 主图`, sort: 1 },
      ...skus
        .filter((sku) => sku.image)
        .map((sku, index) => ({ url: sku.image, alt: `${product.title} 细节图 ${index + 1}`, sort: index + 2 })),
    ],
    attributes,
    reviews: [{ total: reviews.length, good, medium, bad, average }],
    review_count: reviews.length,
    review_rating: Number(average.toFixed(2)),
    related,
  }
}

export function listReviews(params: {
  page?: number
  page_size?: number
  product_id?: number
  user_id?: number
  filter?: number
}): ListReviewsResponse {
  let list = mockReviews
  if (params.product_id) {
    list = list.filter((review) => review.product_id === params.product_id)
  }
  if (params.user_id) {
    list = list.filter((review) => review.user_id === params.user_id)
  }
  // filter：0 全部 1 有图 2 好评 3 中差评
  if (params.filter === 1) {
    list = list.filter((review) => review.images.length > 0)
  } else if (params.filter === 2) {
    list = list.filter((review) => review.rating >= 4)
  } else if (params.filter === 3) {
    list = list.filter((review) => review.rating <= 3)
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 10)
  const good = list.filter((review) => review.rating >= 4).length
  const medium = list.filter((review) => review.rating === 3).length
  const bad = list.filter((review) => review.rating <= 2).length
  const average = list.length ? list.reduce((sum, review) => sum + review.rating, 0) / list.length : 0
  return {
    reviews: page.list,
    meta: page.meta,
    summary: { total: list.length, good, medium, bad, average: Number(average.toFixed(2)) },
  }
}

/* ---------------------------------------------------------------------------
 * 购物车
 * --------------------------------------------------------------------------- */
export function getCart(): Cart {
  return buildCart()
}

export function addToCart(req: {
  product_id: number
  sku_id: number
  quantity: number
  selected?: boolean
}): Cart {
  const sku = mockSkus.find((item) => item.id === req.sku_id)
  const product = mockProducts.find((item) => item.id === req.product_id)
  if (!sku || !product) return buildCart()
  const exist = state.cartItems.find(
    (item) => item.product_id === req.product_id && item.sku_id === req.sku_id,
  )
  if (exist) {
    exist.quantity = Math.min(exist.quantity + req.quantity, exist.stock)
    exist.selected = req.selected ?? exist.selected
    exist.available = exist.quantity <= exist.stock
  } else {
    cartSeq += 1
    state.cartItems.push({
      id: cartSeq,
      user_id: mockUser.id,
      product_id: req.product_id,
      sku_id: req.sku_id,
      product_title: product.title,
      spec_text: sku.spec_text,
      image: product.cover,
      price_cents: sku.price_cents,
      quantity: req.quantity,
      stock: sku.stock,
      selected: req.selected ?? true,
      available: req.quantity <= sku.stock,
      subtotal_cents: sku.price_cents * req.quantity,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
  }
  return buildCart()
}

export function updateCartItem(req: { id: number; quantity?: number; selected?: boolean }): Cart {
  const item = state.cartItems.find((entry) => entry.id === req.id)
  if (item) {
    if (typeof req.quantity === 'number') {
      item.quantity = Math.max(1, req.quantity)
      item.available = item.quantity <= item.stock
      item.subtotal_cents = item.price_cents * item.quantity
    }
    if (typeof req.selected === 'boolean') item.selected = req.selected
    item.updated_at = nowIso()
  }
  return buildCart()
}

export function removeCartItem(id: number): OperationResult {
  state.cartItems = state.cartItems.filter((item) => item.id !== id)
  return { success: true, message: '已移除商品' }
}

export function clearCart(): OperationResult {
  state.cartItems = []
  return { success: true, message: '购物车已清空' }
}

export function setAllSelected(selected: boolean): Cart {
  state.cartItems.forEach((item) => {
    item.selected = selected
  })
  return buildCart()
}

export function getCartCount(): { count: number } {
  return { count: state.cartItems.reduce((sum, item) => sum + item.quantity, 0) }
}

/* ---------------------------------------------------------------------------
 * 用户域
 * --------------------------------------------------------------------------- */
export function login(req: { username: string }): AuthResponse {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 7200,
    token_type: 'Bearer',
    user: { ...mockUser, username: req.username || mockUser.username },
    permissions: [],
  }
}

export function register(req: { username: string; nickname?: string; phone?: string }): AuthResponse {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 7200,
    token_type: 'Bearer',
    user: {
      ...mockUser,
      username: req.username,
      nickname: req.nickname || req.username,
      phone: req.phone || mockUser.phone,
    },
    permissions: [],
  }
}

export function getProfile(): User {
  return { ...mockUser }
}

export function updateProfile(payload: Partial<User>): User {
  Object.assign(mockUser, payload)
  return { ...mockUser }
}

export function listAddresses(): { addresses: Address[] } {
  return { addresses: state.addresses }
}

export function saveAddress(payload: Partial<Address>): Address {
  if (payload.id) {
    const exist = state.addresses.find((address) => address.id === payload.id)
    if (exist) {
      Object.assign(exist, payload)
      return { ...exist }
    }
  }
  const id = Math.max(0, ...state.addresses.map((address) => address.id)) + 1
  const address: Address = {
    id,
    receiver: payload.receiver ?? '',
    phone: payload.phone ?? '',
    province: payload.province ?? '',
    city: payload.city ?? '',
    district: payload.district ?? '',
    detail: payload.detail ?? '',
    postal_code: payload.postal_code ?? '',
    tag: payload.tag ?? '家',
    is_default: payload.is_default ?? state.addresses.length === 0,
  }
  if (address.is_default) {
    state.addresses.forEach((item) => {
      item.is_default = false
    })
  }
  state.addresses.push(address)
  return { ...address }
}

export function deleteAddress(id: number): OperationResult {
  state.addresses = state.addresses.filter((address) => address.id !== id)
  return { success: true, message: '地址已删除' }
}

export function setDefaultAddress(id: number): OperationResult {
  state.addresses.forEach((address) => {
    address.is_default = address.id === id
  })
  return { success: true, message: '已设为默认地址' }
}

export function listFavorites(page = 1, pageSize = 20): ListFavoritesResponse {
  const result = paginate(state.favorites, page, pageSize)
  return { products: result.list, meta: result.meta }
}

export function toggleFavorite(productId: number): { favorited: boolean } {
  const index = state.favorites.findIndex((item) => item.product_id === productId)
  if (index >= 0) {
    state.favorites.splice(index, 1)
    return { favorited: false }
  }
  const product = mockProducts.find((item) => item.id === productId)
  if (!product) return { favorited: false }
  state.favorites.unshift({
    id: Date.now(),
    product_id: product.id,
    title: product.title,
    cover: product.cover,
    price_cents: product.min_price_cents,
    created_at: nowIso(),
  })
  return { favorited: true }
}

/* ---------------------------------------------------------------------------
 * 订单域
 * --------------------------------------------------------------------------- */
export function listOrders(params: {
  page?: number
  page_size?: number
  status?: number
  keyword?: string
}): ListOrdersResponse {
  let list = [...state.orders]
  if (params.status) {
    const target = `ORDER_STATUS_${params.status}`
    list = list.filter((order) => order.status === target)
  }
  if (params.keyword) {
    list = list.filter((order) => order.order_no.includes(params.keyword as string))
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 10)
  return {
    orders: page.list,
    meta: page.meta,
    pending_payment_count: state.orders.filter((o) => o.status === 'ORDER_STATUS_PENDING_PAYMENT').length,
    pending_shipment_count: state.orders.filter((o) => o.status === 'ORDER_STATUS_PAID').length,
    pending_receipt_count: state.orders.filter((o) => o.status === 'ORDER_STATUS_SHIPPED').length,
    refunding_count: state.orders.filter((o) => o.status === 'ORDER_STATUS_REFUNDING').length,
  }
}

export function orderDetail(id: number): OrderDetail {
  const order = state.orders.find((item) => item.id === id) ?? state.orders[0]
  const items = state.orderItems.filter((item) => item.order_id === order.id)
  const logs = mockOrderLogs.filter((log) => log.order_id === order.id)
  const shipment = mockShipments.find((item) => item.order_id === order.id)
  return {
    order,
    items,
    logs,
    coupon_id: 0,
    coupon_name: '',
    payment_id: mockPayments.find((item) => item.order_id === order.id)?.id ?? 0,
    shipment_id: shipment?.id ?? 0,
    tracking_no: shipment?.tracking_no ?? '',
    logistics_company: shipment?.company ?? '',
    logistics_tracks: mockShipmentTracks
      .filter((track) => track.shipment_id === shipment?.id)
      .map((track) => track.description),
    can_cancel: order.status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_pay: order.status === 'ORDER_STATUS_PENDING_PAYMENT',
    can_confirm: order.status === 'ORDER_STATUS_SHIPPED',
    can_refund: order.status === 'ORDER_STATUS_PAID' || order.status === 'ORDER_STATUS_SHIPPED',
    can_review: order.status === 'ORDER_STATUS_COMPLETED',
  }
}

export function listOrderLogs(orderId: number): { logs: OrderStatusLog[] } {
  return { logs: mockOrderLogs.filter((log) => log.order_id === orderId) }
}

export function getOrderCount(): OrderCount {
  return {
    pending_payment: state.orders.filter((o) => o.status === 'ORDER_STATUS_PENDING_PAYMENT').length,
    pending_shipment: state.orders.filter((o) => o.status === 'ORDER_STATUS_PAID').length,
    pending_receipt: state.orders.filter((o) => o.status === 'ORDER_STATUS_SHIPPED').length,
    refunding: state.orders.filter((o) => o.status === 'ORDER_STATUS_REFUNDING').length,
  }
}

export function createOrder(req: {
  items?: { product_id: number; sku_id: number; quantity: number }[]
  from_cart?: boolean
  cart_item_ids?: number[]
  address_id: number
  coupon_id?: number
  remark?: string
  payment_method?: string
}): Order {
  const sourceItems = req.from_cart
    ? state.cartItems
        .filter((item) => (req.cart_item_ids?.length ? req.cart_item_ids.includes(item.id) : item.selected))
        .map((item) => ({
          product_id: item.product_id,
          sku_id: item.sku_id,
          quantity: item.quantity,
          price_cents: item.price_cents,
        }))
    : (req.items ?? []).map((item) => {
        const sku = mockSkus.find((entry) => entry.id === item.sku_id)
        return {
          product_id: item.product_id,
          sku_id: item.sku_id,
          quantity: item.quantity,
          price_cents: sku?.price_cents ?? 0,
        }
      })

  const totalAmount = sourceItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0)
  const coupon = state.userCoupons.find(
    (item) => item.coupon_id === req.coupon_id && item.status === 'USER_COUPON_STATUS_UNUSED',
  )
  const discount = coupon ? Math.min(coupon.coupon.face_value_cents, totalAmount) : 0
  const address = state.addresses.find((item) => item.id === req.address_id) ?? state.addresses[0]

  orderSeq += 1
  const order: Order = {
    id: orderSeq,
    order_no: `SS${Date.now()}`,
    user_id: mockUser.id,
    user_nickname: mockUser.nickname,
    status: 'ORDER_STATUS_PENDING_PAYMENT',
    total_amount_cents: totalAmount,
    discount_cents: discount,
    freight_cents: 0,
    payable_cents: totalAmount - discount,
    paid_cents: 0,
    refunded_cents: 0,
    item_count: sourceItems.length,
    total_quantity: sourceItems.reduce((sum, item) => sum + item.quantity, 0),
    address: address ?? mockAddresses[0],
    remark: req.remark ?? '',
    payment_method: req.payment_method ?? 'wechat',
    paid_at: '',
    shipped_at: '',
    completed_at: '',
    cancelled_at: '',
    created_at: nowIso(),
    updated_at: nowIso(),
    admin_remark: '',
    shipment_id: 0,
  }
  state.orders.unshift(order)

  sourceItems.forEach((item) => {
    state.orderItems.push({
      id: state.orderItems.length + 1,
      order_id: order.id,
      product_id: item.product_id,
      sku_id: item.sku_id,
      product_title: mockProducts.find((p) => p.id === item.product_id)?.title ?? '',
      spec_text: mockSkus.find((s) => s.id === item.sku_id)?.spec_text ?? '',
      image: mockProducts.find((p) => p.id === item.product_id)?.cover ?? '',
      price_cents: item.price_cents,
      quantity: item.quantity,
      subtotal_cents: item.price_cents * item.quantity,
      refunded_cents: 0,
      reviewed: false,
    })
  })

  if (req.from_cart) {
    const usedIds = req.cart_item_ids?.length
      ? req.cart_item_ids
      : state.cartItems.filter((item) => item.selected).map((item) => item.id)
    state.cartItems = state.cartItems.filter((item) => !usedIds.includes(item.id))
  }
  if (coupon) {
    coupon.status = 'USER_COUPON_STATUS_USED'
    coupon.order_id = order.id
  }
  return order
}

export function cancelOrder(orderId: number, reason?: string): Order {
  const order = state.orders.find((item) => item.id === orderId)
  if (order) {
    order.status = 'ORDER_STATUS_CANCELLED'
    order.cancelled_at = nowIso()
    order.updated_at = nowIso()
    mockOrderLogs.push({
      id: mockOrderLogs.length + 1,
      order_id: orderId,
      from_status: 1,
      to_status: 5,
      action: 'cancel',
      operator: mockUser.nickname,
      remark: reason || '用户主动取消',
      created_at: nowIso(),
    })
  }
  return order ?? state.orders[0]
}

export function confirmReceipt(orderId: number): Order {
  const order = state.orders.find((item) => item.id === orderId)
  if (order) {
    order.status = 'ORDER_STATUS_COMPLETED'
    order.completed_at = nowIso()
    order.updated_at = nowIso()
    mockOrderLogs.push({
      id: mockOrderLogs.length + 1,
      order_id: orderId,
      from_status: 3,
      to_status: 4,
      action: 'confirm',
      operator: mockUser.nickname,
      remark: '确认收货',
      created_at: nowIso(),
    })
  }
  return order ?? state.orders[0]
}

export function applyRefund(req: {
  order_id: number
  item_ids?: number[]
  amount_cents?: number
  reason?: string
  description?: string
}): Refund {
  const order = state.orders.find((item) => item.id === req.order_id)
  if (order) {
    order.status = 'ORDER_STATUS_REFUNDING'
    order.updated_at = nowIso()
  }
  return {
    id: Date.now(),
    refund_no: `RF${Date.now()}`,
    order_id: req.order_id,
    order_no: order?.order_no ?? '',
    user_id: mockUser.id,
    amount_cents: req.amount_cents ?? order?.payable_cents ?? 0,
    reason: req.reason ?? '',
    description: req.description ?? '',
    item_ids: req.item_ids ?? [],
    status: 0,
    admin_remark: '',
    created_at: nowIso(),
    processed_at: '',
  }
}

/* ---------------------------------------------------------------------------
 * 支付域
 * --------------------------------------------------------------------------- */
export function createPayment(req: {
  order_id: number
  channel: number
}): Payment {
  const order = state.orders.find((item) => item.id === req.order_id)
  paymentSeq += 1
  const channelMap = ['PAYMENT_CHANNEL_UNSPECIFIED', 'PAYMENT_CHANNEL_WECHAT', 'PAYMENT_CHANNEL_ALIPAY', 'PAYMENT_CHANNEL_BALANCE']
  const channel = channelMap[req.channel] ?? 'PAYMENT_CHANNEL_WECHAT'
  const payment: Payment = {
    id: paymentSeq,
    payment_no: `PAY${Date.now()}`,
    order_id: req.order_id,
    order_no: order?.order_no ?? '',
    user_id: mockUser.id,
    amount_cents: order?.payable_cents ?? 0,
    refunded_cents: 0,
    status: 'PAYMENT_STATUS_PENDING',
    channel: channel as Payment['channel'],
    transaction_id: '',
    prepay_id: `prepay-${paymentSeq}`,
    pay_params: {
      appId: 'wxshopstackdemo',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: `nonce${paymentSeq}`,
      package: `prepay_id=prepay-${paymentSeq}`,
      signType: 'RSA',
      paySign: 'demo-signature',
    },
    fail_reason: '',
    paid_at: '',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  state.payments.unshift(payment)
  return { ...payment }
}

export function queryPayment(params: { payment_id?: number; order_id?: number }): Payment {
  const payment =
    state.payments.find((item) => item.id === params.payment_id) ??
    state.payments.find((item) => item.order_id === params.order_id) ??
    createPayment({ order_id: params.order_id ?? 0, channel: 1 })
  return { ...payment }
}

/**
 * 模拟支付回调：把支付单置为成功，并把订单推进到「待发货」
 */
export function notifyPayment(payload: {
  payment_no?: string
  status?: number
  transaction_id?: string
}): OperationResult {
  const payment = payload.payment_no
    ? state.payments.find((item) => item.payment_no === payload.payment_no)
    : state.payments[0]
  if (!payment) return { success: false, message: '支付单不存在' }
  payment.status = payload.status === 3 ? 'PAYMENT_STATUS_FAILED' : 'PAYMENT_STATUS_SUCCESS'
  payment.transaction_id = payload.transaction_id || `txn${Date.now()}`
  payment.paid_at = nowIso()
  payment.updated_at = nowIso()
  if (payment.status === 'PAYMENT_STATUS_SUCCESS') {
    const order = state.orders.find((item) => item.id === payment.order_id)
    if (order && order.status === 'ORDER_STATUS_PENDING_PAYMENT') {
      order.status = 'ORDER_STATUS_PAID'
      order.paid_cents = order.payable_cents
      order.paid_at = nowIso()
      order.updated_at = nowIso()
    }
  }
  return { success: true, message: '支付回调处理成功' }
}

/* ---------------------------------------------------------------------------
 * 营销域
 * --------------------------------------------------------------------------- */
export function listUserCoupons(params: { status?: number; page?: number }): ListUserCouponsResponse {
  let list = state.userCoupons
  if (params.status) {
    const target = `USER_COUPON_STATUS_${['UNUSED', 'USED', 'EXPIRED'][params.status - 1]}`
    list = list.filter((item) => item.status === target)
  }
  const page = paginate(list, params.page ?? 1, 20)
  return {
    coupons: page.list,
    meta: page.meta,
    available_count: state.userCoupons.filter((item) => item.status === 'USER_COUPON_STATUS_UNUSED')
      .length,
  }
}

export function previewCheckout(req: {
  items?: { sku_id: number; product_id: number; quantity: number; price_cents: number }[]
  coupon_id?: number
  points_used?: number
}): PreviewCheckoutResponse {
  const items = req.items ?? []
  const totalAmount = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0)
  const coupon = state.userCoupons.find(
    (item) => item.coupon_id === req.coupon_id && item.status === 'USER_COUPON_STATUS_UNUSED',
  )
  let couponDiscount = 0
  if (coupon) {
    if (coupon.coupon.type === 'COUPON_TYPE_FIXED') {
      couponDiscount = Math.min(coupon.coupon.face_value_cents, totalAmount)
    } else if (coupon.coupon.type === 'COUPON_TYPE_PERCENT') {
      couponDiscount = Math.min(
        Math.round((totalAmount * (100 - coupon.coupon.percent)) / 100),
        coupon.coupon.max_discount_cents,
      )
    } else {
      couponDiscount = 0
    }
  }
  const pointsDiscount = Math.min((req.points_used ?? 0) * 100, mockUser.points * 100, totalAmount)
  const freight = totalAmount >= 9900 ? 0 : 800
  const available = state.userCoupons.filter(
    (item) =>
      item.status === 'USER_COUPON_STATUS_UNUSED' &&
      item.coupon.min_amount_cents <= totalAmount,
  )
  return {
    total_amount_cents: totalAmount,
    discount_cents: couponDiscount + pointsDiscount,
    coupon_discount_cents: couponDiscount,
    points_discount_cents: pointsDiscount,
    freight_cents: freight,
    payable_cents: Math.max(0, totalAmount - couponDiscount - pointsDiscount + freight),
    available_coupons: available,
    active_promotions: mockPromotions,
  }
}

export function listPromotions(): { promotions: typeof mockPromotions; meta: { page: number; page_size: number; total: number; total_pages: number } } {
  return {
    promotions: mockPromotions,
    meta: { page: 1, page_size: mockPromotions.length, total: mockPromotions.length, total_pages: 1 },
  }
}

/* ---------------------------------------------------------------------------
 * 物流域
 * --------------------------------------------------------------------------- */
export function shipmentTracks(orderId: number): ListShipmentTracksResponse {
  const shipment = mockShipments.find((item) => item.order_id === orderId)
  const tracks = mockShipmentTracks.filter((track) => track.shipment_id === shipment?.id)
  return {
    shipment: shipment ?? {
      id: 0,
      order_id: orderId,
      order_no: '',
      tracking_no: '',
      company: '',
      company_code: '',
      status: 'SHIPMENT_STATUS_PENDING',
      receiver: '',
      phone: '',
      address: '',
      freight_cents: 0,
      item_count: 0,
      shipped_at: '',
      delivered_at: '',
      created_at: '',
      remark: '',
    },
    tracks,
  }
}

/* ---------------------------------------------------------------------------
 * 通知域
 * --------------------------------------------------------------------------- */
export function listNotifications(params: { unread_only?: boolean; page?: number }): ListNotificationsResponse {
  let list = state.notifications
  if (params.unread_only) {
    list = list.filter((item) => !item.read)
  }
  const page = paginate(list, params.page ?? 1, 20)
  return {
    notifications: page.list,
    meta: page.meta,
    unread_count: state.notifications.filter((item) => !item.read).length,
  }
}

export function markNotificationRead(id: number): OperationResult {
  const item = state.notifications.find((entry) => entry.id === id)
  if (item) {
    item.read = true
    item.read_at = nowIso()
  }
  return { success: true, message: '已读' }
}

export function markAllNotificationsRead(): OperationResult {
  state.notifications.forEach((item) => {
    item.read = true
    item.read_at = nowIso()
  })
  return { success: true, message: '全部已读' }
}

export function unreadCount(): { count: number } {
  return { count: state.notifications.filter((item) => !item.read).length }
}

/* ---------------------------------------------------------------------------
 * 积分明细
 * --------------------------------------------------------------------------- */
export function listPointsLogs(params: { page?: number; page_size?: number }): {
  logs: PointsLog[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
  current_points: number
} {
  const page = paginate(mockPointsLogs, params.page ?? 1, params.page_size ?? 20)
  return {
    logs: page.list,
    meta: page.meta,
    current_points: mockUser.points,
  }
}

/* ---------------------------------------------------------------------------
 * 发票
 * --------------------------------------------------------------------------- */
export function listInvoices(params: { page?: number; page_size?: number; status?: number }): {
  invoices: Invoice[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
} {
  let list = mockInvoices
  if (params.status !== undefined) {
    list = list.filter((invoice) => invoice.status === params.status)
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { invoices: page.list, meta: page.meta }
}

export function createInvoice(payload: {
  order_no: string
  title: string
  tax_no?: string
  type?: string
  email?: string
  amount_cents?: number
  remark?: string
}): Invoice {
  const invoice: Invoice = {
    id: Date.now(),
    user_id: mockUser.id,
    order_no: payload.order_no,
    title: payload.title,
    tax_no: payload.tax_no ?? '',
    type: payload.type ?? 'personal',
    email: payload.email ?? '',
    amount_cents: payload.amount_cents ?? 0,
    status: 0,
    invoice_url: '',
    remark: payload.remark ?? '',
    created_at: nowIso(),
  }
  mockInvoices.unshift(invoice)
  return { ...invoice }
}

/* ---------------------------------------------------------------------------
 * 领券中心
 * --------------------------------------------------------------------------- */
export function listPlatformCoupons(params: { page?: number; page_size?: number }): {
  coupons: Coupon[]
  meta: { page: number; page_size: number; total: number; total_pages: number }
} {
  const list = mockCoupons.filter((coupon) => coupon.enabled)
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { coupons: page.list, meta: page.meta }
}

export function receiveCoupon(couponId: number): UserCoupon {
  const coupon = mockCoupons.find((item) => item.id === couponId) ?? mockCoupons[0]
  const exist = state.userCoupons.find(
    (item) => item.coupon_id === coupon.id && item.status === 'USER_COUPON_STATUS_UNUSED',
  )
  if (exist) return { ...exist }
  const userCoupon: UserCoupon = {
    id: Date.now(),
    user_id: mockUser.id,
    coupon_id: coupon.id,
    coupon: { ...coupon },
    status: 'USER_COUPON_STATUS_UNUSED',
    order_id: 0,
    received_at: nowIso(),
    used_at: '',
  }
  state.userCoupons.unshift(userCoupon)
  coupon.received_quantity += 1
  return { ...userCoupon }
}

/* ---------------------------------------------------------------------------
 * 可变的扩展演示状态（阶段 3 扩量）
 * --------------------------------------------------------------------------- */
const extState = {
  channels: mockChannels.map((item) => ({ ...item })) as Channel[],
  productQuestions: mockProductQuestions.map((item) => ({ ...item })) as ProductQuestion[],
  reviewTags: mockReviewTags.map((item) => ({ ...item })) as ReviewTag[],
  signInCalendar: mockSignInCalendar.map((item) => ({ ...item })),
  signedToday: false,
  tasks: mockUserTasks.map((item) => ({ ...item })) as UserTask[],
  sessions: mockPromotionSessions.map((item) => ({ ...item })) as PromotionSession[],
  groupBuys: mockGroupBuys.map((item) => ({ ...item })) as GroupBuy[],
  groupBuyMembers: mockGroupBuyMembers.map((item) => ({ ...item })) as GroupBuyMember[],
  growthLogs: mockGrowthLogs.map((item) => ({ ...item })) as GrowthLog[],
  invoiceTemplates: mockInvoiceTemplates.map((item) => ({ ...item })) as InvoiceTemplate[],
  notificationSettings: { ...mockNotificationSettings } as UserNotificationSettings,
  accountSecurity: { ...mockAccountSecurity } as AccountSecurityInfo,
  feedbacks: mockFeedbacks.map((item) => ({ ...item })) as Feedback[],
  afterSales: mockAfterSales.map((item) => ({ ...item })) as AfterSale[],
  recharges: mockRecharges.map((item) => ({ ...item })) as RechargeOrder[],
}

let extSeq = 100

/* ---------------------------------------------------------------------------
 * 频道
 * --------------------------------------------------------------------------- */
export function listChannels(params: {
  page?: number
  page_size?: number
  keyword?: string
  type?: number
}): ListChannelsResponse {
  let list = extState.channels.filter((item) => item.status === 1)
  if (params.type) list = list.filter((item) => item.type === params.type)
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    list = list.filter(
      (item) => item.name.toLowerCase().includes(keyword) || item.code.includes(keyword),
    )
  }
  const sorted = [...list].sort((a, b) => a.sort - b.sort)
  const page = paginate(sorted, params.page ?? 1, params.page_size ?? 20)
  return { channels: page.list, meta: page.meta }
}

export function getChannel(id: number): Channel {
  return extState.channels.find((item) => item.id === id) ?? extState.channels[0]
}

/** 频道商品：按频道顺序轮流取商品，保证每个频道都有内容 */
export function listChannelProducts(
  channelId: number,
  params: { page?: number; page_size?: number; keyword?: string; sort?: string },
): ListChannelProductsResponse {
  const channel = getChannel(channelId)
  const onShelf = mockProducts.filter((product) => product.status === 'PRODUCT_STATUS_ON_SHELF')
  let list = onShelf.filter((_, index) => index % extState.channels.length === (channel.id - 1) % extState.channels.length)
  if (!list.length) list = onShelf
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    list = list.filter(
      (product) =>
        product.title.toLowerCase().includes(keyword) ||
        product.subtitle.toLowerCase().includes(keyword) ||
        product.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    )
  }
  const sorted = [...list]
  switch (params.sort) {
    case 'sales':
      sorted.sort((a, b) => b.sales_count - a.sales_count)
      break
    case 'price_asc':
      sorted.sort((a, b) => a.min_price_cents - b.min_price_cents)
      break
    case 'price_desc':
      sorted.sort((a, b) => b.min_price_cents - a.min_price_cents)
      break
    case 'newest':
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    default:
      sorted.sort((a, b) => a.id - b.id)
  }
  const page = paginate(sorted, params.page ?? 1, params.page_size ?? 20)
  return { channel, products: page.list, meta: page.meta }
}

/* ---------------------------------------------------------------------------
 * 商品参数 / 问答
 * --------------------------------------------------------------------------- */
export function listProductParams(productId: number): ListProductParamsResponse {
  const attrs = mockAttributes.filter((item) => item.product_id === productId)
  const list = attrs.length
    ? attrs
    : mockAttributes.slice(0, 4).map((item, index) => ({
        ...item,
        id: index + 1,
        product_id: productId,
      }))
  return { params: list }
}

export function listProductQuestions(
  productId: number,
  params: { page?: number; page_size?: number },
): ListProductQuestionsResponse {
  let list = extState.productQuestions
  if (productId) {
    const filtered = list.filter((item) => item.product_id === productId)
    if (filtered.length) list = filtered
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 10)
  return { questions: page.list, meta: page.meta }
}

export function listReviewTags(params: { page?: number; page_size?: number }): ListReviewTagsResponse {
  const page = paginate(extState.reviewTags, params.page ?? 1, params.page_size ?? 20)
  return { tags: page.list, meta: page.meta }
}

/* ---------------------------------------------------------------------------
 * 签到 / 任务
 * --------------------------------------------------------------------------- */
export function getSignInStatus(): SignInStatus {
  const signedDays = extState.signInCalendar.filter((day) => day.signed).length
  return {
    signed_today: extState.signedToday,
    continuous_days: extState.signedToday ? 19 : 18,
    total_days: signedDays,
    points_awarded: extState.signedToday ? 5 : 0,
    next_points: 5,
    calendar: extState.signInCalendar,
  }
}

export function signIn(): SignInStatus {
  if (!extState.signedToday) {
    extState.signedToday = true
    const today = extState.signInCalendar[extState.signInCalendar.length - 1]
    if (today) today.signed = true
  }
  return getSignInStatus()
}

export function listTasks(params: { page?: number; page_size?: number }): ListTasksResponse {
  const page = paginate(extState.tasks, params.page ?? 1, params.page_size ?? 20)
  return { tasks: page.list, meta: page.meta }
}

export function claimTask(taskId: number): UserTask {
  const task = extState.tasks.find((item) => item.task_id === taskId)
  if (task) {
    task.completed = true
    task.claimed = true
    task.progress = task.target_count
  }
  return task ?? extState.tasks[0]
}

/* ---------------------------------------------------------------------------
 * 活动场次 / 拼团
 * --------------------------------------------------------------------------- */
export function listPromotionSessions(
  promotionId: number,
  params: { page?: number; page_size?: number },
): { sessions: PromotionSession[]; meta: { page: number; page_size: number; total: number; total_pages: number } } {
  let list = extState.sessions
  if (promotionId) {
    const filtered = list.filter((item) => item.promotion_id === promotionId)
    if (filtered.length) list = filtered
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { sessions: page.list, meta: page.meta }
}

export function listGroupBuys(params: {
  page?: number
  page_size?: number
  keyword?: string
  status?: number
}): ListGroupBuysResponse {
  let list = extState.groupBuys
  if (params.status) list = list.filter((item) => item.status === params.status)
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) || item.product_title.toLowerCase().includes(keyword),
    )
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { group_buys: page.list, meta: page.meta }
}

export function getGroupBuy(id: number): {
  group_buy: GroupBuy
  members: GroupBuyMember[]
} {
  const groupBuy = extState.groupBuys.find((item) => item.id === id) ?? extState.groupBuys[0]
  return {
    group_buy: groupBuy,
    members: extState.groupBuyMembers.filter((item) => item.group_buy_id === groupBuy.id),
  }
}

export function joinGroupBuy(id: number, quantity = 1): GroupBuy {
  const groupBuy = extState.groupBuys.find((item) => item.id === id)
  if (groupBuy) {
    groupBuy.joined_members += quantity
    extState.groupBuyMembers.push({
      id: (extState.groupBuyMembers.length += 1),
      group_buy_id: groupBuy.id,
      user_id: mockUser.id,
      user_nickname: mockUser.nickname,
      joined_at: nowIso(),
    })
  }
  return groupBuy ?? extState.groupBuys[0]
}

/* ---------------------------------------------------------------------------
 * 会员等级 / 成长值 / 区域
 * --------------------------------------------------------------------------- */
export function listUserLevels(): { levels: UserLevel[] } {
  return { levels: mockUserLevels }
}

export function getUserLevel(): UserLevelInfo {
  const growth = extState.growthLogs.length
    ? extState.growthLogs[0].balance
    : mockUser.points
  const current = [...mockUserLevels].reverse().find((item) => growth >= item.min_growth) ?? mockUserLevels[0]
  const next = mockUserLevels.find((item) => item.min_growth > current.min_growth) ?? null
  return {
    level: current.level,
    level_name: current.name,
    growth,
    current_min_growth: current.min_growth,
    next_min_growth: next?.min_growth ?? current.min_growth,
    growth_to_next: next ? Math.max(0, next.min_growth - growth) : 0,
    discount_percent: current.discount_percent,
    next_level_name: next?.name ?? '',
    levels: mockUserLevels,
  }
}

export function listGrowthLogs(params: {
  page?: number
  page_size?: number
}): ListGrowthLogsResponse {
  const page = paginate(extState.growthLogs, params.page ?? 1, params.page_size ?? 20)
  return {
    logs: page.list,
    meta: page.meta,
    current_growth: page.list[0]?.balance ?? mockUser.points,
  }
}

export function listRegions(params: { parent_id?: number; tree?: boolean }): ListRegionsResponse {
  if (params.parent_id) {
    return { regions: mockRegions.filter((item) => item.parent_id === params.parent_id) }
  }
  const provinces = mockRegions.filter((item) => item.level === 1)
  if (!params.tree) return { regions: provinces }
  return {
    regions: provinces.map((province) => ({
      ...province,
      children: mockRegions.filter((item) => item.parent_id === province.id),
    })),
  }
}

/* ---------------------------------------------------------------------------
 * 发票抬头模板 / 通知设置 / 账号安全
 * --------------------------------------------------------------------------- */
export function listInvoiceTemplates(): ListInvoiceTemplatesResponse {
  return { templates: extState.invoiceTemplates }
}

export function saveInvoiceTemplate(payload: {
  id?: number
  title: string
  tax_no?: string
  type?: string
  email?: string
  phone?: string
  address?: string
  bank_name?: string
  bank_account?: string
  is_default?: boolean
}): InvoiceTemplate {
  if (payload.id) {
    const exist = extState.invoiceTemplates.find((item) => item.id === payload.id)
    if (exist) {
      Object.assign(exist, payload)
      return { ...exist }
    }
  }
  extSeq += 1
  const template: InvoiceTemplate = {
    id: extSeq,
    user_id: mockUser.id,
    title: payload.title,
    tax_no: payload.tax_no ?? '',
    type: payload.type ?? 'personal',
    email: payload.email ?? '',
    phone: payload.phone ?? '',
    address: payload.address ?? '',
    bank_name: payload.bank_name ?? '',
    bank_account: payload.bank_account ?? '',
    is_default: payload.is_default ?? extState.invoiceTemplates.length === 0,
    created_at: nowIso(),
  }
  if (template.is_default) {
    extState.invoiceTemplates.forEach((item) => {
      item.is_default = false
    })
  }
  extState.invoiceTemplates.push(template)
  return { ...template }
}

export function deleteInvoiceTemplate(id: number): OperationResult {
  extState.invoiceTemplates = extState.invoiceTemplates.filter((item) => item.id !== id)
  return { success: true, message: '发票抬头已删除' }
}

export function getNotificationSettings(): UserNotificationSettings {
  return { ...extState.notificationSettings }
}

export function updateNotificationSettings(
  payload: Partial<UserNotificationSettings>,
): UserNotificationSettings {
  Object.assign(extState.notificationSettings, payload)
  return { ...extState.notificationSettings }
}

export function getAccountSecurity(): AccountSecurityInfo {
  return { ...extState.accountSecurity, warnings: [...extState.accountSecurity.warnings] }
}

export function submitRealName(payload: { real_name: string; id_card: string }): OperationResult {
  extState.accountSecurity.realname_verified = true
  extState.accountSecurity.risk_level = 0
  extState.accountSecurity.warnings = extState.accountSecurity.warnings.filter(
    (item) => !item.includes('实名认证'),
  )
  return { success: true, message: `实名认证已提交：${payload.real_name}` }
}

export function submitFeedback(payload: {
  type?: number
  content: string
  images?: string[]
  contact?: string
}): Feedback {
  extSeq += 1
  const feedback: Feedback = {
    id: extSeq,
    user_id: mockUser.id,
    user_nickname: mockUser.nickname,
    type: payload.type ?? 4,
    content: payload.content,
    images: payload.images ?? [],
    contact: payload.contact ?? '',
    status: 0,
    reply: '',
    created_at: nowIso(),
    processed_at: '',
  }
  extState.feedbacks.unshift(feedback)
  return { ...feedback }
}

/* ---------------------------------------------------------------------------
 * 帮助中心
 * --------------------------------------------------------------------------- */
export function listHelpArticles(params: {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
}): ListHelpArticlesResponse {
  let list = mockHelpArticles.filter((item) => item.enabled)
  if (params.category_id) list = list.filter((item) => item.category_id === params.category_id)
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase()
    list = list.filter(
      (item) => item.title.toLowerCase().includes(keyword) || item.content.toLowerCase().includes(keyword),
    )
  }
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { articles: page.list, meta: page.meta }
}

export function getHelpArticle(id: number): HelpArticle {
  return mockHelpArticles.find((item) => item.id === id) ?? mockHelpArticles[0]
}

/* ---------------------------------------------------------------------------
 * 售后工单 / 退款原因
 * --------------------------------------------------------------------------- */
export function listAfterSales(params: {
  page?: number
  page_size?: number
  status?: number
  type?: number
}): ListAfterSalesResponse {
  let list = extState.afterSales
  if (params.status !== undefined) list = list.filter((item) => item.status === params.status)
  if (params.type) list = list.filter((item) => item.type === params.type)
  const page = paginate(list, params.page ?? 1, params.page_size ?? 20)
  return { after_sales: page.list, meta: page.meta }
}

export function getAfterSale(id: number): AfterSale {
  return extState.afterSales.find((item) => item.id === id) ?? extState.afterSales[0]
}

export function listRefundReasons(type?: number): ListRefundReasonsResponse {
  const list = type
    ? mockRefundReasons.filter((item) => item.type === type && item.enabled)
    : mockRefundReasons.filter((item) => item.enabled)
  return { reasons: list }
}

/* ---------------------------------------------------------------------------
 * 充值 / 运费试算 / 通知分类
 * --------------------------------------------------------------------------- */
export function getRechargeConfig(): RechargeConfig {
  return { ...mockRechargeConfig, preset_amounts: [...mockRechargeConfig.preset_amounts] }
}

export function createRecharge(payload: { amount_cents: number; channel?: number }): RechargeOrder {
  extSeq += 1
  const order: RechargeOrder = {
    id: extSeq,
    recharge_no: `RC${Date.now()}`,
    user_id: mockUser.id,
    amount_cents: payload.amount_cents,
    bonus_cents: payload.amount_cents >= 10000 ? 500 : 0,
    status: 0,
    channel: payload.channel ?? 1,
    payment_no: '',
    paid_at: '',
    created_at: nowIso(),
  }
  extState.recharges.unshift(order)
  return { ...order }
}

export function calculateFreight(payload: {
  amount_cents?: number
  region?: string
  quantity?: number
}): FreightQuote {
  const amount = payload.amount_cents ?? 0
  const quantity = payload.quantity ?? 1
  const freeThreshold = 9900
  const base = payload.region ? 1200 : 800
  const freight = amount >= freeThreshold ? 0 : base * Math.max(1, Math.min(quantity, 5))
  return {
    freight_cents: freight,
    free_freight_amount_cents: freeThreshold,
    free: freight === 0,
    template_name: payload.region ? `${payload.region} 配送模板` : '默认配送模板',
    remark:
      freight === 0
        ? `订单满 ${(freeThreshold / 100).toFixed(0)} 元免运费`
        : `未满 ${(freeThreshold / 100).toFixed(0)} 元，还差 ${((freeThreshold - amount) / 100).toFixed(2)} 元免运费`,
  }
}

export function listNotificationCategories(): ListNotificationCategoriesResponse {
  const categories: NotificationCategory[] = [
    { type: 1, name: '订单消息', icon: '📦', count: 0, unread_count: 0 },
    { type: 2, name: '物流消息', icon: '🚚', count: 0, unread_count: 0 },
    { type: 3, name: '优惠活动', icon: '🎁', count: 0, unread_count: 0 },
    { type: 4, name: '系统通知', icon: '🔔', count: 0, unread_count: 0 },
  ]
  categories.forEach((category) => {
    const items = state.notifications.filter(
      (item) => item.type === `NOTIFICATION_TYPE_${['UNSPECIFIED', 'ORDER', 'LOGISTICS', 'PROMOTION', 'SYSTEM'][category.type]}`,
    )
    category.count = items.length
    category.unread_count = items.filter((item) => !item.read).length
  })
  return { categories }
}
