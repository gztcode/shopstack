/**
 * 签到中心
 * ---------------------------------------------------------------
 * 接口：GET  /api/v1/marketing/sign-in
 *       POST /api/v1/marketing/sign-in
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    signing: false,
    signedToday: false,
    continuousDays: 0,
    totalDays: 0,
    pointsAwarded: 0,
    nextPoints: 5,
    records: [],
  },

  onShow() {
    this.loadStatus();
  },

  /**
   * 加载签到状态。
   */
  loadStatus() {
    this.setData({ loading: true });
    api
      .getSignIn()
      .then((data) => {
        this.setData({
          loading: false,
          signedToday: !!(data && data.signed_today),
          continuousDays: (data && data.continuous_days) || 0,
          totalDays: (data && data.total_days) || 0,
          pointsAwarded: (data && data.points_awarded) || 0,
          nextPoints: (data && data.next_points) || 5,
          records: ((data && data.calendar) || []).slice(0, 7),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '签到状态加载失败', icon: 'none' });
      });
  },

  /**
   * 立即签到。
   */
  onSignIn() {
    if (this.data.signing || this.data.signedToday) {
      return;
    }
    this.setData({ signing: true });
    api
      .doSignIn()
      .then((result) => {
        this.setData({ signing: false });
        if (result && result.signed_today) {
          wx.showToast({ title: '签到成功 +' + (result.points_awarded || 0) + ' 积分', icon: 'success' });
        } else {
          wx.showToast({ title: '签到失败', icon: 'none' });
        }
        this.loadStatus();
      })
      .catch((error) => {
        this.setData({ signing: false });
        wx.showToast({ title: (error && error.message) || '签到失败', icon: 'none' });
      });
  },

  /**
   * 前往签到日历。
   */
  onGoCalendar() {
    wx.navigateTo({ url: '/subpkg-order/sign-in-calendar/sign-in-calendar' });
  },

  /**
   * 前往任务中心。
   */
  onGoTasks() {
    wx.navigateTo({ url: '/subpkg-order/task-center/task-center' });
  },

  /**
   * 查看积分明细。
   */
  onGoPoints() {
    wx.navigateTo({ url: '/pages/points/points' });
  },
});
