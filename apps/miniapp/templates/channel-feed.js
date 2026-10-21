/**
 * 频道商品流页面模板
 * ---------------------------------------------------------------
 * 推荐 / 新品 / 热销 / 限时 / 预售 / 清仓 / 包邮 / 跨境 / 生鲜
 * 九个频道页共用本模板，通过 code + channelId 参数区分频道与接口筛选条件，
 * 页面差异只体现在路径、标题与频道参数上。
 */
const api = require('../utils/api');

/** 排序方式（与 utils/enums.PRODUCT_SORTS 保持一致） */
const SORTS = [
  { key: 'default', label: '综合' },
  { key: 'sales', label: '销量' },
  { key: 'price_asc', label: '价格升' },
  { key: 'price_desc', label: '价格降' },
  { key: 'newest', label: '最新' },
];

/**
 * 创建频道商品流页面。
 * @param {object} config { code, channelId, title, intro }
 * @returns {object} Page 配置对象
 */
function createChannelFeedPage(config) {
  const options = config || {};
  return {
    data: {
      view: {
        code: options.code || '',
        title: options.title || '频道',
        intro: options.intro || '',
        sorts: SORTS,
        sort: 'default',
        channel: null,
        products: [],
        loading: true,
        hasMore: true,
        page: 1,
        pageSize: 10,
      },
    },

    onLoad(options) {
      const sort = (options && options.sort) || 'default';
      this.setData({ 'view.sort': sort });
    },

    onShow() {
      this.loadProducts(true);
    },

    onReachBottom() {
      if (this.data.view.hasMore && !this.data.view.loading) {
        this.loadProducts(false);
      }
    },

    /**
     * 加载频道商品。
     * @param {boolean} reset 是否重置分页
     */
    loadProducts(reset) {
      const view = this.data.view;
      const page = reset ? 1 : view.page;
      this.setData({ 'view.loading': true });
      api
        .listChannelProducts(options.channelId, { page: page, page_size: view.pageSize, sort: view.sort })
        .then((data) => {
          const list = (data && data.products) || [];
          const meta = (data && data.meta) || {};
          this.setData({
            'view.loading': false,
            'view.channel': (data && data.channel) || null,
            'view.products': reset ? list : view.products.concat(list),
            'view.page': page + 1,
            'view.hasMore': page < (meta.total_pages || 1),
          });
        })
        .catch((error) => {
          this.setData({ 'view.loading': false });
          wx.showToast({ title: (error && error.message) || '商品加载失败', icon: 'none' });
        });
    },

    /**
     * 切换排序方式。
     */
    onSortTap(e) {
      const key = e.currentTarget.dataset.key;
      if (key === this.data.view.sort) {
        return;
      }
      this.setData({ 'view.sort': key });
      this.loadProducts(true);
    },

    /**
     * 进入商品详情。
     */
    onProductTap(e) {
      const product = e.detail && e.detail.product;
      if (!product) {
        return;
      }
      wx.navigateTo({ url: '/pages/detail/detail?id=' + product.id });
    },

    /**
     * 加入购物车。
     */
    onAddCart(e) {
      const product = e.detail && e.detail.product;
      if (!product) {
        return;
      }
      api
        .addToCart({ product_id: product.id, sku_id: 0, quantity: 1 })
        .then(() => {
          wx.showToast({ title: '已加入购物车', icon: 'success' });
        })
        .catch((error) => {
          wx.showToast({ title: (error && error.message) || '加入购物车失败', icon: 'none' });
        });
    },

    /**
     * 空状态引导：回到首页。
     */
    onGoHome() {
      wx.switchTab({ url: '/pages/index/index' });
    },
  };
}

module.exports = { createChannelFeedPage: createChannelFeedPage };
