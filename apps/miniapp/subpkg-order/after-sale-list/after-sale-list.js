/**
 * 售后列表
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/after-sales
 * 状态 status：0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成
 * 类型 type：1 仅退款 2 退货退款 3 换货
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 售后状态页签 */
const TABS = [
  { key: '', label: '全部' },
  { key: '0', label: '待审核' },
  { key: '1', label: '已通过' },
  { key: '3', label: '已退款' },
  { key: '4', label: '已完成' },
];

/** 售后状态文案 */
const STATUS_TEXT = {
  0: '待审核',
  1: '审核通过',
  2: '审核驳回',
  3: '已退款',
  4: '已完成',
};

/** 售后类型文案 */
const TYPE_TEXT = {
  1: '仅退款',
  2: '退货退款',
  3: '换货',
};

Page({
  data: {
    loading: true,
    tabs: TABS,
    activeKey: '',
    afterSales: [],
    hasMore: true,
    page: 1,
    pageSize: 10,
  },

  onLoad(options) {
    const status = options && options.status !== undefined && options.status !== '' ? String(options.status) : '';
    this.setData({ activeKey: status });
  },

  onShow() {
    this.loadAfterSales(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadAfterSales(false);
    }
  },

  /**
   * 加载售后列表。
   * @param {boolean} reset 是否重置分页
   */
  loadAfterSales(reset) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    const params = { page: page, page_size: this.data.pageSize };
    if (this.data.activeKey !== '') {
      params.status = Number(this.data.activeKey);
    }
    api
      .listAfterSales(params)
      .then((data) => {
        const list = (data && data.after_sales) || [];
        const meta = (data && data.meta) || {};
        const mapped = list.map((item) => ({
          id: item.id,
          after_sale_no: item.after_sale_no,
          order_id: item.order_id,
          order_no: item.order_no,
          reason: item.reason,
          status: item.status,
          status_text: STATUS_TEXT[item.status] || '处理中',
          amount_text: format.formatYuan(item.amount_cents),
          type_text: TYPE_TEXT[item.type] || '售后',
          created_text: format.formatDateTime(item.created_at),
        }));
        this.setData({
          loading: false,
          afterSales: reset ? mapped : this.data.afterSales.concat(mapped),
          page: page + 1,
          hasMore: page < (meta.total_pages || 1),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '售后列表加载失败', icon: 'none' });
      });
  },

  /**
   * 切换售后状态页签。
   */
  onTabTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeKey) {
      return;
    }
    this.setData({ activeKey: key });
    this.loadAfterSales(true);
  },

  /**
   * 进入售后详情。
   */
  onAfterSaleTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/subpkg-order/after-sale-detail/after-sale-detail?id=' + id });
  },

  /**
   * 空状态引导：查看订单。
   */
  onGoOrders() {
    wx.navigateTo({ url: '/pages/order-all/order-all' });
  },
});
