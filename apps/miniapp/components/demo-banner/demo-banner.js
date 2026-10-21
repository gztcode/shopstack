/**
 * 演示数据模式提示条
 * ---------------------------------------------------------------
 * 当后端未就绪、请求回退到内置演示数据时，在页面顶部展示提示。
 */
Component({
  properties: {
    text: {
      type: String,
      value: '演示数据模式：后端服务未连接，当前展示内置示例数据',
    },
  },

  data: {
    visible: false,
  },

  lifetimes: {
    attached() {
      this._listener = (demoMode) => {
        this.setData({ visible: !!demoMode });
      };
      this._syncState();
      try {
        const app = getApp();
        if (app && typeof app.onDemoMode === 'function') {
          app.onDemoMode(this._listener);
          this._subscribed = true;
        }
      } catch (e) {
        // ignore
      }
    },
    detached() {
      try {
        const app = getApp();
        if (app && this._subscribed && typeof app.offDemoMode === 'function') {
          app.offDemoMode(this._listener);
        }
      } catch (e) {
        // ignore
      }
    },
  },

  methods: {
    /**
     * 同步当前演示模式状态。
     */
    _syncState() {
      try {
        const app = getApp();
        this.setData({ visible: !!(app && app.globalData && app.globalData.demoMode) });
      } catch (e) {
        this.setData({ visible: false });
      }
    },
  },
});
