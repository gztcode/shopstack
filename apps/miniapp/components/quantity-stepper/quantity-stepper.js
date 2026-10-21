/**
 * 数量步进器
 * ---------------------------------------------------------------
 * 支持最小值 / 最大值限制，数值变化时派发 change 事件。
 */
Component({
  properties: {
    /** 当前数量 */
    value: {
      type: Number,
      value: 1,
    },
    /** 最小值 */
    min: {
      type: Number,
      value: 1,
    },
    /** 最大值 */
    max: {
      type: Number,
      value: 99,
    },
    /** 是否禁用 */
    disabled: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    /**
     * 数量减一。
     */
    onMinus() {
      if (this.data.disabled) {
        return;
      }
      const next = this.data.value - 1;
      if (next < this.data.min) {
        return;
      }
      this.triggerEvent('change', { value: next });
    },

    /**
     * 数量加一。
     */
    onAdd() {
      if (this.data.disabled) {
        return;
      }
      const next = this.data.value + 1;
      if (next > this.data.max) {
        wx.showToast({ title: '已达最大可购买数量', icon: 'none' });
        return;
      }
      this.triggerEvent('change', { value: next });
    },
  },
});
