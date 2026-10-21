/**
 * 售后申请
 * ---------------------------------------------------------------
 * 接口：GET  /api/v1/orders?page.page=1&page.page_size=20
 *       POST /api/v1/orders/{order_id}/refund  { reason, amount_cents, description }
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

/** 退款原因 */
const REASONS = ['商品质量问题', '商品与描述不符', '不想要了', '发错货 / 少件漏件', '物流超时', '其他原因'];

Page({
  data: {
    loading: true,
    submitting: false,
    /** 可申请售后的订单 */
    orders: [],
    selectedOrderId: 0,
    selectedOrder: null,
    reasons: REASONS,
    reasonIndex: 0,
    /** 退款金额（元） */
    amount: '',
    amountText: '',
    maxAmountText: '',
    description: '',
    /** 提交结果 */
    result: null,
  },

  onLoad(options) {
    const orderId = Number(options && options.order_id) || 0;
    this.setData({ selectedOrderId: orderId });
    this.loadOrders();
  },

  /**
   * 加载可申请售后的订单。
   */
  loadOrders() {
    this.setData({ loading: true });
    api
      .listOrders({ page: 1, page_size: 20 })
      .then((data) => {
        const orders = ((data && data.orders) || [])
          .filter((order) => order.status === 'ORDER_STATUS_PAID' || order.status === 'ORDER_STATUS_SHIPPED')
          .map((order) => ({
            id: order.id,
            order_no: order.order_no,
            status_text: enums.orderStatusText(order.status),
            total_text: format.formatYuan(order.payable_cents),
            payable_cents: order.payable_cents,
            item_count: order.total_quantity || order.item_count || 0,
            created_text: format.formatDateTime(order.created_at),
          }));
        this.setData({ loading: false, orders: orders });
        const target = orders.filter((item) => item.id === this.data.selectedOrderId)[0] || orders[0];
        if (target) {
          this.selectOrder(target);
        } else {
          this.setData({ selectedOrder: null });
        }
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '订单加载失败', icon: 'none' });
      });
  },

  /**
   * 选择订单。
   * @param {object} order 订单展示结构
   */
  selectOrder(order) {
    const amountText = format.formatYuan(order.payable_cents);
    this.setData({
      selectedOrderId: order.id,
      selectedOrder: order,
      amount: amountText,
      amountText: amountText,
      maxAmountText: amountText,
      result: null,
    });
  },

  /**
   * 点击订单卡片。
   */
  onOrderTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    const order = this.data.orders.filter((item) => item.id === id)[0];
    if (order) {
      this.selectOrder(order);
    }
  },

  /**
   * 选择退款原因。
   */
  onReasonChange(e) {
    this.setData({ reasonIndex: Number(e.detail.value) || 0 });
  },

  /**
   * 填写退款金额（元）。
   */
  onAmountInput(e) {
    const value = e.detail.value;
    this.setData({ amount: value });
  },

  /**
   * 填写问题描述。
   */
  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  /**
   * 提交售后申请。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.selectedOrder) {
      wx.showToast({ title: '请选择需要售后的订单', icon: 'none' });
      return;
    }
    const amountYuan = Number(this.data.amount);
    if (!isFinite(amountYuan) || amountYuan <= 0) {
      wx.showToast({ title: '请填写正确的退款金额', icon: 'none' });
      return;
    }
    const amountCents = Math.round(amountYuan * 100);
    if (amountCents > this.data.selectedOrder.payable_cents) {
      wx.showToast({ title: '退款金额不能超过订单金额', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    api
      .applyRefund(this.data.selectedOrderId, {
        reason: this.data.reasons[this.data.reasonIndex],
        amount_cents: amountCents,
        description: this.data.description,
      })
      .then((refund) => {
        this.setData({ submitting: false });
        wx.showToast({ title: '售后申请已提交', icon: 'success' });
        this.setData({
          result: {
            refund_no: (refund && refund.refund_no) || '',
            amount_text: format.formatYuan(amountCents),
            reason: this.data.reasons[this.data.reasonIndex],
            status_text: '待审核',
          },
        });
        this.loadOrders();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' });
      });
  },

  /**
   * 查看订单详情。
   */
  onOrderDetail() {
    if (!this.data.selectedOrderId) {
      return;
    }
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + this.data.selectedOrderId });
  },

  /**
   * 没有可申请售后的订单时去逛逛。
   */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
