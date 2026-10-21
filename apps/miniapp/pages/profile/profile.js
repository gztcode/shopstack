/**
 * 我的
 * ---------------------------------------------------------------
 * 用户信息卡（头像 / 昵称 / 积分 / 余额）、订单状态入口（带角标）、功能宫格。
 */
const api = require('../../utils/api');
const auth = require('../../utils/auth');
const format = require('../../utils/format');

Page({
  data: {
    loggedIn: false,
    user: {},
    pointsText: '0',
    balanceText: '0.00',
    counts: { pending_payment: 0, pending_shipment: 0, pending_receipt: 0, refunding: 0 },
    orderEntries: [
      { key: 'ORDER_STATUS_PENDING_PAYMENT', label: '待付款', icon: '💰', countKey: 'pending_payment' },
      { key: 'ORDER_STATUS_PAID', label: '待发货', icon: '📦', countKey: 'pending_shipment' },
      { key: 'ORDER_STATUS_SHIPPED', label: '待收货', icon: '🚚', countKey: 'pending_receipt' },
      { key: 'ORDER_STATUS_REFUNDING', label: '退款中', icon: '↩️', countKey: 'refunding' },
    ],
    menuEntries: [
      { key: 'points', label: '积分明细', icon: '⭐' },
      { key: 'invoices', label: '发票管理', icon: '🧾' },
      { key: 'logistics', label: '物流跟踪', icon: '🚚' },
      { key: 'refund', label: '售后申请', icon: '🛠️' },
      { key: 'reviews', label: '我的评价', icon: '💬' },
      { key: 'couponCenter', label: '领券中心', icon: '🎁' },
      { key: 'coupons', label: '我的券', icon: '🎟️' },
      { key: 'favorites', label: '我的收藏', icon: '❤️' },
      { key: 'history', label: '浏览足迹', icon: '🕘' },
      { key: 'address', label: '收货地址', icon: '📮' },
      { key: 'notifications', label: '消息通知', icon: '🔔' },
      { key: 'profile', label: '编辑资料', icon: '✏️' },
    ],
    /** 扩展服务入口（频道 / 活动 / 拼团 / 会员 / 账户等） */
    moreEntries: [
      { key: 'signIn', label: '签到中心', icon: '📅' },
      { key: 'taskCenter', label: '任务中心', icon: '📋' },
      { key: 'promotions', label: '活动列表', icon: '🎉' },
      { key: 'groupBuy', label: '拼团列表', icon: '👥' },
      { key: 'orderDone', label: '已完成订单', icon: '✅' },
      { key: 'orderCancel', label: '已取消订单', icon: '🚫' },
      { key: 'afterSaleList', label: '售后列表', icon: '🛠️' },
      { key: 'orderConfirm', label: '订单确认', icon: '🧾' },
      { key: 'logisticsQuery', label: '物流查询', icon: '🔎' },
      { key: 'logisticsTrace', label: '物流轨迹', icon: '🚚' },
      { key: 'channels', label: '频道列表', icon: '🧭' },
      { key: 'reviewTags', label: '评价标签', icon: '🏷️' },
      { key: 'myReviews', label: '我的评价', icon: '💭' },
      { key: 'productParams', label: '商品参数', icon: '📋' },
      { key: 'productQuestions', label: '商品问答', icon: '❓' },
      { key: 'userLevel', label: '会员等级', icon: '🏅' },
      { key: 'growthLogs', label: '成长值', icon: '📈' },
      { key: 'accountSecurity', label: '账号安全', icon: '🔐' },
      { key: 'notificationSetting', label: '通知设置', icon: '🔔' },
      { key: 'invoiceTemplate', label: '发票抬头', icon: '🧾' },
      { key: 'region', label: '收货地区', icon: '🗺️' },
      { key: 'helpCenter', label: '帮助中心', icon: '💡' },
      { key: 'feedback', label: '意见反馈', icon: '📝' },
    ],
  },

  onShow() {
    this.loadUser();
    this.loadCounts();
  },

  /**
   * 加载用户信息。
   */
  loadUser() {
    const cached = auth.getUser();
    const loggedIn = auth.isLoggedIn();
    if (!loggedIn) {
      this.setData({ loggedIn: false, user: {}, pointsText: '0', balanceText: '0.00' });
      return;
    }
    this.setData({
      loggedIn: true,
      user: cached || {},
      pointsText: String((cached && cached.points) || 0),
      balanceText: format.formatYuan((cached && cached.balance_cents) || 0),
    });
    auth
      .getProfile()
      .then((user) => {
        this.setData({
          user: user,
          pointsText: String(user.points || 0),
          balanceText: format.formatYuan(user.balance_cents || 0),
        });
      })
      .catch(() => null);
  },

  /**
   * 加载订单状态数量。
   */
  loadCounts() {
    if (!this.data.loggedIn) {
      return;
    }
    api
      .getOrderCount()
      .then((data) => {
        this.setData({
          counts: {
            pending_payment: data.pending_payment || 0,
            pending_shipment: data.pending_shipment || 0,
            pending_receipt: data.pending_receipt || 0,
            refunding: data.refunding || 0,
          },
        });
      })
      .catch(() => null);
  },

  /**
   * 点击用户卡片：未登录引导登录。
   */
  onUserTap() {
    if (!this.data.loggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },

  /**
   * 订单状态入口。
   */
  onOrderEntryTap(e) {
    const status = e.currentTarget.dataset.status;
    if (!this.data.loggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const routes = {
      ORDER_STATUS_PENDING_PAYMENT: '/subpkg-order/order-pay/order-pay',
      ORDER_STATUS_PAID: '/subpkg-order/order-ship/order-ship',
      ORDER_STATUS_SHIPPED: '/subpkg-order/order-receive/order-receive',
      ORDER_STATUS_REFUNDING: '/subpkg-order/order-refunding/order-refunding',
    };
    wx.navigateTo({ url: routes[status] || '/pages/order-all/order-all' });
  },

  /**
   * 全部订单。
   */
  onAllOrders() {
    if (!this.data.loggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/order-all/order-all' });
  },

  /**
   * 功能宫格。
   */
  onMenuTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'profile') {
      this.editProfile();
      return;
    }
    // 浏览足迹是本地数据，无需登录；其余均需要登录态
    if (!this.data.loggedIn && key !== 'history') {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const routes = {
      address: '/pages/address/address',
      favorites: '/pages/favorites/favorites',
      coupons: '/pages/coupons/coupons',
      couponCenter: '/pages/coupon-center/coupon-center',
      notifications: '/pages/notifications/notifications',
      points: '/pages/points/points',
      invoices: '/pages/invoices/invoices',
      logistics: '/pages/logistics/logistics',
      reviews: '/pages/reviews/reviews',
      refund: '/pages/refund/refund',
      history: '/pages/history/history',
      // 扩展服务
      signIn: '/pages/sign-in/sign-in',
      taskCenter: '/subpkg-order/task-center/task-center',
      promotions: '/subpkg-order/promotion-list/promotion-list',
      groupBuy: '/subpkg-order/group-buy-list/group-buy-list',
      orderDone: '/subpkg-order/order-done/order-done',
      orderCancel: '/subpkg-order/order-cancel/order-cancel',
      afterSaleList: '/subpkg-order/after-sale-list/after-sale-list',
      orderConfirm: '/subpkg-order/order-confirm/order-confirm',
      logisticsQuery: '/subpkg-order/logistics-track/logistics-track',
      logisticsTrace: '/subpkg-order/logistics-trace/logistics-trace?order_id=1',
      channels: '/subpkg-shop/channels/channels',
      reviewTags: '/subpkg-shop/review-tags/review-tags',
      myReviews: '/subpkg-shop/my-reviews/my-reviews',
      productParams: '/subpkg-shop/product-params/product-params?product_id=1',
      productQuestions: '/subpkg-shop/product-questions/product-questions?product_id=1',
      userLevel: '/subpkg-user/user-level/user-level',
      growthLogs: '/subpkg-user/growth-logs/growth-logs',
      accountSecurity: '/subpkg-user/account-security/account-security',
      notificationSetting: '/subpkg-user/notification-setting/notification-setting',
      invoiceTemplate: '/subpkg-user/invoice-template/invoice-template',
      region: '/subpkg-user/region/region',
      helpCenter: '/subpkg-user/help-center/help-center',
      feedback: '/subpkg-user/feedback/feedback',
    };
    if (routes[key]) {
      wx.navigateTo({ url: routes[key] });
    }
  },

  /**
   * 编辑昵称。
   */
  editProfile() {
    if (!this.data.loggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.showModal({
      title: '编辑昵称',
      editable: true,
      placeholderText: this.data.user.nickname || '请输入昵称',
      success: (res) => {
        if (!res.confirm || !res.content) {
          return;
        }
        api
          .updateProfile({ nickname: res.content })
          .then((user) => {
            this.setData({
              user: user,
              pointsText: String(user.points || 0),
              balanceText: format.formatYuan(user.balance_cents || 0),
            });
            wx.showToast({ title: '已保存', icon: 'success' });
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '保存失败', icon: 'none' });
          });
      },
    });
  },

  /**
   * 退出登录。
   */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        auth.logout().then(() => {
          this.setData({ loggedIn: false, user: {}, pointsText: '0', balanceText: '0.00' });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        });
      },
    });
  },

  /**
   * 联系客服。
   */
  onService() {
    wx.showModal({
      title: '联系客服',
      content: '客服热线 400-888-8888（服务时间 9:00 - 21:00）',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
