/**
 * 领券中心
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/coupons?page.page=1&page.page_size=20
 *       POST /api/v1/coupons/{coupon_id}/receive
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    coupons: [],
    /** 领取中的优惠券 ID */
    claiming: 0,
  },

  onShow() {
    this.loadCoupons();
  },

  /**
   * 加载可领取优惠券，并标记已领取的券。
   */
  loadCoupons() {
    this.setData({ loading: true });
    Promise.all([api.listCoupons({ page: 1, page_size: 20 }), api.listUserCoupons({ page: 1, page_size: 100 })]).then(
      (results) => {
        const list = (results[0] && results[0].coupons) || [];
        const mine = (results[1] && results[1].coupons) || [];
        const received = {};
        mine.forEach((item) => {
          received[item.coupon_id] = true;
        });
        this.setData({
          loading: false,
          coupons: list.map((item) => this.mapCoupon(item, received[item.id])),
        });
      },
      (error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '优惠券加载失败', icon: 'none' });
      }
    );
  },

  /**
   * 转换为展示结构。
   * @param {object} coupon Coupon
   * @param {boolean} received 是否已领取
   * @returns {object}
   */
  mapCoupon(coupon, received) {
    // 面额：优先 proto 字段 face_value_cents，兼容 amount_cents
    const faceValue = Number(format.pick(coupon, 'face_value_cents', format.pick(coupon, 'amount_cents', 0))) || 0;
    // 折扣：优先 proto 字段 percent，兼容 discount_percent
    const percent = Number(format.pick(coupon, 'percent', format.pick(coupon, 'discount_percent', 0))) || 0;
    const type = format.pick(coupon, 'type', '');
    let value = '';
    if (type === 'COUPON_TYPE_PERCENT' || (!type && percent)) {
      value = (percent / 10).toFixed(1).replace(/\.0$/, '') + ' 折';
    } else if (type === 'COUPON_TYPE_SHIPPING') {
      value = '免运费';
    } else {
      value = '¥' + format.formatYuan(faceValue);
    }
    const minAmount = Number(format.pick(coupon, 'min_amount_cents', 0)) || 0;
    const total = Number(format.pick(coupon, 'total_quantity', 0)) || 0;
    const receivedCount = Number(format.pick(coupon, 'received_quantity', 0)) || 0;
    const endTime = format.pick(coupon, 'end_time', '') || format.pick(coupon, 'expire_at', '');
    return {
      id: coupon.id,
      name: coupon.name || '',
      code: coupon.code || '',
      value: value,
      threshold: minAmount > 0 ? '满 ' + format.formatYuan(minAmount) + ' 元可用' : '无门槛使用',
      remaining: total > 0 ? Math.max(total - receivedCount, 0) : 0,
      total: total,
      received: receivedCount,
      expire_text: format.formatDate(endTime),
      description: format.pick(coupon, 'description', '') || '',
      received_flag: !!received,
    };
  },

  /**
   * 立即领取。
   */
  onReceive(e) {
    const id = Number(e.currentTarget.dataset.id) || 0;
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
      })
      .catch((error) => {
        this.setData({ claiming: 0 });
        wx.showToast({ title: (error && error.message) || '领取失败', icon: 'none' });
      });
  },

  /**
   * 去我的优惠券。
   */
  onMyCoupons() {
    wx.navigateTo({ url: '/pages/coupons/coupons' });
  },

  /**
   * 重试。
   */
  onRetry() {
    this.loadCoupons();
  },
});
