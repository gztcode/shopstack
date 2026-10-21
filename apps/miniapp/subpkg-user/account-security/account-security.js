/**
 * 账号安全
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/users/security
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 风险等级文案（risk_level：0 安全 1 中 2 高） */
const RISK_TEXT = {
  0: '安全',
  1: '中等风险',
  2: '高风险',
};

Page({
  data: {
    loading: true,
    security: null,
  },

  onShow() {
    this.loadSecurity();
  },

  /**
   * 加载账号安全状态。
   */
  loadSecurity() {
    this.setData({ loading: true });
    api
      .getAccountSecurity()
      .then((data) => {
        this.setData({
          loading: false,
          security: data
            ? {
                phone_bound: !!data.phone_bound,
                email_bound: !!data.email_bound,
                wechat_bound: !!data.wechat_bound,
                realname_verified: !!data.realname_verified,
                risk_text: RISK_TEXT[data.risk_level === undefined ? 0 : data.risk_level] || '安全',
                risk_level: data.risk_level === undefined ? 0 : data.risk_level,
                password_changed_text: data.password_changed_at ? '最近修改于 ' + format.formatDate(data.password_changed_at) : '暂未修改过密码',
                warnings: data.warnings || [],
              }
            : null,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '账号安全加载失败', icon: 'none' });
      });
  },

  /**
   * 重新加载账号安全信息。
   */
  onReload() {
    this.loadSecurity();
  },

  /**
   * 前往实名认证。
   */
  onGoRealname() {
    wx.navigateTo({ url: '/subpkg-user/realname/realname' });
  },

  /**
   * 前往账号与安全帮助说明。
   */
  onGoHelp() {
    wx.navigateTo({ url: '/subpkg-user/help-article/help-article?id=8' });
  },
});
