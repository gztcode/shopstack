/**
 * 售后详情
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/after-sales/{id}
 *       GET /api/v1/orders/{id}（展示关联商品）
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 售后状态文案（status：0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成） */
const STATUS_TEXT = {
  0: '待审核',
  1: '审核通过',
  2: '审核驳回',
  3: '已退款',
  4: '已完成',
};

/** 售后类型文案（type：1 仅退款 2 退货退款 3 换货） */
const TYPE_TEXT = {
  1: '仅退款',
  2: '退货退款',
  3: '换货',
};

Page({
  data: {
    loading: true,
    afterSaleId: 0,
    detail: null,
    items: [],
  },

  onLoad(options) {
    const id = Number((options && options.id) || 0);
    this.setData({ afterSaleId: id });
  },

  onShow() {
    this.loadDetail();
  },

  /**
   * 加载售后详情与关联商品。
   */
  loadDetail() {
    if (!this.data.afterSaleId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    api
      .getAfterSale(this.data.afterSaleId)
      .then((data) => {
        if (!data) {
          this.setData({ loading: false, detail: null });
          return null;
        }
        this.setData({
          loading: false,
          detail: {
            id: data.id,
            after_sale_no: data.after_sale_no,
            order_id: data.order_id,
            order_no: data.order_no,
            type_text: TYPE_TEXT[data.type] || '售后',
            status: data.status,
            status_text: STATUS_TEXT[data.status] || '处理中',
            reason: data.reason,
            description: data.description || '未填写补充说明',
            amount_text: format.formatYuan(data.amount_cents),
            admin_remark: data.admin_remark || '暂无平台处理意见',
            created_text: format.formatDateTime(data.created_at),
            processed_text: data.processed_at ? format.formatDateTime(data.processed_at) : '',
          },
        });
        if (!data.order_id) {
          return null;
        }
        return api.getOrder(data.order_id).then((orderData) => {
          const order = (orderData && orderData.order) || null;
          const items = (order && order.items) || [];
          this.setData({
            items: items.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_title: item.product_title,
              spec_text: item.spec_text,
              image: item.image,
              quantity: item.quantity,
              price_text: format.formatYuan(item.price_cents),
            })),
          });
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '售后详情加载失败', icon: 'none' });
      });
  },

  /**
   * 查看关联订单。
   */
  onGoOrder() {
    const orderId = this.data.detail && this.data.detail.order_id;
    if (!orderId) {
      return;
    }
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + orderId });
  },

  /**
   * 返回售后列表。
   */
  onGoList() {
    wx.navigateTo({ url: '/subpkg-order/after-sale-list/after-sale-list' });
  },
});
