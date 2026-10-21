/**
 * 帮助中心
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/help/articles
 * 分类由文章列表中的 category_id / category_name 聚合得到。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    keyword: '',
    categories: [],
    activeCategory: '',
    articles: [],
  },

  onShow() {
    this.loadArticles();
  },

  /**
   * 加载帮助文章。
   */
  loadArticles() {
    this.setData({ loading: true });
    const params = { page: 1, page_size: 100 };
    if (this.data.activeCategory !== '') {
      params.category_id = Number(this.data.activeCategory);
    }
    if (this.data.keyword) {
      params.keyword = this.data.keyword;
    }
    api
      .listHelpArticles(params)
      .then((data) => {
        const articles = (data && data.articles) || [];
        const categories = [];
        articles.forEach((item) => {
          const exist = categories.filter((c) => c.id === item.category_id)[0];
          if (!exist) {
            categories.push({ id: item.category_id, name: item.category_name });
          }
        });
        this.setData({
          loading: false,
          articles: articles.map((item) => ({
            id: item.id,
            category_id: item.category_id,
            category_name: item.category_name,
            title: item.title,
            summary: item.content,
            view_count: item.view_count || 0,
            updated_text: format.formatDate(item.created_at),
          })),
          categories: [{ id: '', name: '全部' }].concat(categories),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '帮助内容加载失败', icon: 'none' });
      });
  },

  /**
   * 搜索文章。
   */
  onInput(e) {
    this.setData({ keyword: e.detail.value });
    this.loadArticles();
  },

  /**
   * 切换分类。
   */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    const key = id === '' ? '' : String(id);
    if (key === this.data.activeCategory) {
      return;
    }
    this.setData({ activeCategory: key });
    this.loadArticles();
  },

  /**
   * 打开文章详情。
   */
  onArticleTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/subpkg-user/help-article/help-article?id=' + id });
  },

  /**
   * 提交意见反馈。
   */
  onGoFeedback() {
    wx.navigateTo({ url: '/subpkg-user/feedback/feedback' });
  },
});
