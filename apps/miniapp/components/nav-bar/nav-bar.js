/**
 * 自定义导航栏
 * ---------------------------------------------------------------
 * 配合页面配置 navigationStyle: "custom" 使用，自动处理状态栏高度。
 */
Component({
  properties: {
    /** 标题 */
    title: {
      type: String,
      value: '',
    },
    /** 是否展示返回按钮 */
    showBack: {
      type: Boolean,
      value: true,
    },
    /** 背景色，默认白色 */
    background: {
      type: String,
      value: '#FFFFFF',
    },
    /** 是否显示底部分隔线 */
    border: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    statusBarHeight: 20,
  },

  lifetimes: {
    attached() {
      let height = 20;
      try {
        if (typeof wx.getWindowInfo === 'function') {
          const info = wx.getWindowInfo();
          height = info.statusBarHeight || 20;
        } else if (typeof wx.getSystemInfoSync === 'function') {
          const info = wx.getSystemInfoSync();
          height = info.statusBarHeight || 20;
        }
      } catch (e) {
        height = 20;
      }
      this.setData({ statusBarHeight: height });
    },
  },

  methods: {
    /**
     * 返回上一页。
     */
    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    },
  },
});
