/**
 * 优惠券
 * ---------------------------------------------------------------
 * 未使用 / 已使用 / 已过期分类，以及可领取的平台优惠券。
 */
const api = require('../../utils/api');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    tabs: enums.COUPON_TABS,
    activeStatus: 1,
    coupons: [],
    availableCount: 0,
    /** 可领取的平台优惠券 */
    claimable: [],
    claiming: 0,
  },

  onLoad() {
    this.loadClaimable();
  },

  onShow() {
    this.loadCoupons();
  },

  /**
   * 加载我的优惠券。
   */
  loadCoupons() {
    this.setData({ loading: true });
    api
      .listUserCoupons({ page: 1, page_size: 50, status: this.data.activeStatus })
      .then((data) => {
        this.setData({
          loading: false,
          coupons: (data && data.coupons) || [],
          availableCount: (data && data.available_count) || 0,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 加载可领取的优惠券。
   */
  loadClaimable() {
    api
      .listCoupons({ page: 1, page_size: 20 })
      .then((data) => {
        this.setData({ claimable: (data && data.coupons) || [] });
      })
      .catch(() => null);
  },

  /**
   * 切换优惠券状态页签。
   */
  onTabTap(e) {
    const status = Number(e.currentTarget.dataset.status);
    if (status === this.data.activeStatus) {
      return;
    }
    this.setData({ activeStatus: status });
    this.loadCoupons();
  },

  /**
   * 领取优惠券。
   */
  onReceive(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.claiming) {
      return;
    }
    this.setData({ claiming: id });
    api
      .receiveCoupon(id)
      .then(() => {
        this.setData({ claiming: 0 });
        wx.showToast({ title: '领取成功', icon: 'success' });
        this.loadCoupons();
        this.loadClaimable();
      })
      .catch((error) => {
        this.setData({ claiming: 0 });
        wx.showToast({ title: (error && error.message) || '领取失败', icon: 'none' });
      });
  },

  /**
   * 前往领券中心领取更多优惠券。
   */
  onGoShopping() {
    wx.navigateTo({ url: '/pages/coupon-center/coupon-center' });
  },
});
