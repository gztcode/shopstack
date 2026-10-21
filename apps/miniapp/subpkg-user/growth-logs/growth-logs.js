/**
 * 成长值明细
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/growth-logs
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    logs: [],
    currentGrowth: 0,
    hasMore: true,
    page: 1,
    pageSize: 15,
  },

  onShow() {
    this.loadLogs(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs(false);
    }
  },

  /**
   * 空状态引导：查看会员等级。
   */
  onGoLevel() {
    wx.navigateTo({ url: '/subpkg-user/user-level/user-level' });
  },

  /**
   * 加载成长值明细。
   * @param {boolean} reset 是否重置分页
   */
  loadLogs(reset) {
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    api
      .listGrowthLogs({ page: page, page_size: this.data.pageSize })
      .then((data) => {
        const list = (data && data.logs) || [];
        const meta = (data && data.meta) || {};
        const mapped = list.map((item) => ({
          id: item.id,
          title: item.title,
          change: item.change,
          change_text: (item.change > 0 ? '+' : '') + item.change,
          balance: item.balance,
          created_text: format.formatDateTime(item.created_at),
        }));
        this.setData({
          loading: false,
          logs: reset ? mapped : this.data.logs.concat(mapped),
          currentGrowth: (data && data.current_growth) || 0,
          page: page + 1,
          hasMore: page < (meta.total_pages || 1),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '成长值明细加载失败', icon: 'none' });
      });
  },
});
