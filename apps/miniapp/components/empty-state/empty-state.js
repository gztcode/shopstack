/**
 * 空状态
 * ---------------------------------------------------------------
 * 用于列表为空、无地址、无订单等场景，可携带一个行动按钮。
 */
Component({
  properties: {
    /** 图标（emoji） */
    icon: {
      type: String,
      value: '📦',
    },
    /** 主文案 */
    title: {
      type: String,
      value: '暂无数据',
    },
    /** 补充说明 */
    desc: {
      type: String,
      value: '',
    },
    /** 行动按钮文案，为空则不展示 */
    actionText: {
      type: String,
      value: '',
    },
  },

  methods: {
    /**
     * 点击行动按钮。
     */
    onAction() {
      this.triggerEvent('action', {});
    },
  },
});
