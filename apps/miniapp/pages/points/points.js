/**
 * 积分明细
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/points-logs?page.page=1&page.page_size=20
 * 响应：{ logs: PointsLog[], meta, current_points }
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 变动类型中文映射 */
const TYPE_TEXT = {
  earn: '获得',
  consume: '消费',
  expire: '过期',
  refund: '退回',
  register: '注册',
  order: '订单',
  exchange: '兑换',
  admin: '运营',
};

Page({
  data: {
    loading: true,
    loadingMore: false,
    /** 当前积分 */
    currentPoints: 0,
    /** 累计获得 */
    earned: 0,
    /** 累计消费 */
    consumed: 0,
    logs: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
  },

  onShow() {
    this.loadLogs(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadLogs(false);
    }
  },

  /**
   * 加载积分明细。
   * @param {boolean} reset 是否重置分页
   */
  loadLogs(reset) {
    const page = reset ? 1 : this.data.page;
    this.setData(reset ? { loading: true, page: 1 } : { loadingMore: true });
    api
      .listPointsLogs({ page: page, page_size: this.data.pageSize })
      .then((data) => {
        const list = (data && data.logs) || [];
        const meta = (data && data.meta) || {};
        const mapped = list.map((item) => this.mapLog(item));
        const logs = reset ? mapped : this.data.logs.concat(mapped);
        const earned = this.data.earned;
        const consumed = this.data.consumed;
        let gained = earned;
        let used = consumed;
        mapped.forEach((item) => {
          if (item.change > 0) {
            gained += item.change;
          } else {
            used += Math.abs(item.change);
          }
        });
        this.setData({
          loading: false,
          loadingMore: false,
          currentPoints: (data && data.current_points) || 0,
          earned: gained,
          consumed: used,
          logs: logs,
          page: page + 1,
          hasMore: page < (meta.total_pages || 1),
        });
      })
      .catch((error) => {
        this.setData({ loading: false, loadingMore: false });
        wx.showToast({ title: (error && error.message) || '积分明细加载失败', icon: 'none' });
      });
  },

  /**
   * 转换为页面展示结构。
   * @param {object} log PointsLog
   * @returns {object}
   */
  mapLog(log) {
    const change = Number(format.pick(log, 'change', 0)) || 0;
    const rawType = format.pick(log, 'type', '') || '';
    const bizType = format.pick(log, 'biz_type', '') || '';
    let typeText = TYPE_TEXT[rawType] || '';
    if (!typeText && bizType) {
      typeText = TYPE_TEXT[bizType] || '';
    }
    if (!typeText) {
      typeText = change >= 0 ? '获得' : '消费';
    }
    return {
      id: log.id,
      title: format.pick(log, 'title', '') || format.pick(log, 'remark', '') || '积分变动',
      change: change,
      change_text: (change > 0 ? '+' : '') + change,
      balance: format.pick(log, 'balance', 0),
      type_text: typeText,
      order_no: format.pick(log, 'order_no', ''),
      created_text: format.formatDateTime(log.created_at),
    };
  },

  /**
   * 空状态：去首页逛逛。
   */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /**
   * 重试。
   */
  onRetry() {
    this.loadLogs(true);
  },
});
