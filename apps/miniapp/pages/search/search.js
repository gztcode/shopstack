/**
 * 搜索页
 * ---------------------------------------------------------------
 * 关键词搜索（带防抖）、热门搜索词与本地搜索历史。
 */
const api = require('../../utils/api');

const HISTORY_KEY = 'ss_search_history';
const MAX_HISTORY = 10;

Page({
  data: {
    keyword: '',
    searching: false,
    searched: false,
    products: [],
    hotWords: ['手机', '耳机', '炒锅', '衬衫', '车厘子', '保温杯'],
    history: [],
  },

  onLoad() {
    this.setData({ history: this.readHistory() });
  },

  /**
   * 读取搜索历史。
   * @returns {Array}
   */
  readHistory() {
    try {
      return wx.getStorageSync(HISTORY_KEY) || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * 保存搜索历史。
   * @param {string} keyword 关键词
   */
  saveHistory(keyword) {
    if (!keyword) {
      return;
    }
    const history = this.readHistory().filter((item) => item !== keyword);
    history.unshift(keyword);
    const next = history.slice(0, MAX_HISTORY);
    try {
      wx.setStorageSync(HISTORY_KEY, next);
    } catch (e) {
      // ignore
    }
    this.setData({ history: next });
  },

  /**
   * 清空搜索历史。
   */
  onClearHistory() {
    try {
      wx.removeStorageSync(HISTORY_KEY);
    } catch (e) {
      // ignore
    }
    this.setData({ history: [] });
  },

  /**
   * 输入关键词。
   */
  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  /**
   * 提交搜索。
   */
  onSearch() {
    const keyword = (this.data.keyword || '').trim();
    if (!keyword) {
      return;
    }
    this.saveHistory(keyword);
    this.setData({ searching: true, searched: true });
    api
      .listProducts({ page: 1, page_size: 30, keyword: keyword })
      .then((data) => {
        this.setData({
          searching: false,
          products: (data && data.products) || [],
        });
      })
      .catch((error) => {
        this.setData({ searching: false });
        wx.showToast({ title: (error && error.message) || '搜索失败', icon: 'none' });
      });
  },

  /**
   * 点击热门词 / 历史词。
   */
  onWordTap(e) {
    const word = e.currentTarget.dataset.word;
    this.setData({ keyword: word });
    this.onSearch();
  },

  /**
   * 清除输入。
   */
  onClearInput() {
    this.setData({ keyword: '', searched: false, products: [] });
  },

  /**
   * 点击商品。
   */
  onProductSelect(e) {
    const product = e.detail.product;
    if (!product) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + product.id });
  },

  /**
   * 快捷加购。
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
          return null;
        }
        return api.addToCart({ product_id: product.id, sku_id: sku.id, quantity: 1, selected: true });
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
});
