/**
 * 活动场次
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/promotions/{id}/sessions
 * 场次时间为 Unix 秒级时间戳，状态 status：0 未开始 1 进行中 2 已结束。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 场次状态文案 */
const STATUS_TEXT = {
  0: '未开始',
  1: '进行中',
  2: '已结束',
};

Page({
  data: {
    loading: true,
    promotionId: 0,
    sessions: [],
  },

  onLoad(options) {
    const id = Number((options && options.promotion_id) || (options && options.id) || 0);
    this.setData({ promotionId: id });
  },

  onShow() {
    this.loadSessions();
  },

  /**
   * 加载活动场次。
   */
  loadSessions() {
    if (!this.data.promotionId) {
      this.setData({ loading: false, sessions: [] });
      return;
    }
    this.setData({ loading: true });
    api
      .listPromotionSessions(this.data.promotionId)
      .then((data) => {
        const list = (data && data.sessions) || [];
        this.setData({
          loading: false,
          sessions: list.map((item) => ({
            id: item.id,
            promotion_id: item.promotion_id,
            name: item.name,
            status: item.status,
            status_text: STATUS_TEXT[item.status] || '未开始',
            stock: item.stock || 0,
            sold: item.sold_count || 0,
            left: Math.max(0, (item.stock || 0) - (item.sold_count || 0)),
            percent: item.stock ? Math.min(100, Math.round(((item.sold_count || 0) / item.stock) * 100)) : 0,
            time_text: format.formatUnixTime(item.start_time) + ' 至 ' + format.formatUnixTime(item.end_time),
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '场次加载失败', icon: 'none' });
      });
  },

  /**
   * 进入活动会场。
   */
  onJoin(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      return;
    }
    wx.navigateTo({ url: '/subpkg-order/promotion-list/promotion-list' });
  },

  /**
   * 返回活动列表。
   */
  onGoList() {
    wx.navigateTo({ url: '/subpkg-order/promotion-list/promotion-list' });
  },
});
