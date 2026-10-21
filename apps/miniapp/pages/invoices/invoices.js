/**
 * 发票管理
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/invoices?page.page=1&page.page_size=20
 *       POST /api/v1/users/invoices
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 发票状态 */
const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 0, label: '待开票' },
  { key: 1, label: '已开票' },
  { key: 2, label: '已驳回' },
];

const STATUS_TEXT = { 0: '待开票', 1: '已开票', 2: '已驳回' };
const TYPE_TEXT = { personal: '个人', company: '企业' };

Page({
  data: {
    loading: true,
    tabs: STATUS_TABS,
    activeStatus: '',
    invoices: [],
    /** 可开票订单 */
    orders: [],
    /** 申请开票面板 */
    panelVisible: false,
    submitting: false,
    selectedOrderNo: '',
    title: '',
    taxNo: '',
    type: 'personal',
    email: '',
    remark: '',
  },

  onShow() {
    this.loadInvoices();
  },

  /**
   * 加载发票列表。
   */
  loadInvoices() {
    this.setData({ loading: true });
    const params = { page: 1, page_size: 20 };
    if (this.data.activeStatus !== '') {
      params.status = this.data.activeStatus;
    }
    api
      .listInvoices(params)
      .then((data) => {
        this.setData({
          loading: false,
          invoices: ((data && data.invoices) || []).map((item) => this.mapInvoice(item)),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '发票加载失败', icon: 'none' });
      });
  },

  /**
   * 转换为展示结构。
   * @param {object} invoice Invoice
   * @returns {object}
   */
  mapInvoice(invoice) {
    const status = Number(invoice.status) || 0;
    return {
      id: invoice.id,
      order_no: invoice.order_no,
      title: invoice.title,
      tax_no: invoice.tax_no,
      type: invoice.type,
      type_text: TYPE_TEXT[invoice.type] || '发票',
      email: invoice.email,
      amount_text: format.formatYuan(invoice.amount_cents),
      status: status,
      status_text: STATUS_TEXT[status] || '未知状态',
      tone: status === 1 ? 'success' : status === 2 ? 'danger' : 'warning',
      invoice_url: invoice.invoice_url,
      remark: invoice.remark,
      created_text: format.formatDateTime(invoice.created_at),
    };
  },

  /**
   * 切换状态页签。
   */
  onTabTap(e) {
    const key = e.currentTarget.dataset.key;
    const status = key === '' ? '' : Number(key);
    if (status === this.data.activeStatus) {
      return;
    }
    this.setData({ activeStatus: status });
    this.loadInvoices();
  },

  /**
   * 打开申请开票面板，并加载可开票订单。
   */
  onOpenPanel() {
    this.setData({ panelVisible: true });
    api
      .listOrders({ page: 1, page_size: 20 })
      .then((data) => {
        const orders = ((data && data.orders) || [])
          .filter((order) => order.status !== 'ORDER_STATUS_CANCELLED' && order.status !== 'ORDER_STATUS_CLOSED')
          .map((order) => ({
            order_no: order.order_no,
            amount_text: format.formatYuan(order.payable_cents),
            amount_cents: order.payable_cents,
            created_text: format.formatDateTime(order.created_at),
          }));
        this.setData({
          orders: orders,
          selectedOrderNo: orders.length ? orders[0].order_no : '',
          title: this.data.title || '演示用户',
          email: this.data.email || 'demo@shopstack.dev',
        });
      })
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '订单加载失败', icon: 'none' });
      });
  },

  /**
   * 关闭面板。
   */
  onClosePanel() {
    this.setData({ panelVisible: false });
  },

  /**
   * 阻止弹层内部冒泡。
   */
  onStopTap() {},

  /**
   * 选择订单。
   */
  onOrderTap(e) {
    this.setData({ selectedOrderNo: e.currentTarget.dataset.no });
  },

  /**
   * 表单输入。
   */
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const patch = {};
    patch[field] = e.detail.value;
    this.setData(patch);
  },

  /**
   * 切换发票类型。
   */
  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  /**
   * 提交开票申请。
   */
  onSubmit() {
    const { selectedOrderNo, title, taxNo, type, email, remark } = this.data;
    if (!selectedOrderNo) {
      wx.showToast({ title: '请选择要开票的订单', icon: 'none' });
      return;
    }
    if (!title) {
      wx.showToast({ title: '请填写发票抬头', icon: 'none' });
      return;
    }
    if (type === 'company' && !taxNo) {
      wx.showToast({ title: '企业发票需填写税号', icon: 'none' });
      return;
    }
    if (!email) {
      wx.showToast({ title: '请填写接收邮箱', icon: 'none' });
      return;
    }
    if (this.data.submitting) {
      return;
    }
    const order = this.data.orders.filter((item) => item.order_no === selectedOrderNo)[0];
    this.setData({ submitting: true });
    api
      .createInvoice({
        order_no: selectedOrderNo,
        title: title,
        tax_no: taxNo,
        type: type,
        email: email,
        amount_cents: order ? order.amount_cents : 0,
        remark: remark,
      })
      .then(() => {
        this.setData({ submitting: false, panelVisible: false });
        wx.showToast({ title: '开票申请已提交', icon: 'success' });
        this.loadInvoices();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' });
      });
  },

  /**
   * 查看 / 复制电子发票地址。
   */
  onViewInvoice(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) {
      return;
    }
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '发票链接已复制', icon: 'none' });
      },
    });
  },

  /**
   * 重试。
   */
  onRetry() {
    this.loadInvoices();
  },
});
