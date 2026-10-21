/**
 * 价格文本
 * ---------------------------------------------------------------
 * 统一金额展示：传入「分」，组件内部换算为「元」并按需展示原价划线。
 */
const format = require('../../utils/format');

Component({
  properties: {
    /** 金额（分） */
    cents: {
      type: Number,
      value: 0,
      observer: 'refresh',
    },
    /** 是否展示原价 */
    showOriginal: {
      type: Boolean,
      value: false,
    },
    /** 原价（分） */
    originalCents: {
      type: Number,
      value: 0,
    },
    /** 字号：sm / md / lg / xl */
    size: {
      type: String,
      value: 'md',
    },
  },

  data: {
    value: '0.00',
    originalValue: '0.00',
  },

  lifetimes: {
    attached() {
      this.refresh();
    },
  },

  methods: {
    /**
     * 金额格式化。
     */
    refresh() {
      this.setData({
        value: format.formatYuan(this.data.cents),
        originalValue: format.formatYuan(this.data.originalCents),
      });
    },
  },
});
