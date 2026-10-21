/**
 * 申请售后
 * ---------------------------------------------------------------
 * 接口：GET  /api/v1/orders/{id}
 *       GET  /api/v1/refund-reasons
 *       POST /api/v1/orders/{id}/refund
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    submitting: false,
    orderId: 0,
    order: null,
    reason: '',
    description: '',
    amountText: '',
  },

  onLoad(options) {
    const orderId = Number((options && options.order_id) || 0);
    this.setData({ orderId: orderId });
  },

  onShow() {
    this.loadOrder();
  },

  /**
   * 加载订单信息。
   */
  loadOrder() {
    if (!this.data.orderId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    api
      .getOrder(this.data.orderId)
      .then((data) => {
        const order = data && data.order;
        if (!order) {
          this.setData({ loading: false, order: null });
          return;
        }
        this.setData({
          loading: false,
          amountText: format.formatYuan(order.payable_cents),
          order: {
            id: order.id,
            order_no: order.order_no,
            status_text: enums.orderStatusText(order.status),
            payable_text: format.formatYuan(order.payable_cents),
            items: (order.items || []).map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_title: item.product_title,
              spec_text: item.spec_text,
              image: item.image,
              quantity: item.quantity,
              price_text: format.formatYuan(item.price_cents),
            })),
          },
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '订单加载失败', icon: 'none' });
      });
  },

  /**
   * 前往退款原因页选择原因。
   */
  onPickReason() {
    wx.navigateTo({ url: '/subpkg-order/refund-reason/refund-reason?order_id=' + this.data.orderId });
  },

  /**
   * 填写补充说明。
   */
  onInputDescription(e) {
    this.setData({ description: e.detail.value });
  },

  /**
   * 空状态引导：查看订单列表。
   */
  onGoOrders() {
    wx.navigateTo({ url: '/pages/order-all/order-all' });
  },

  /**
   * 提交售后申请。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.reason) {
      wx.showToast({ title: '请选择退款原因', icon: 'none' });
      return;
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请填写问题描述', icon: 'none' });
      return;
    }
    const items = (this.data.order && this.data.order.items) || [];
    this.setData({ submitting: true });
    api
      .applyRefund(this.data.orderId, {
        item_ids: items.map((item) => item.id),
        amount_cents: Math.round(Number(this.data.amountText || 0) * 100),
        reason: this.data.reason,
        description: this.data.description.trim(),
      })
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '售后申请已提交', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({ url: '/subpkg-order/after-sale-list/after-sale-list' });
        }, 800);
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' });
      });
  },
});
