/**
 * 意见反馈
 * ---------------------------------------------------------------
 * 接口：POST /api/v1/users/feedback
 * 反馈类型 type：1 功能建议 2 使用问题 3 投诉 4 其他
 */
const api = require('../../utils/api');

/** 反馈类型 */
const TYPES = [
  { key: 1, label: '功能建议' },
  { key: 2, label: '使用问题' },
  { key: 3, label: '投诉' },
  { key: 4, label: '其它' },
];

Page({
  data: {
    types: TYPES,
    type: 1,
    content: '',
    contact: '',
    submitting: false,
  },

  /**
   * 选择反馈类型。
   */
  onTypeTap(e) {
    this.setData({ type: Number(e.currentTarget.dataset.type) });
  },

  /**
   * 填写反馈内容。
   */
  onInputContent(e) {
    this.setData({ content: e.detail.value });
  },

  /**
   * 填写联系方式。
   */
  onInputContact(e) {
    this.setData({ contact: e.detail.value });
  },

  /**
   * 提交反馈。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    const content = this.data.content.trim();
    if (content.length < 5) {
      wx.showToast({ title: '请至少填写 5 个字的问题描述', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    api
      .submitFeedback({ type: this.data.type, content: content, images: [], contact: this.data.contact.trim() })
      .then((result) => {
        this.setData({ submitting: false, content: '', contact: '' });
        wx.showToast({ title: (result && result.message) || '反馈已提交', icon: 'success' });
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '提交失败', icon: 'none' });
      });
  },

  /**
   * 查看帮助中心。
   */
  onGoHelp() {
    wx.navigateTo({ url: '/subpkg-user/help-center/help-center' });
  },
});
