/**
 * 退款原因
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/refund-reasons
 * 从申请售后页进入时，选择结果会回写到上一页的「退款原因」。
 */
const api = require('../../utils/api');

/** 退款原因类型文案（type：1 仅退款 2 退货退款 3 换货） */
const TYPE_TEXT = {
  1: '仅退款',
  2: '退货退款',
  3: '换货',
};

Page({
  data: {
    loading: true,
    reasons: [],
  },

  onShow() {
    this.loadReasons();
  },

  /**
   * 加载退款原因字典。
   */
  loadReasons() {
    this.setData({ loading: true });
    api
      .listRefundReasons()
      .then((data) => {
        const list = (data && data.reasons) || [];
        this.setData({
          loading: false,
          reasons: list.map((item) => ({
            id: item.id,
            name: item.name,
            type_text: TYPE_TEXT[item.type] || '售后',
            sort: item.sort,
            enabled: item.enabled,
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '退款原因加载失败', icon: 'none' });
      });
  },

  /**
   * 选择退款原因并回写到申请售后页。
   */
  onReasonTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) {
      return;
    }
    const pages = getCurrentPages();
    const previous = pages.length > 1 ? pages[pages.length - 2] : null;
    if (previous && typeof previous.setData === 'function') {
      previous.setData({ reason: name });
      wx.navigateBack();
      return;
    }
    wx.showToast({ title: '已选择：' + name, icon: 'none' });
  },

  /**
   * 去售后列表。
   */
  onGoApply() {
    wx.navigateTo({ url: '/subpkg-order/after-sale-list/after-sale-list' });
  },
});
