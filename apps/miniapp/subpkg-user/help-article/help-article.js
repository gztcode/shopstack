/**
 * 帮助文章
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/help/articles/{id}
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    articleId: 0,
    article: null,
  },

  onLoad(options) {
    const id = Number((options && options.id) || 0);
    this.setData({ articleId: id });
  },

  onShow() {
    this.loadArticle();
  },

  /**
   * 加载文章内容。
   */
  loadArticle() {
    if (!this.data.articleId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    api
      .getHelpArticle(this.data.articleId)
      .then((data) => {
        if (!data) {
          this.setData({ loading: false, article: null });
          return;
        }
        this.setData({
          loading: false,
          article: {
            id: data.id,
            category_name: data.category_name,
            title: data.title,
            content: data.content,
            view_count: data.view_count || 0,
            updated_text: format.formatDate(data.created_at),
          },
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '文章加载失败', icon: 'none' });
      });
  },

  /**
   * 返回帮助中心。
   */
  onGoCenter() {
    wx.navigateTo({ url: '/subpkg-user/help-center/help-center' });
  },

  /**
   * 提交意见反馈。
   */
  onGoFeedback() {
    wx.navigateTo({ url: '/subpkg-user/feedback/feedback' });
  },
});
