/**
 * 通知设置
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/notification-settings
 *       PUT /api/v1/users/notification-settings
 */
const api = require('../../utils/api');

/** 通知渠道分组（key 与后端 UserNotificationSettings 字段一致） */
const GROUPS = [
  {
    title: '消息类型',
    items: [
      { key: 'order_notice', label: '订单通知', desc: '下单、支付、发货等订单动态' },
      { key: 'logistics_notice', label: '物流通知', desc: '包裹揽收、派送与签收提醒' },
      { key: 'marketing_notice', label: '优惠活动', desc: '大促与优惠券发放提醒' },
      { key: 'system_notice', label: '系统通知', desc: '账号安全与平台公告' },
    ],
  },
  {
    title: '接收方式',
    items: [
      { key: 'wechat_notice', label: '微信通知', desc: '在微信服务通知中接收提醒' },
      { key: 'sms_notice', label: '短信通知', desc: '重要变更通过手机短信提醒' },
      { key: 'email_notice', label: '邮件通知', desc: '发送账单与活动邮件' },
    ],
  },
];

Page({
  data: {
    loading: true,
    saving: false,
    groups: GROUPS,
    settings: {},
  },

  onShow() {
    this.loadSettings();
  },

  /**
   * 加载通知设置。
   */
  loadSettings() {
    this.setData({ loading: true });
    api
      .getNotificationSettings()
      .then((data) => {
        this.setData({ loading: false, settings: data || {} });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '通知设置加载失败', icon: 'none' });
      });
  },

  /**
   * 切换某个通知开关。
   */
  onToggle(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    if (!key) {
      return;
    }
    const settings = Object.assign({}, this.data.settings);
    settings[key] = value;
    this.setData({ settings: settings });
    this.saveSettings(settings);
  },

  /**
   * 保存通知设置。
   * @param {object} settings 新的设置
   */
  saveSettings(settings) {
    if (this.data.saving) {
      return;
    }
    this.setData({ saving: true });
    api
      .updateNotificationSettings(settings)
      .then((data) => {
        this.setData({ saving: false, settings: data || settings });
        wx.showToast({ title: '已保存', icon: 'none' });
      })
      .catch((error) => {
        this.setData({ saving: false });
        wx.showToast({ title: (error && error.message) || '保存失败', icon: 'none' });
      });
  },
});
