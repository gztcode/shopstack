/**
 * 消息通知
 * ---------------------------------------------------------------
 * 按类型筛选消息、标记已读，点击跳转对应业务页面。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    filters: [
      { key: 0, label: '全部' },
      { key: 1, label: '订单' },
      { key: 2, label: '物流' },
      { key: 3, label: '优惠' },
      { key: 4, label: '系统' },
    ],
    activeType: 0,
    notifications: [],
    unreadCount: 0,
  },

  onShow() {
    this.loadNotifications();
  },

  /**
   * 加载消息列表。
   */
  loadNotifications() {
    this.setData({ loading: true });
    api
      .listNotifications({ page: 1, page_size: 50, type: this.data.activeType })
      .then((data) => {
        const list = (data && data.notifications) || [];
        this.setData({
          loading: false,
          notifications: list.map((item) => {
            const typeInfo = enums.NOTIFICATION_TYPE[item.type] || { text: '系统消息', icon: '🔔' };
            return {
              id: item.id,
              type: item.type,
              type_text: typeInfo.text,
              icon: typeInfo.icon,
              title: item.title,
              content: item.content,
              link: item.link,
              read: item.read,
              time_text: format.fromNow(item.created_at),
              created_text: format.formatDateTime(item.created_at),
            };
          }),
          unreadCount: (data && data.unread_count) || 0,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 切换消息类型。
   */
  onFilterTap(e) {
    const type = Number(e.currentTarget.dataset.type) || 0;
    if (type === this.data.activeType) {
      return;
    }
    this.setData({ activeType: type });
    this.loadNotifications();
  },

  /**
   * 全部标记为已读。
   */
  onMarkAllRead() {
    api
      .markAllNotificationsRead()
      .then(() => {
        wx.showToast({ title: '已全部标记为已读', icon: 'none' });
        this.loadNotifications();
      })
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
      });
  },

  /**
   * 点击消息：标记已读并跳转。
   */
  onNotificationTap(e) {
    const id = e.currentTarget.dataset.id;
    const link = e.currentTarget.dataset.link;
    const item = this.data.notifications.filter((n) => n.id === id)[0];
    if (item && !item.read) {
      api
        .markNotificationRead(id)
        .then(() => this.loadNotifications())
        .catch(() => null);
    }
    if (!link) {
      return;
    }
    if (link.indexOf('/pages/category/category') === 0 || link.indexOf('/pages/index/index') === 0) {
      wx.switchTab({ url: link.split('?')[0] });
      return;
    }
    wx.navigateTo({ url: link });
  },
});
