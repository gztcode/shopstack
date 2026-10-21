/**
 * 订单详情页
 * ---------------------------------------------------------------
 * 状态时间线、收货地址、商品清单、金额明细、物流轨迹与订单操作。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    orderId: 0,
    order: {},
    items: [],
    logs: [],
    address: {},
    statusText: '',
    tone: 'muted',
    totalText: '0.00',
    discountText: '0.00',
    freightText: '0.00',
    payableText: '0.00',
    trackingNo: '',
    logisticsCompany: '',
    logisticsTracks: [],
    canCancel: false,
    canPay: false,
    canConfirm: false,
    canRefund: false,
    canReview: false,
  },

  onLoad(options) {
    const id = Number(options && options.id) || 0;
    this.setData({ orderId: id });
  },

  onShow() {
    if (this.data.orderId) {
      this.loadDetail(this.data.orderId);
    }
  },

  /**
   * 加载订单详情。
   * @param {number} id 订单 ID
   */
  loadDetail(id) {
    this.setData({ loading: true });
    api
      .getOrder(id)
      .then((detail) => {
        if (!detail || !detail.order) {
          this.setData({ loading: false });
          wx.showToast({ title: '订单不存在', icon: 'none' });
          return;
        }
        const order = detail.order;
        const address = order.address || {};
        this.setData({
          loading: false,
          order: order,
          items: (detail.items || []).map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product_title: item.product_title,
            spec_text: item.spec_text,
            image: item.image,
            quantity: item.quantity,
            price_text: format.formatYuan(item.price_cents),
            subtotal_text: format.formatYuan(item.subtotal_cents),
          })),
          logs: (detail.logs || []).map((log) => ({
            id: log.id,
            action: log.action,
            remark: log.remark,
            operator: log.operator,
            time_text: format.formatDateTime(log.created_at),
          })),
          address: {
            receiver: address.receiver || '',
            phone: address.phone || '',
            detail: (address.province || '') + (address.city || '') + (address.district || '') + (address.detail || ''),
          },
          statusText: enums.orderStatusText(order.status),
          tone: enums.orderStatusTone(order.status),
          totalText: format.formatYuan(order.total_amount_cents),
          discountText: format.formatYuan(order.discount_cents),
          freightText: format.formatYuan(order.freight_cents),
          payableText: format.formatYuan(order.payable_cents),
          trackingNo: detail.tracking_no || '',
          logisticsCompany: detail.logistics_company || '',
          logisticsTracks: detail.logistics_tracks || [],
          canCancel: !!detail.can_cancel,
          canPay: !!detail.can_pay,
          canConfirm: !!detail.can_confirm,
          canRefund: !!detail.can_refund,
          canReview: !!detail.can_review,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 进入商品详情。
   */
  onProductTap(e) {
    const productId = e.currentTarget.dataset.productId;
    if (!productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 去支付。
   */
  onPay() {
    wx.navigateTo({
      url: '/pages/pay/pay?order_id=' + this.data.orderId + '&amount=' + this.data.order.payable_cents,
    });
  },

  /**
   * 取消订单。
   */
  onCancel() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .cancelOrder(this.data.orderId, '用户主动取消')
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'none' });
            this.loadDetail(this.data.orderId);
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '取消失败', icon: 'none' });
          });
      },
    });
  },

  /**
   * 确认收货。
   */
  onConfirm() {
    wx.showModal({
      title: '确认收货',
      content: '请确认已收到商品',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .confirmReceipt(this.data.orderId)
          .then(() => {
            wx.showToast({ title: '已确认收货', icon: 'success' });
            this.loadDetail(this.data.orderId);
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
          });
      },
    });
  },

  /**
   * 申请退款（跳转到售后申请页填写原因与金额）。
   */
  onRefund() {
    wx.navigateTo({ url: '/pages/refund/refund?order_id=' + this.data.orderId });
  },

  /**
   * 查看物流轨迹。
   */
  onLogistics() {
    wx.navigateTo({ url: '/pages/logistics/logistics?order_id=' + this.data.orderId });
  },

  /**
   * 评价订单（跳转到发表评价页）。
   */
  onReview() {
    const first = this.data.items.length ? this.data.items[0] : null;
    if (!first) {
      wx.showToast({ title: '该订单暂无可评价商品', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/reviews/reviews?product_id=' + first.product_id + '&sku_id=' + (first.sku_id || 0),
    });
  },

  /**
   * 复制订单号。
   */
  onCopyOrderNo() {
    const orderNo = this.data.order.order_no;
    if (!orderNo) {
      return;
    }
    wx.setClipboardData({
      data: orderNo,
      success() {
        wx.showToast({ title: '订单号已复制', icon: 'none' });
      },
    });
  },

  /**
   * 拨打客服电话。
   */
  onCallService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线 400-888-8888（服务时间 9:00 - 21:00）',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
