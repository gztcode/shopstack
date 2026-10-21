/**
 * 签到日历
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/marketing/sign-in
 * 日历数据来自接口返回的 calendar（SignInCalendarDay：date / signed / points）。
 */
const api = require('../../utils/api');

/** 星期表头 */
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    loading: true,
    monthText: '',
    week: WEEK,
    days: [],
    continuousDays: 0,
    totalDays: 0,
  },

  onShow() {
    this.loadSignIn();
  },

  /**
   * 加载签到记录并生成日历。
   */
  loadSignIn() {
    this.setData({ loading: true });
    api
      .getSignIn()
      .then((data) => {
        const calendar = (data && data.calendar) || [];
        this.setData({
          loading: false,
          continuousDays: (data && data.continuous_days) || 0,
          totalDays: (data && data.total_days) || 0,
          monthText: this.monthTitle(),
          days: this.buildDays(calendar),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '签到记录加载失败', icon: 'none' });
      });
  },

  /**
   * 当前月份标题。
   * @returns {string}
   */
  monthTitle() {
    const now = new Date();
    return now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月';
  },

  /**
   * 生成当月日历格子。
   * @param {Array} calendar 接口返回的签到日历
   * @returns {Array}
   */
  buildDays(calendar) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const todayKey = year + '-' + pad(month + 1) + '-' + pad(now.getDate());
    const offset = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i += 1) {
      cells.push({ key: 'blank-' + i, day: '', empty: true, signed: false, today: false, points: 0 });
    }
    for (let d = 1; d <= total; d += 1) {
      const key = year + '-' + pad(month + 1) + '-' + pad(d);
      const record = (calendar || []).filter((item) => item.date === key)[0];
      cells.push({
        key: key,
        day: String(d),
        empty: false,
        signed: !!(record && record.signed),
        today: key === todayKey,
        points: record ? record.points : 0,
      });
    }
    return cells;
  },

  /**
   * 点击某一天，查看当天签到情况。
   */
  onDayTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) {
      return;
    }
    const day = this.data.days.filter((item) => item.key === key)[0];
    if (!day) {
      return;
    }
    wx.showToast({
      title: day.signed ? key + ' 已签到 +' + day.points + ' 积分' : key + ' 未签到',
      icon: 'none',
    });
  },

  /**
   * 跳转到签到中心。
   */
  onGoSignIn() {
    wx.navigateTo({ url: '/pages/sign-in/sign-in' });
  },
});
