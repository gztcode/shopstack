/**
 * 实名认证
 * ---------------------------------------------------------------
 * 接口：POST /api/v1/users/realname
 */
const api = require('../../utils/api');

Page({
  data: {
    submitting: false,
    verified: false,
    realName: '',
    idCard: '',
  },

  /**
   * 输入真实姓名。
   */
  onInputName(e) {
    this.setData({ realName: e.detail.value });
  },

  /**
   * 输入身份证号。
   */
  onInputIdCard(e) {
    this.setData({ idCard: e.detail.value });
  },

  /**
   * 提交实名认证。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    const name = this.data.realName.trim();
    const idCard = this.data.idCard.trim();
    if (!name) {
      wx.showToast({ title: '请填写真实姓名', icon: 'none' });
      return;
    }
    if (idCard.length < 15) {
      wx.showToast({ title: '请填写正确的身份证号', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    api
      .submitRealname({ real_name: name, id_card: idCard })
      .then((user) => {
        this.setData({ submitting: false, verified: true });
        wx.showToast({ title: user && user.realname_verified ? '提交成功，等待审核' : '提交成功', icon: 'success' });
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' });
      });
  },

  /**
   * 返回账号安全。
   */
  onGoSecurity() {
    wx.navigateBack({ delta: 1, fail() {} });
  },
});
