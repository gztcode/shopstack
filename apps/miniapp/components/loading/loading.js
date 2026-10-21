/**
 * 加载骨架
 * ---------------------------------------------------------------
 * 提供卡片 / 列表 / 详情三种骨架形态，避免页面出现空白等待。
 */
Component({
  properties: {
    /** 骨架形态：card | list | detail */
    type: {
      type: String,
      value: 'card',
    },
    /** 列表形态下的条数 */
    rows: {
      type: Number,
      value: 3,
    },
  },

  data: {
    rowList: [1, 2, 3],
  },

  observers: {
    rows(value) {
      const count = Math.max(1, Math.min(10, Number(value) || 3));
      const list = [];
      for (let i = 0; i < count; i += 1) {
        list.push(i + 1);
      }
      this.setData({ rowList: list });
    },
  },
});
