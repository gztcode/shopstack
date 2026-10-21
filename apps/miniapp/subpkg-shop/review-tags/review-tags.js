/**
 * 评价标签
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/reviews/tags
 * 点击标签可跳转到评价列表，按标签名检索相关评价。
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    tags: [],
  },

  onShow() {
    this.loadTags();
  },

  /**
   * 加载评价标签。
   */
  loadTags() {
    this.setData({ loading: true });
    api
      .listReviewTags()
      .then((data) => {
        const tags = (data && data.tags) || [];
        this.setData({
          loading: false,
          tags: tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            sort: tag.sort,
            enabled: tag.enabled,
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '标签加载失败', icon: 'none' });
      });
  },

  /**
   * 按标签查看相关评价。
   */
  onTagTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) {
      return;
    }
    const keyword = encodeURIComponent(name);
    const title = encodeURIComponent('标签：' + name);
    wx.navigateTo({ url: '/subpkg-shop/review-all/review-all?keyword=' + keyword + '&title=' + title });
  },

  /**
   * 查看全部评价。
   */
  onGoAll() {
    wx.navigateTo({ url: '/subpkg-shop/review-all/review-all' });
  },
});
