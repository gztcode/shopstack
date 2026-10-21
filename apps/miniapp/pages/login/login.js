/**
 * 登录 / 注册页
 * ---------------------------------------------------------------
 * 支持账号密码登录、注册与微信登录（wx.login -> /auth/wechat）。
 */
const auth = require('../../utils/auth');

Page({
  data: {
    mode: 'login',
    submitting: false,
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    nickname: '',
  },

  /**
   * 切换登录 / 注册。
   */
  onModeTap(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const patch = {};
    patch[field] = value;
    this.setData(patch);
  },

  /**
   * 账号密码登录。
   */
  onLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入账号与密码', icon: 'none' });
      return;
    }
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    auth
      .login(username, password)
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.goBack();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '登录失败', icon: 'none' });
      });
  },

  /**
   * 注册账号。
   */
  onRegister() {
    const { username, password, confirmPassword, phone, nickname } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请填写账号与密码', icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次输入的密码不一致', icon: 'none' });
      return;
    }
    if (this.data.submitting) {
      return;
    }
    this.setData({ submitting: true });
    auth
      .register({
        username: username,
        password: password,
        phone: phone,
        nickname: nickname || username,
        sms_code: '',
      })
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: '注册成功', icon: 'success' });
        this.goBack();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '注册失败', icon: 'none' });
      });
  },

  /**
   * 微信登录。
   */
  onWechatLogin() {
    if (this.data.submitting) {
      return;
    }
    if (typeof wx.login !== 'function') {
      wx.showToast({ title: '当前环境不支持微信登录', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.login({
      success: (res) => {
        if (!res || !res.code) {
          this.setData({ submitting: false });
          wx.showToast({ title: '获取登录凭证失败', icon: 'none' });
          return;
        }
        auth
          .wechatLogin(res.code, this.data.nickname, '')
          .then(() => {
            this.setData({ submitting: false });
            wx.showToast({ title: '登录成功', icon: 'success' });
            this.goBack();
          })
          .catch((error) => {
            this.setData({ submitting: false });
            wx.showToast({ title: (error && error.message) || '微信登录失败', icon: 'none' });
          });
      },
      fail: () => {
        this.setData({ submitting: false });
        wx.showToast({ title: '微信授权失败', icon: 'none' });
      },
    });
  },

  /**
   * 登录成功后返回来源页面。
   */
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/index/index' });
  },
});
