/**
 * 接口集合
 * ---------------------------------------------------------------
 * 所有路径均相对网关前缀 /api/v1，字段名与 proto 保持一致（snake_case）。
 * 每个方法都带有 mock 标识：后端未就绪时由 request 层回退到内置演示数据。
 *
 * 分页约定：网关使用 grpc-gateway 解析查询参数，嵌套结构用点号形式传递，
 * 例如 page.page=1&page.page_size=20。页面侧仍传扁平的 page / page_size，
 * 由本层统一转换为点号形式。
 */

const request = require('./request');

/**
 * 构造列表查询参数：把扁平的 page / page_size 转换为点号嵌套形式。
 * @param {object} params 页面传入的查询参数
 * @param {number} [defaultPage] 默认页码
 * @param {number} [defaultPageSize] 默认每页条数
 * @returns {object}
 */
function buildListParams(params, defaultPage, defaultPageSize) {
  const source = params || {};
  const result = {};
  Object.keys(source).forEach((key) => {
    if (key === 'page' || key === 'page_size') {
      return;
    }
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      result[key] = source[key];
    }
  });
  const page = Number(source['page.page'] || source.page) || defaultPage || 1;
  const pageSize = Number(source['page.page_size'] || source.page_size) || defaultPageSize || 20;
  result['page.page'] = page;
  result['page.page_size'] = pageSize;
  return result;
}

const api = {
  // -------------------------------------------------------------------------
  // 商品
  // -------------------------------------------------------------------------
  /**
   * 商品列表。
   * @param {object} params { page, page_size, keyword, category_id, sort, only_in_stock }
   * @returns {Promise<object>} { products, meta }
   */
  listProducts(params) {
    return request.request({ url: '/products', method: 'GET', data: buildListParams(params), mock: 'products' });
  },

  /**
   * 商品详情。
   * @param {number} id 商品 ID
   * @returns {Promise<object>} ProductDetail
   */
  getProduct(id) {
    return request.request({ url: '/products/' + id, method: 'GET', data: { id: id }, mock: 'productDetail' });
  },

  /**
   * 分类列表。
   * @param {object} params { parent_id, tree }
   * @returns {Promise<object>} { categories }
   */
  listCategories(params) {
    return request.request({ url: '/categories', method: 'GET', data: params, mock: 'categories' });
  },

  /**
   * 轮播图列表。
   * @param {string} [position] 位置，如 home_banner
   * @returns {Promise<object>} { banners }
   */
  listBanners(position) {
    return request.request({ url: '/banners', method: 'GET', data: { position: position || '' }, mock: 'banners' });
  },

  /**
   * 评价列表。
   * @param {object} params { page, page_size, product_id, user_id, keyword, filter }
   *        filter 为 int32：0 全部 / 1 有图 / 2 好评 / 3 中差评
   * @returns {Promise<object>} { reviews, meta, summary }
   */
  listReviews(params) {
    return request.request({ url: '/reviews', method: 'GET', data: buildListParams(params), mock: 'reviews', fallbackOnError: true });
  },

  /**
   * 发表评价。
   * @param {object} body { product_id, sku_id, rating, content, images }
   * @returns {Promise<object>} Review
   */
  createReview(body) {
    return request.request({ url: '/reviews', method: 'POST', data: body, mock: 'reviewCreate' });
  },

  // -------------------------------------------------------------------------
  // 购物车
  // -------------------------------------------------------------------------
  /**
   * 获取购物车。
   * @returns {Promise<object>} Cart
   */
  getCart() {
    return request.request({ url: '/cart', method: 'GET', mock: 'cart', fallbackOnError: true });
  },

  /**
   * 加入购物车。
   * @param {object} body { product_id, sku_id, quantity, selected }
   * @returns {Promise<object>} Cart
   */
  addToCart(body) {
    return request.request({ url: '/cart/items', method: 'POST', data: body, mock: 'cartAdd' });
  },

  /**
   * 更新购物车条目（数量 / 选中状态）。
   * @param {number} id 条目 ID
   * @param {object} body { quantity, selected }
   * @returns {Promise<object>} Cart
   */
  updateCartItem(id, body) {
    const data = Object.assign({ id: id }, body);
    return request.request({ url: '/cart/items/' + id, method: 'PUT', data: data, mock: 'cartUpdate' });
  },

  /**
   * 删除购物车条目。
   * @param {number} id 条目 ID
   * @returns {Promise<object>} OperationResult
   */
  removeCartItem(id) {
    return request.request({ url: '/cart/items/' + id, method: 'DELETE', data: { id: id }, mock: 'cartRemove' });
  },

  /**
   * 全选 / 全不选。
   * @param {boolean} selected 是否选中
   * @returns {Promise<object>} Cart
   */
  selectAllCart(selected) {
    return request.request({ url: '/cart/select-all', method: 'PUT', data: { selected: selected }, mock: 'cartSelectAll' });
  },

  /**
   * 清空购物车。
   * @returns {Promise<object>} OperationResult
   */
  clearCart() {
    return request.request({ url: '/cart/clear', method: 'POST', data: {}, mock: 'cartClear' });
  },

  /**
   * 购物车条目数量。
   * @returns {Promise<object>} { count }
   */
  getCartCount() {
    return request.request({ url: '/cart/count', method: 'GET', mock: 'cartCount' });
  },

  // -------------------------------------------------------------------------
  // 订单
  // -------------------------------------------------------------------------
  /**
   * 订单列表。
   * @param {object} params { page, page_size, status, keyword }
   * @returns {Promise<object>} { orders, meta, pending_payment_count, ... }
   */
  listOrders(params) {
    return request.request({ url: '/orders', method: 'GET', data: buildListParams(params), mock: 'orders', fallbackOnError: true });
  },

  /**
   * 订单详情。
   * @param {number} id 订单 ID
   * @returns {Promise<object>} OrderDetail
   */
  getOrder(id) {
    return request.request({ url: '/orders/' + id, method: 'GET', data: { id: id }, mock: 'orderDetail', fallbackOnError: true });
  },

  /**
   * 创建订单。
   * @param {object} body CreateOrderRequest
   * @returns {Promise<object>} Order
   */
  createOrder(body) {
    return request.request({ url: '/orders', method: 'POST', data: body, mock: 'orderCreate' });
  },

  /**
   * 取消订单。
   * @param {number} orderId 订单 ID
   * @param {string} reason 取消原因
   * @returns {Promise<object>} Order
   */
  cancelOrder(orderId, reason) {
    return request.request({ url: '/orders/' + orderId + '/cancel', method: 'POST', data: { order_id: orderId, reason: reason }, mock: 'orderCancel' });
  },

  /**
   * 确认收货。
   * @param {number} orderId 订单 ID
   * @returns {Promise<object>} Order
   */
  confirmReceipt(orderId) {
    return request.request({ url: '/orders/' + orderId + '/confirm', method: 'POST', data: { order_id: orderId }, mock: 'orderConfirm' });
  },

  /**
   * 申请退款（售后）。
   * @param {number} orderId 订单 ID
   * @param {object} body { reason, amount_cents, description }
   * @returns {Promise<object>} Refund
   */
  applyRefund(orderId, body) {
    const data = Object.assign({ order_id: orderId }, body);
    return request.request({ url: '/orders/' + orderId + '/refund', method: 'POST', data: data, mock: 'orderRefund' });
  },

  /**
   * 订单状态数量统计。
   * @returns {Promise<object>} { pending_payment, pending_shipment, pending_receipt, refunding }
   */
  getOrderCount() {
    return request.request({ url: '/orders/count', method: 'GET', mock: 'orderCount' });
  },

  // -------------------------------------------------------------------------
  // 支付
  // -------------------------------------------------------------------------
  /**
   * 创建支付单。
   * @param {object} body { order_id, channel }
   * @returns {Promise<object>} Payment
   */
  createPayment(body) {
    return request.request({ url: '/payments', method: 'POST', data: body, mock: 'paymentCreate' });
  },

  /**
   * 查询支付单。
   * @param {object} params { order_id, payment_id }
   * @returns {Promise<object>} Payment
   */
  queryPayment(params) {
    return request.request({ url: '/payments/query', method: 'GET', data: params, mock: 'paymentQuery' });
  },

  /**
   * 支付结果通知（演示态用于把订单推进到已支付）。
   * @param {object} body { order_id, payment_no, transaction_id, status }
   * @returns {Promise<object>} OperationResult
   */
  notifyPayment(body) {
    return request.request({ url: '/payments/notify', method: 'POST', data: body, mock: 'paymentNotify' });
  },

  // -------------------------------------------------------------------------
  // 用户资料 / 地址 / 收藏 / 积分 / 发票
  // -------------------------------------------------------------------------
  /**
   * 拉取用户资料。
   * @returns {Promise<object>} User
   */
  getProfile() {
    return request.request({ url: '/users/me', method: 'GET', mock: 'profile' });
  },

  /**
   * 更新用户资料。
   * @param {object} body { nickname, avatar, email, gender, birthday }
   * @returns {Promise<object>} User
   */
  updateProfile(body) {
    return request.request({ url: '/users/me', method: 'PUT', data: body, mock: 'profileUpdate' });
  },

  /**
   * 积分明细。
   * @param {object} params { page, page_size }
   * @returns {Promise<object>} { logs, meta, current_points }
   */
  listPointsLogs(params) {
    return request.request({ url: '/users/points-logs', method: 'GET', data: buildListParams(params), mock: 'pointsLogs' });
  },

  /**
   * 发票列表。
   * @param {object} params { page, page_size, status }
   * @returns {Promise<object>} { invoices, meta }
   */
  listInvoices(params) {
    return request.request({ url: '/users/invoices', method: 'GET', data: buildListParams(params), mock: 'invoices' });
  },

  /**
   * 申请开票。
   * @param {object} body { order_no, title, tax_no, type, email, amount_cents, remark }
   * @returns {Promise<object>} Invoice
   */
  createInvoice(body) {
    return request.request({ url: '/users/invoices', method: 'POST', data: body, mock: 'invoiceCreate' });
  },

  /**
   * 收货地址列表。
   * @returns {Promise<object>} { addresses }
   */
  listAddresses() {
    return request.request({ url: '/users/addresses', method: 'GET', mock: 'addresses', fallbackOnError: true });
  },

  /**
   * 新增 / 修改收货地址。
   * @param {object} body SaveAddressRequest
   * @returns {Promise<object>} Address
   */
  saveAddress(body) {
    return request.request({ url: '/users/addresses', method: 'POST', data: body, mock: 'addressSave' });
  },

  /**
   * 删除收货地址。
   * @param {number} id 地址 ID
   * @returns {Promise<object>} OperationResult
   */
  deleteAddress(id) {
    return request.request({ url: '/users/addresses/' + id, method: 'DELETE', data: { id: id }, mock: 'addressDelete' });
  },

  /**
   * 设为默认地址。
   * @param {number} id 地址 ID
   * @returns {Promise<object>} OperationResult
   */
  setDefaultAddress(id) {
    return request.request({ url: '/users/addresses/' + id + '/default', method: 'PUT', data: { id: id }, mock: 'addressDefault' });
  },

  /**
   * 收藏商品列表。
   * @param {object} params { page, page_size }
   * @returns {Promise<object>} { products, meta }
   */
  listFavorites(params) {
    return request.request({ url: '/users/favorites', method: 'GET', data: buildListParams(params), mock: 'favorites' });
  },

  /**
   * 收藏 / 取消收藏。
   * @param {number} productId 商品 ID
   * @returns {Promise<object>} { favorited }
   */
  toggleFavorite(productId) {
    return request.request({ url: '/users/favorites/toggle', method: 'POST', data: { product_id: productId }, mock: 'favoriteToggle' });
  },

  // -------------------------------------------------------------------------
  // 营销
  // -------------------------------------------------------------------------
  /**
   * 可领取的平台优惠券。
   * @param {object} params { page, page_size }
   * @returns {Promise<object>} { coupons, meta }
   */
  listCoupons(params) {
    return request.request({ url: '/coupons', method: 'GET', data: buildListParams(params), mock: 'coupons' });
  },

  /**
   * 我的优惠券。
   * @param {object} params { page, page_size, status }
   * @returns {Promise<object>} { coupons, meta, available_count }
   */
  listUserCoupons(params) {
    return request.request({ url: '/users/coupons', method: 'GET', data: buildListParams(params), mock: 'userCoupons' });
  },

  /**
   * 领取优惠券。
   * @param {number} couponId 优惠券 ID
   * @returns {Promise<object>} UserCoupon
   */
  receiveCoupon(couponId) {
    return request.request({ url: '/coupons/' + couponId + '/receive', method: 'POST', data: { coupon_id: couponId }, mock: 'couponReceive' });
  },

  /**
   * 促销活动列表。
   * @param {object} params { page, page_size, status, type }
   * @returns {Promise<object>} { promotions, meta }
   */
  listPromotions(params) {
    return request.request({ url: '/promotions', method: 'GET', data: buildListParams(params), mock: 'promotions', fallbackOnError: true });
  },

  /**
   * 结算预览（计算可用券与应付金额）。
   * @param {object} body PreviewCheckoutRequest
   * @returns {Promise<object>} PreviewCheckoutResponse
   */
  previewCheckout(body) {
    return request.request({ url: '/marketing/preview', method: 'POST', data: body, mock: 'checkoutPreview', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 物流
  // -------------------------------------------------------------------------
  /**
   * 按订单号查询物流轨迹。
   * @param {object} params { order_id, shipment_id }
   * @returns {Promise<object>} { shipment, tracks }
   */
  getShipmentTracks(params) {
    return request.request({ url: '/logistics/tracks', method: 'GET', data: params, mock: 'shipment', fallbackOnError: true });
  },

  /**
   * 查询订单物流（含发货单）。
   * @param {number} orderId 订单 ID
   * @returns {Promise<object>} { shipment, tracks }
   */
  getShipment(orderId) {
    return request.request({ url: '/logistics/order/' + orderId, method: 'GET', data: { order_id: orderId }, mock: 'shipment', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 消息通知
  // -------------------------------------------------------------------------
  /**
   * 消息列表。
   * @param {object} params { page, page_size, type, unread_only }
   * @returns {Promise<object>} { notifications, meta, unread_count }
   */
  listNotifications(params) {
    return request.request({ url: '/notifications', method: 'GET', data: buildListParams(params), mock: 'notifications' });
  },

  /**
   * 标记单条消息已读。
   * @param {number} id 消息 ID
   * @returns {Promise<object>} OperationResult
   */
  markNotificationRead(id) {
    return request.request({ url: '/notifications/' + id + '/read', method: 'PUT', data: { id: id }, mock: 'notificationRead' });
  },

  /**
   * 全部标记为已读。
   * @returns {Promise<object>} OperationResult
   */
  markAllNotificationsRead() {
    return request.request({ url: '/notifications/read-all', method: 'POST', data: {}, mock: 'notificationReadAll' });
  },

  /**
   * 未读消息数量。
   * @returns {Promise<object>} { count }
   */
  getUnreadCount() {
    return request.request({ url: '/notifications/unread-count', method: 'GET', mock: 'notificationCount' });
  },

  // -------------------------------------------------------------------------
  // 频道 / 商品浏览
  // -------------------------------------------------------------------------
  /**
   * 频道列表。
   * @returns {Promise<object>} { channels }
   */
  listChannels() {
    return request.request({ url: '/channels', method: 'GET', mock: 'channels', fallbackOnError: true });
  },

  /**
   * 频道商品列表。
   * @param {number} channelId 频道 ID
   * @param {object} params { page, page_size, sort }
   * @returns {Promise<object>} { products, meta, channel }
   */
  listChannelProducts(channelId, params) {
    return request.request({
      url: '/channels/' + channelId + '/products',
      method: 'GET',
      data: Object.assign({ channel_id: channelId }, buildListParams(params)),
      mock: 'channelProducts',
      fallbackOnError: true,
    });
  },

  /**
   * 商品参数（规格参数表）。
   * @param {number} id 商品 ID
   * @returns {Promise<object>} { product_id, title, params }
   */
  getProductParams(id) {
    return request.request({ url: '/products/' + id + '/params', method: 'GET', data: { id: id }, mock: 'productParams', fallbackOnError: true });
  },

  /**
   * 商品问答。
   * @param {number} id 商品 ID
   * @returns {Promise<object>} { product_id, questions }
   */
  getProductQuestions(id) {
    return request.request({ url: '/products/' + id + '/questions', method: 'GET', data: { id: id }, mock: 'productQuestions', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 评价
  // -------------------------------------------------------------------------
  /**
   * 评价标签。
   * @returns {Promise<object>} { tags }
   */
  listReviewTags() {
    return request.request({ url: '/reviews/tags', method: 'GET', mock: 'reviewTags', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 营销：签到 / 任务
  // -------------------------------------------------------------------------
  /**
   * 签到状态。
   * @returns {Promise<object>} { signed_today, continuous_days, today_points, total_points, records }
   */
  getSignIn() {
    return request.request({ url: '/marketing/sign-in', method: 'GET', mock: 'signIn', fallbackOnError: true });
  },

  /**
   * 每日签到。
   * @returns {Promise<object>} { success, points, continuous_days, total_points }
   */
  doSignIn() {
    return request.request({ url: '/marketing/sign-in', method: 'POST', data: {}, mock: 'signInDo', fallbackOnError: true });
  },

  /**
   * 任务列表。
   * @returns {Promise<object>} { tasks, completed_count, total_count }
   */
  listTasks() {
    return request.request({ url: '/marketing/tasks', method: 'GET', mock: 'tasks', fallbackOnError: true });
  },

  /**
   * 任务详情。
   * @param {number} id 任务 ID
   * @returns {Promise<object>} Task
   */
  getTask(id) {
    return request.request({ url: '/marketing/tasks/' + id, method: 'GET', data: { task_id: id }, mock: 'taskDetail', fallbackOnError: true });
  },

  /**
   * 领取任务奖励。
   * @param {number} id 任务 ID
   * @returns {Promise<object>} { success, points, task }
   */
  claimTaskReward(id) {
    return request.request({ url: '/marketing/tasks/' + id + '/claim', method: 'POST', data: { task_id: id }, mock: 'taskClaim', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 营销：拼团 / 场次
  // -------------------------------------------------------------------------
  /**
   * 拼团列表。
   * @param {object} params { page, page_size, status, mine }
   * @returns {Promise<object>} { group_buys, meta }
   */
  listGroupBuys(params) {
    return request.request({ url: '/group-buys', method: 'GET', data: buildListParams(params), mock: 'groupBuys', fallbackOnError: true });
  },

  /**
   * 拼团详情。
   * @param {number} id 拼团 ID
   * @returns {Promise<object>} GroupBuy
   */
  getGroupBuy(id) {
    return request.request({ url: '/group-buys/' + id, method: 'GET', data: { id: id }, mock: 'groupBuyDetail', fallbackOnError: true });
  },

  /**
   * 参团下单。
   * @param {number} id 拼团 ID
   * @param {object} body { sku_id, quantity, address_id }
   * @returns {Promise<object>} { success, group_buy, order_no }
   */
  joinGroupBuy(id, body) {
    const data = Object.assign({ id: id }, body);
    return request.request({ url: '/group-buys/' + id + '/join', method: 'POST', data: data, mock: 'groupBuyJoin', fallbackOnError: true });
  },

  /**
   * 活动场次。
   * @param {number} id 活动 ID
   * @returns {Promise<object>} { sessions }
   */
  listPromotionSessions(id) {
    return request.request({ url: '/promotions/' + id + '/sessions', method: 'GET', data: { id: id }, mock: 'promotionSessions', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 售后
  // -------------------------------------------------------------------------
  /**
   * 售后列表。
   * @param {object} params { page, page_size, status }
   * @returns {Promise<object>} { after_sales, meta }
   */
  listAfterSales(params) {
    return request.request({ url: '/after-sales', method: 'GET', data: buildListParams(params), mock: 'afterSales', fallbackOnError: true });
  },

  /**
   * 售后详情。
   * @param {number} id 售后单 ID
   * @returns {Promise<object>} AfterSale
   */
  getAfterSale(id) {
    return request.request({ url: '/after-sales/' + id, method: 'GET', data: { id: id }, mock: 'afterSaleDetail', fallbackOnError: true });
  },

  /**
   * 退款原因字典。
   * @returns {Promise<object>} { reasons }
   */
  listRefundReasons() {
    return request.request({ url: '/refund-reasons', method: 'GET', mock: 'refundReasons', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 物流
  // -------------------------------------------------------------------------
  /**
   * 按运单号查询物流。
   * @param {string} trackingNo 运单号
   * @returns {Promise<object>} { tracking_no, company, status, tracks }
   */
  getTrackingByNo(trackingNo) {
    return request.request({ url: '/logistics/tracking/' + trackingNo, method: 'GET', data: { tracking_no: trackingNo }, mock: 'trackingQuery', fallbackOnError: true });
  },

  // -------------------------------------------------------------------------
  // 用户中心与账户
  // -------------------------------------------------------------------------
  /**
   * 当前用户会员等级。
   * @returns {Promise<object>} LevelInfo
   */
  getUserLevel() {
    return request.request({ url: '/users/level', method: 'GET', mock: 'userLevel', fallbackOnError: true });
  },

  /**
   * 会员等级体系。
   * @returns {Promise<object>} { levels }
   */
  listMarketingLevels() {
    return request.request({ url: '/marketing/levels', method: 'GET', mock: 'marketingLevels', fallbackOnError: true });
  },

  /**
   * 成长值明细。
   * @param {object} params { page, page_size }
   * @returns {Promise<object>} { logs, meta, current_growth }
   */
  listGrowthLogs(params) {
    return request.request({ url: '/users/growth-logs', method: 'GET', data: buildListParams(params), mock: 'growthLogs', fallbackOnError: true });
  },

  /**
   * 发票抬头模板。
   * @returns {Promise<object>} { templates }
   */
  listInvoiceTemplates() {
    return request.request({ url: '/users/invoice-templates', method: 'GET', mock: 'invoiceTemplates', fallbackOnError: true });
  },

  /**
   * 新增 / 更新发票抬头模板。
   * @param {object} body { id, title, tax_no, type, email, bank_name, bank_account, is_default }
   * @returns {Promise<object>} InvoiceTemplate
   */
  saveInvoiceTemplate(body) {
    return request.request({ url: '/users/invoice-templates', method: 'POST', data: body, mock: 'invoiceTemplateSave', fallbackOnError: true });
  },

  /**
   * 删除发票抬头模板。
   * @param {number} id 模板 ID
   * @returns {Promise<object>} OperationResult
   */
  deleteInvoiceTemplate(id) {
    return request.request({ url: '/users/invoice-templates/' + id, method: 'DELETE', data: { id: id }, mock: 'invoiceTemplateDelete', fallbackOnError: true });
  },

  /**
   * 通知设置。
   * @returns {Promise<object>} { settings }
   */
  getNotificationSettings() {
    return request.request({ url: '/users/notification-settings', method: 'GET', mock: 'notificationSettings', fallbackOnError: true });
  },

  /**
   * 更新通知设置。
   * @param {object} body { order, logistics, promotion, system, sms, email, push }
   * @returns {Promise<object>} { settings }
   */
  updateNotificationSettings(body) {
    return request.request({ url: '/users/notification-settings', method: 'PUT', data: body, mock: 'notificationSettingsUpdate', fallbackOnError: true });
  },

  /**
   * 账号安全状态。
   * @returns {Promise<object>} { phone_bound, email_bound, wechat_bound, realname_verified, password_set, devices }
   */
  getAccountSecurity() {
    return request.request({ url: '/users/security', method: 'GET', mock: 'accountSecurity', fallbackOnError: true });
  },

  /**
   * 提交实名认证。
   * @param {object} body { real_name, id_card, id_card_back_url }
   * @returns {Promise<object>} { success, realname }
   */
  submitRealname(body) {
    return request.request({ url: '/users/realname', method: 'POST', data: body, mock: 'realnameSubmit', fallbackOnError: true });
  },

  /**
   * 提交意见反馈。
   * @param {object} body { type, content, contact }
   * @returns {Promise<object>} { success, feedback_id }
   */
  submitFeedback(body) {
    return request.request({ url: '/users/feedback', method: 'POST', data: body, mock: 'feedbackSubmit', fallbackOnError: true });
  },

  /**
   * 帮助文章列表。
   * @param {object} params { page, page_size, category, keyword }
   * @returns {Promise<object>} { articles, meta, categories }
   */
  listHelpArticles(params) {
    return request.request({ url: '/help/articles', method: 'GET', data: buildListParams(params), mock: 'helpArticles', fallbackOnError: true });
  },

  /**
   * 帮助文章分类（由分类列表聚合得到）。
   * @returns {Promise<object>} { categories }
   */
  listHelpCategories() {
    return request.request({ url: '/help/articles', method: 'GET', data: { 'page.page': 1, 'page.page_size': 100 }, mock: 'helpArticles', fallbackOnError: true });
  },

  /**
   * 帮助文章详情。
   * @param {number} id 文章 ID
   * @returns {Promise<object>} Article
   */
  getHelpArticle(id) {
    return request.request({ url: '/help/articles/' + id, method: 'GET', data: { id: id }, mock: 'helpArticle' });
  },

  /**
   * 收货地区字典。
   * @returns {Promise<object>} { regions }
   */
  listRegions() {
    return request.request({ url: '/regions', method: 'GET', mock: 'regions' });
  },
};

module.exports = api;
module.exports.buildListParams = buildListParams;
