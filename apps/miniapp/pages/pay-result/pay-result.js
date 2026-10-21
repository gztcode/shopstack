/**
 * 支付结果
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/payments/query?order_id=<int64>
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    error: '',
    orderId: 0,
    payment: null,
    statusText: '',
    success: false,
    icon: '💰',
  },

  onLoad(options) {
    const orderId = Number(options && options.order_id) || 0;
    this.setData({ orderId: orderId });
    this.loadPayment(orderId);
  },

  /**
   * 查询支付单。
   * @param {number} orderId 订单 ID
   */
  loadPayment(orderId) {
    this.setData({ loading: true, error: '' });
    api
      .queryPayment({ order_id: orderId })
      .then((payment) => {
        if (!payment) {
          this.setData({ loading: false, error: '未找到该订单的支付记录' });
          return;
        }
        const success = payment.status === 'PAYMENT_STATUS_SUCCESS';
        this.setData({
          loading: false,
          payment: {
            payment_no: payment.payment_no,
            order_no: payment.order_no,
            amount_text: format.formatYuan(payment.paid_cents || payment.amount_cents),
            paid_text: format.formatDateTime(payment.paid_at),
            transaction_id: payment.transaction_id,
            channel_text: enums.textOf(enums.PAYMENT_CHANNEL, payment.channel, '未知渠道'),
            fail_reason: payment.fail_reason,
          },
          statusText: enums.textOf(enums.PAYMENT_STATUS, payment.status, '未知状态'),
          success: success,
          icon: success ? '✅' : payment.status === 'PAYMENT_STATUS_FAILED' ? '❌' : '⏳',
        });
      })
      .catch((error) => {
        this.setData({ loading: false, error: (error && error.message) || '支付结果查询失败' });
      });
  },

  /**
   * 查看订单详情。
   */
  onViewOrder() {
    if (!this.data.orderId) {
      return;
    }
    wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + this.data.orderId });
  },

  /**
   * 重新支付。
   */
  onRepay() {
    if (!this.data.orderId) {
      return;
    }
    const amount = this.data.payment ? this.data.payment.amount_text : '0.00';
    wx.redirectTo({
      url: '/pages/pay/pay?order_id=' + this.data.orderId + '&amount=' + Math.round(Number(amount) * 100),
    });
  },

  /**
   * 继续购物。
   */
  onContinue() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /**
   * 重试。
   */
  onRetry() {
    this.loadPayment(this.data.orderId);
  },
});
