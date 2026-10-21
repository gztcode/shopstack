/**
 * ShopStack 电商中台 · 消费者微信小程序
 * ---------------------------------------------------------------
 * 全局负责：登录态恢复、购物车角标、演示数据模式广播。
 */

const auth = require('./utils/auth');
const api = require('./utils/api');

App({
  globalData: {
    /** 网关地址 */
    baseUrl: 'http://localhost:8080/api/v1',
    /** 是否处于演示数据模式（后端未就绪） */
    demoMode: false,
    /** 当前登录用户 */
    userInfo: null,
    /** 购物车数量角标 */
    cartCount: 0,
    /** 演示数据模式监听器 */
    demoListeners: [],
  },

  onLaunch() {
    const cached = auth.getUser();
    if (cached) {
      this.globalData.userInfo = cached;
    }
    if (auth.isLoggedIn()) {
      // 静默刷新用户信息，失败不阻塞启动（request 层会自动回退到演示数据）
      auth.getProfile().catch(() => null);
    }
    this.refreshCartCount();
  },

  /**
   * 更新购物车角标。
   */
  refreshCartCount() {
    api
      .getCartCount()
      .then((data) => {
        const count = (data && data.count) || 0;
        this.globalData.cartCount = count;
        this.setCartBadge(count);
      })
      .catch(() => null);
  },

  /**
   * 设置购物车 tab 角标（仅 tabBar 页面可调用）。
   * @param {number} count 数量
   */
  setCartBadge(count) {
    if (!count) {
      wx.removeTabBarBadge({ index: 2, fail() {} });
      return;
    }
    wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count), fail() {} });
  },

  /**
   * 广播演示数据模式变化。
   */
  notifyDemoMode() {
    const listeners = this.globalData.demoListeners || [];
    listeners.forEach((fn) => {
      try {
        fn(this.globalData.demoMode);
      } catch (e) {
        // ignore
      }
    });
  },

  /**
   * 订阅演示数据模式变化。
   * @param {Function} fn 回调
   */
  onDemoMode(fn) {
    if (typeof fn !== 'function') {
      return;
    }
    this.globalData.demoListeners = (this.globalData.demoListeners || []).concat(fn);
  },

  /**
   * 取消订阅。
   * @param {Function} fn 回调
   */
  offDemoMode(fn) {
    this.globalData.demoListeners = (this.globalData.demoListeners || []).filter((item) => item !== fn);
  },
});
