/**
 * 订单列表页
 * ---------------------------------------------------------------
 * 状态页签 + 订单卡片 + 分页加载，支持取消 / 支付 / 确认收货 / 退款 / 评价。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    tabs: enums.ORDER_TABS,
    activeKey: '',
    orders: [],
    counts: { pending_payment: 0, pending_shipment: 0, pending_receipt: 0, refunding: 0 },
    page: 1,
    pageSize: 10,
    hasMore: true,
  },

  onLoad(options) {
    const status = options && options.status ? options.status : '';
    this.setData({ activeKey: status });
  },

  onShow() {
    this.loadOrders(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadOrders(false);
    }
  },

  /**
   * 加载订单列表。
   * @param {boolean} reset 是否重置分页
   */
  loadOrders(reset) {
    if (reset) {
      this.setData({ loading: true, page: 1, hasMore: true });
    }
    const page = reset ? 1 : this.data.page;
    const params = {
      page: page,
      page_size: this.data.pageSize,
    };
    if (this.data.activeKey) {
      params.status = enums.orderStatusValue(this.data.activeKey);
    }
    api
      .listOrders(params)
      .then((data) => {
        const list = (data && data.orders) || [];
        const meta = (data && data.meta) || {};
        const mapped = list.map((order) => this.mapOrder(order));
        const orders = reset ? mapped : this.data.orders.concat(mapped);
        this.setData({
          loading: false,
          orders: orders,
          counts: {
            pending_payment: data.pending_payment_count || 0,
            pending_shipment: data.pending_shipment_count || 0,
            pending_receipt: data.pending_receipt_count || 0,
            refunding: data.refunding_count || 0,
          },
          page: page + 1,
          hasMore: page < (meta.total_pages || 1),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '订单加载失败', icon: 'none' });
      });
  },

  /**
   * 转换为页面展示结构。
   * @param {object} order Order
   * @returns {object}
   */
  mapOrder(order) {
    const status = order.status;
    return {
      id: order.id,
      order_no: order.order_no,
      status: status,
      status_text: enums.orderStatusText(status),
      tone: enums.orderStatusTone(status),
      items: (order.items || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_title: item.product_title,
        spec_text: item.spec_text,
        image: item.image,
        quantity: item.quantity,
        price_text: format.formatYuan(item.price_cents),
      })),
      total_text: format.formatYuan(order.payable_cents),
      payable_cents: order.payable_cents,
      count: order.total_quantity || order.item_count || 0,
      created_text: format.formatDateTime(order.created_at),
      can_pay: status === 'ORDER_STATUS_PENDING_PAYMENT',
      can_cancel: status === 'ORDER_STATUS_PENDING_PAYMENT',
      can_confirm: status === 'ORDER_STATUS_SHIPPED',
      can_refund: status === 'ORDER_STATUS_PAID' || status === 'ORDER_STATUS_SHIPPED',
      can_review: status === 'ORDER_STATUS_COMPLETED',
    };
  },

  /**
   * 切换状态页签。
   */
  onTabTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeKey) {
      return;
    }
    this.setData({ activeKey: key });
    this.loadOrders(true);
  },

  /**
   * 进入订单详情。
   */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
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
  onPay(e) {
    const id = e.currentTarget.dataset.id;
    const amount = e.currentTarget.dataset.amount;
    wx.navigateTo({ url: '/pages/pay/pay?order_id=' + id + '&amount=' + amount });
  },

  /**
   * 取消订单。
   */
  onCancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .cancelOrder(id, '用户主动取消')
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'none' });
            this.loadOrders(true);
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
  onConfirm(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认收货',
      content: '请确认已收到商品',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .confirmReceipt(id)
          .then(() => {
            wx.showToast({ title: '已确认收货', icon: 'success' });
            this.loadOrders(true);
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
          });
      },
    });
  },

  /**
   * 申请退款（跳转售后申请页）。
   */
  onRefund(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/refund/refund?order_id=' + id });
  },

  /**
   * 评价订单。
   */
  onReview(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '评价订单',
      content: '感谢你的支持，快去商品详情写下评价吧',
      confirmText: '去评价',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
        }
      },
    });
  },
});
