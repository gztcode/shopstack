/**
 * 评价列表页面模板
 * ---------------------------------------------------------------
 * 全部评价 / 好评 / 中评 / 差评 / 有图评价 / 已回复评价 / 我的评价
 * 七个评价页共用本模板，通过 filter 参数区分接口筛选条件。
 *
 * 接口约定：GET /api/v1/reviews?filter=<int32>
 *   0 全部 / 1 有图 / 2 好评 / 3 中差评
 * 「中评 / 差评 / 已回复」在后端没有对应的细分筛选，页面在服务端筛选结果之上
 * 再做一次客户端细分，保证筛选结果准确。
 */
const api = require('../utils/api');
const auth = require('../utils/auth');
const format = require('../utils/format');

/** filter -> 服务端 int32 筛选值 */
const SERVER_FILTER = {
  all: 0,
  good: 2,
  medium: 3,
  bad: 3,
  has_image: 1,
  has_reply: 0,
};

/**
 * 客户端细分筛选。
 * @param {Array} list 服务端返回的评价
 * @param {string} filter 页面筛选条件
 * @returns {Array}
 */
function refine(list, filter) {
  const items = list || [];
  if (filter === 'good') {
    return items.filter((item) => item.rating >= 4);
  }
  if (filter === 'medium') {
    return items.filter((item) => item.rating === 3);
  }
  if (filter === 'bad') {
    return items.filter((item) => item.rating <= 2);
  }
  if (filter === 'has_image') {
    return items.filter((item) => item.images && item.images.length);
  }
  if (filter === 'has_reply') {
    return items.filter((item) => !!item.admin_reply);
  }
  return items;
}

/**
 * 创建评价列表页面。
 * @param {object} config { filter, title, desc, mine }
 * @returns {object} Page 配置对象
 */
function createReviewListPage(config) {
  const options = config || {};
  const mine = !!options.mine;
  return {
    data: {
      view: {
        filter: options.filter || 'all',
        title: options.title || '全部评价',
        desc: options.desc || '',
        keyword: '',
        reviews: [],
        summary: { total: 0, good: 0, medium: 0, bad: 0, average: 0 },
        loading: true,
        hasMore: true,
        page: 1,
        pageSize: 10,
      },
    },

    onLoad(options) {
      if (!options) {
        return;
      }
      // 支持从评价标签页带关键词跳转进来
      if (options.keyword) {
        this.setData({ 'view.keyword': decodeURIComponent(options.keyword) });
      }
      if (options.title) {
        this.setData({ 'view.title': decodeURIComponent(options.title) });
      }
    },

    onShow() {
      this.loadReviews(true);
    },

    onReachBottom() {
      if (this.data.view.hasMore && !this.data.view.loading) {
        this.loadReviews(false);
      }
    },

    /**
     * 加载评价列表。
     * @param {boolean} reset 是否重置分页
     */
    loadReviews(reset) {
      const view = this.data.view;
      const page = reset ? 1 : view.page;
      this.setData({ 'view.loading': true });
      const params = {
        page: page,
        page_size: view.pageSize,
        filter: SERVER_FILTER[view.filter] === undefined ? 0 : SERVER_FILTER[view.filter],
      };
      if (view.keyword) {
        params.keyword = view.keyword;
      }
      if (mine) {
        const user = auth.getUser();
        params.user_id = user && user.id ? user.id : 1;
      }
      api
        .listReviews(params)
        .then((data) => {
          const list = refine((data && data.reviews) || [], view.filter);
          const meta = (data && data.meta) || {};
          const summary = (data && data.summary) || { total: 0, good: 0, medium: 0, bad: 0, average: 0 };
          this.setData({
            'view.loading': false,
            'view.reviews': reset ? this.mapReviews(list) : view.reviews.concat(this.mapReviews(list)),
            'view.page': page + 1,
            'view.summary': summary,
            'view.hasMore': page < (meta.total_pages || 1),
          });
        })
        .catch((error) => {
          this.setData({ 'view.loading': false });
          wx.showToast({ title: (error && error.message) || '评价加载失败', icon: 'none' });
        });
    },

    /**
     * 转换为页面展示结构。
     * @param {Array} list 原始评价
     * @returns {Array}
     */
    mapReviews(list) {
      return (list || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_title: item.product_title,
        user_nickname: item.user_nickname,
        user_avatar: item.user_avatar,
        rating: item.rating,
        content: item.content,
        images: item.images || [],
        sku_text: item.sku_text,
        admin_reply: item.admin_reply || '',
        like_count: item.like_count || 0,
        created_text: format.fromNow(item.created_at),
      }));
    },

    /**
     * 点击评价：进入对应商品详情。
     */
    onReviewTap(e) {
      const productId = e.currentTarget.dataset.productId;
      if (!productId) {
        return;
      }
      wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
    },

    /**
     * 去发表评价。
     */
    onGoPublish() {
      wx.navigateTo({ url: '/pages/reviews/reviews' });
    },
  };
}

module.exports = { createReviewListPage: createReviewListPage };
