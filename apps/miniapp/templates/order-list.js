/**
 * 订单状态列表页面模板
 * ---------------------------------------------------------------
 * 全部订单 / 待付款 / 待发货 / 待收货 / 已完成 / 已取消 / 售后中
 * 七个订单页共用本模板，通过 status 参数区分订单状态筛选条件。
 */
const api = require('../utils/api');
const format = require('../utils/format');
const enums = require('../utils/enums');

/**
 * 创建订单状态列表页面。
 * @param {object} config { status, title, emptyDesc }
 * @returns {object} Page 配置对象
 */
function createOrderListPage(config) {
  const options = config || {};
  const status = options.status || '';
  return {
    data: {
      view: {
        status: status,
        title: options.title || '订单',
        emptyDesc: options.emptyDesc || '换个状态看看，或去首页挑选商品',
        orders: [],
        counts: { pending_payment: 0, pending_shipment: 0, pending_receipt: 0, refunding: 0 },
        loading: true,
        hasMore: true,
        page: 1,
        pageSize: 10,
      },
    },

    onShow() {
      this.loadOrders(true);
    },

    onReachBottom() {
      if (this.data.view.hasMore && !this.data.view.loading) {
        this.loadOrders(false);
      }
    },

    /**
     * 加载订单列表。
     * @param {boolean} reset 是否重置分页
     */
    loadOrders(reset) {
      const view = this.data.view;
      const page = reset ? 1 : view.page;
      this.setData({ 'view.loading': true });
      const params = { page: page, page_size: view.pageSize };
      if (view.status) {
        params.status = enums.orderStatusValue(view.status);
      }
      api
        .listOrders(params)
        .then((data) => {
          const list = (data && data.orders) || [];
          const meta = (data && data.meta) || {};
          const mapped = list.map((order) => this.mapOrder(order));
          this.setData({
            'view.loading': false,
            'view.orders': reset ? mapped : view.orders.concat(mapped),
            'view.page': page + 1,
            'view.hasMore': page < (meta.total_pages || 1),
            'view.counts': {
              pending_payment: data.pending_payment_count || 0,
              pending_shipment: data.pending_shipment_count || 0,
              pending_receipt: data.pending_receipt_count || 0,
              refunding: data.refunding_count || 0,
            },
          });
        })
        .catch((error) => {
          this.setData({ 'view.loading': false });
          wx.showToast({ title: (error && error.message) || '订单加载失败', icon: 'none' });
        });
    },

    /**
     * 转换为页面展示结构。
     * @param {object} order Order
     * @returns {object}
     */
    mapOrder(order) {
      const orderStatus = order.status;
      return {
        id: order.id,
        order_no: order.order_no,
        status_text: enums.orderStatusText(orderStatus),
        tone: enums.orderStatusTone(orderStatus),
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
        can_pay: orderStatus === 'ORDER_STATUS_PENDING_PAYMENT',
        can_cancel: orderStatus === 'ORDER_STATUS_PENDING_PAYMENT',
        can_confirm: orderStatus === 'ORDER_STATUS_SHIPPED',
        can_refund: orderStatus === 'ORDER_STATUS_PAID' || orderStatus === 'ORDER_STATUS_SHIPPED',
        can_logistics: orderStatus === 'ORDER_STATUS_SHIPPED' || orderStatus === 'ORDER_STATUS_COMPLETED',
      };
    },

    /**
     * 进入订单详情。
     */
    onOrderTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
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
     * 申请售后。
     */
    onRefund(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/subpkg-order/after-sale-apply/after-sale-apply?order_id=' + id });
    },

    /**
     * 查看物流轨迹。
     */
    onLogistics(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: '/subpkg-order/logistics-trace/logistics-trace?order_id=' + id });
    },

    /**
     * 空状态引导：去逛逛。
     */
    onGoShopping() {
      wx.switchTab({ url: '/pages/index/index' });
    },
  };
}

module.exports = { createOrderListPage: createOrderListPage };
