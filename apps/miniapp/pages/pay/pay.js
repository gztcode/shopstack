/**
 * 支付页
 * ---------------------------------------------------------------
 * 选择支付方式 -> 创建支付单 -> 调起 wx.requestPayment。
 * 演示环境（无真实商户号 / 支付参数缺失）下优雅降级为「模拟支付」。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    paying: false,
    orderId: 0,
    orderNo: '',
    amountText: '0.00',
    statusText: '',
    channels: enums.PAY_CHANNELS,
    channelIndex: 0,
  },

  onLoad(options) {
    const orderId = Number(options && options.order_id) || 0;
    const amount = Number(options && options.amount) || 0;
    this.setData({ orderId: orderId, amountText: format.formatYuan(amount) });
    this.loadOrder(orderId, amount);
  },

  /**
   * 加载订单信息。
   * @param {number} orderId 订单 ID
   * @param {number} amount 应付金额（分）
   */
  loadOrder(orderId, amount) {
    if (!orderId) {
      this.setData({ loading: false });
      return;
    }
    api
      .getOrder(orderId)
      .then((detail) => {
        const order = (detail && detail.order) || {};
        this.setData({
          loading: false,
          orderNo: order.order_no || '',
          amountText: format.formatYuan(amount || order.payable_cents),
          statusText: enums.orderStatusText(order.status),
        });
      })
      .catch(() => {
        this.setData({ loading: false, amountText: format.formatYuan(amount) });
      });
  },

  /**
   * 选择支付方式。
   */
  onChannelTap(e) {
    this.setData({ channelIndex: Number(e.currentTarget.dataset.index) || 0 });
  },

  /**
   * 发起支付。
   */
  onPay() {
    if (this.data.paying) {
      return;
    }
    if (!this.data.orderId) {
      wx.showToast({ title: '订单信息缺失', icon: 'none' });
      return;
    }
    const channel = this.data.channels[this.data.channelIndex] || this.data.channels[0];
    this.setData({ paying: true });
    api
      .createPayment({ order_id: this.data.orderId, channel: channel.value })
      .then((payment) => {
        const params = (payment && payment.pay_params) || {};
        if (typeof wx.requestPayment !== 'function' || !params.timeStamp) {
          // 无真实支付参数，降级为模拟支付
          this.simulatePay();
          return null;
        }
        return this
          .requestPayment(params)
          .then(() => {
            this.confirmPaid(payment);
          })
          .catch(() => {
            this.simulatePay();
          });
      })
      .catch((error) => {
        this.setData({ paying: false });
        wx.showToast({ title: (error && error.message) || '支付单创建失败', icon: 'none' });
      });
  },

  /**
   * 调起微信支付。
   * @param {object} params 支付参数
   * @returns {Promise}
   */
  requestPayment(params) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'RSA',
        paySign: params.paySign,
        success: resolve,
        fail: reject,
      });
    });
  },

  /**
   * 演示模式下的模拟支付确认。
   */
  simulatePay() {
    wx.showModal({
      title: '模拟支付',
      content: '当前环境未接入真实微信支付，是否模拟支付成功？',
      confirmText: '模拟支付',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          this.setData({ paying: false });
          return;
        }
        this.confirmPaid(null);
      },
    });
  },

  /**
   * 通知后端支付完成并跳转订单详情。
   * @param {object} payment 支付单
   */
  confirmPaid(payment) {
    api
      .notifyPayment({
        order_id: this.data.orderId,
        payment_no: (payment && payment.payment_no) || '',
        transaction_id: (payment && payment.transaction_id) || '',
        status: 2,
      })
      .catch(() => null)
      .then(() => {
        this.setData({ paying: false });
        // 支付成功后进入支付结果页，再由结果页跳转订单详情
        wx.redirectTo({ url: '/pages/pay-result/pay-result?order_id=' + this.data.orderId });
      });
  },

  /**
   * 稍后支付，回到订单详情。
   */
  onLater() {
    wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + this.data.orderId });
  },
});
