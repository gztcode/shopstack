/**
 * 首页
 * ---------------------------------------------------------------
 * 搜索入口 -> 分类快捷入口 -> 轮播图 -> 促销/秒杀 -> 推荐商品网格。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    banners: [],
    entries: [],
    flashSale: {
      title: '',
      desc: '',
      image: '',
      endTime: '',
    },
    flashProducts: [],
    products: [],
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const app = getApp();
    if (app && typeof app.refreshCartCount === 'function') {
      app.refreshCartCount();
    }
  },

  /**
   * 并行加载首页各模块数据。
   */
  loadData() {
    this.setData({ loading: true });
    Promise.all([
      api.listBanners('home_banner'),
      api.listCategories({ tree: true }),
      api.listPromotions({ page: 1, page_size: 5, status: 1 }),
      api.listProducts({ page: 1, page_size: 6, sort: 'sales' }),
      api.listProducts({ page: 1, page_size: 10, sort: 'default' }),
    ])
      .then((results) => {
        const banners = results[0] && results[0].banners ? results[0].banners : [];
        const categories = results[1] && results[1].categories ? results[1].categories : [];
        const promotions = results[2] && results[2].promotions ? results[2].promotions : [];
        const flashProducts = results[3] && results[3].products ? results[3].products : [];
        const products = results[4] && results[4].products ? results[4].products : [];
        const promotion = promotions[0] || {};

        // 分类快捷入口：一级分类 + 其子分类
        const entries = [];
        categories.forEach((category) => {
          entries.push({ id: category.id, name: category.name, icon: category.icon });
          (category.children || []).forEach((child) => {
            entries.push({ id: child.id, name: child.name, icon: child.icon });
          });
        });

        this.setData({
          loading: false,
          banners: banners,
          entries: entries,
          flashSale: {
            title: promotion.name || '限时秒杀',
            desc: promotion.description || '好物限时特惠',
            image: promotion.banner_image || '',
            endTime: format.formatDateTime(promotion.end_time),
          },
          flashProducts: flashProducts.slice(0, 6).map((item) => ({
            id: item.id,
            title: item.title,
            cover: item.cover,
            priceText: format.formatYuan(item.min_price_cents),
          })),
          products: products,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 跳转搜索页。
   */
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  /**
   * 点击分类快捷入口。分类页是 tabBar 页面，参数通过本地缓存传递。
   */
  onEntryTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.setStorageSync('ss_pending_category_id', id);
    wx.switchTab({ url: '/pages/category/category' });
  },

  /**
   * 点击轮播图。分类页为 tabBar 页面，需要用 switchTab 跳转。
   */
  onBannerTap(e) {
    const link = e.currentTarget.dataset.link;
    if (!link) {
      return;
    }
    if (link.indexOf('/pages/category/category') === 0) {
      const id = link.indexOf('category_id=') >= 0 ? link.split('category_id=')[1].split('&')[0] : '';
      if (id) {
        wx.setStorageSync('ss_pending_category_id', id);
      }
      wx.switchTab({ url: '/pages/category/category' });
      return;
    }
    if (link.indexOf('/pages/index/index') === 0) {
      wx.switchTab({ url: '/pages/index/index' });
      return;
    }
    if (link.indexOf('/pages/product/') === 0) {
      wx.navigateTo({ url: '/pages/detail/detail?id=' + link.split('/').pop() });
      return;
    }
    wx.navigateTo({ url: link });
  },

  /**
   * 点击商品卡片。
   */
  onProductSelect(e) {
    const product = e.detail.product;
    if (!product) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + product.id });
  },

  /**
   * 首页快捷加购：使用第一个可用规格加入购物车。
   */
  onAddCart(e) {
    const product = e.detail.product;
    if (!product) {
      return;
    }
    api
      .getProduct(product.id)
      .then((detail) => {
        const skus = (detail && detail.skus) || [];
        const sku = skus.filter((item) => item.enabled && item.stock > 0)[0];
        if (!sku) {
          wx.showToast({ title: '该商品暂时无货', icon: 'none' });
          return;
        }
        return api.addToCart({
          product_id: product.id,
          sku_id: sku.id,
          quantity: 1,
          selected: true,
        });
      })
      .then((cart) => {
        if (!cart) {
          return;
        }
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        const app = getApp();
        if (app && typeof app.refreshCartCount === 'function') {
          app.refreshCartCount();
        }
      })
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '加入购物车失败', icon: 'none' });
      });
  },

  /**
   * 查看更多推荐商品。
   */
  onMoreProducts() {
    wx.navigateTo({ url: '/pages/category/category' });
  },

  /**
   * 回到顶部。
   */
  onBackTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
  },
});
