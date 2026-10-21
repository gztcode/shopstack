/**
 * 优惠券条目
 * ---------------------------------------------------------------
 * 入参为 UserCoupon 结构（含 coupon 字段），组件内部负责展示门槛、面额与有效期。
 */
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Component({
  properties: {
    /** UserCoupon 对象 */
    coupon: {
      type: Object,
      value: null,
      observer: 'refresh',
    },
    /** 是否选中 */
    selected: {
      type: Boolean,
      value: false,
    },
    /** 是否禁用（已使用 / 已过期 / 不可用） */
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    name: '',
    value: '',
    threshold: '',
    period: '',
    statusText: '',
  },

  methods: {
    /**
     * 选择优惠券。
     */
    onSelect() {
      if (this.data.disabled) {
        return;
      }
      this.triggerEvent('select', { coupon: this.data.coupon });
    },

    /**
     * 计算展示文案。
     */
    refresh() {
      const userCoupon = this.data.coupon;
      if (!userCoupon || !userCoupon.coupon) {
        this.setData({ name: '', value: '', threshold: '', period: '', statusText: '' });
        return;
      }
      const coupon = userCoupon.coupon;
      let value = '';
      if (coupon.type === 'COUPON_TYPE_FIXED') {
        value = '¥' + format.formatYuan(coupon.face_value_cents);
      } else if (coupon.type === 'COUPON_TYPE_PERCENT') {
        const discount = (coupon.percent / 10).toFixed(1).replace(/\.0$/, '');
        value = discount + ' 折';
      } else {
        value = '免运费';
      }
      const threshold = coupon.min_amount_cents > 0 ? '满 ' + format.formatYuan(coupon.min_amount_cents) + ' 元可用' : '无门槛使用';
      const period = format.formatDate(coupon.start_time) + ' 至 ' + format.formatDate(coupon.end_time);
      this.setData({
        name: coupon.name,
        value: value,
        threshold: threshold,
        period: period,
        statusText: enums.textOf(enums.USER_COUPON_STATUS, userCoupon.status, ''),
      });
    },
  },
});
