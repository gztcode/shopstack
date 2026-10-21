/**
 * 分类页
 * ---------------------------------------------------------------
 * 左侧一级分类竖排，右侧当前分类商品网格，支持排序与有货筛选。
 */
const api = require('../../utils/api');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    categories: [],
    activeId: 0,
    activeName: '',
    sorts: enums.PRODUCT_SORTS,
    sort: 'default',
    onlyInStock: false,
    products: [],
  },

  onLoad() {
    this.loadCategories();
  },

  onShow() {
    // 首页跳转过来时通过本地缓存传递分类 ID（tabBar 页面不支持查询参数）
    let pending = 0;
    try {
      pending = Number(wx.getStorageSync('ss_pending_category_id')) || 0;
      if (pending) {
        wx.removeStorageSync('ss_pending_category_id');
      }
    } catch (e) {
      pending = 0;
    }
    if (pending && pending !== this.data.activeId) {
      this.setData({ activeId: pending });
      this.loadProducts();
    }
  },

  /**
   * 加载一级分类。
   */
  loadCategories() {
    api
      .listCategories({ tree: true })
      .then((data) => {
        const categories = (data && data.categories) || [];
        const activeId = this.data.activeId || (categories[0] ? categories[0].id : 0);
        this.setData({
          categories: categories,
          activeId: activeId,
          activeName: this.findCategoryName(categories, activeId),
        });
        this.loadProducts();
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '分类加载失败', icon: 'none' });
      });
  },

  /**
   * 查找分类名称。
   * @param {Array} categories 分类列表
   * @param {number} id 分类 ID
   * @returns {string}
   */
  findCategoryName(categories, id) {
    for (let i = 0; i < categories.length; i += 1) {
      if (categories[i].id === id) {
        return categories[i].name;
      }
      const children = categories[i].children || [];
      for (let j = 0; j < children.length; j += 1) {
        if (children[j].id === id) {
          return children[j].name;
        }
      }
    }
    return '全部分类';
  },

  /**
   * 加载当前分类下的商品。
   */
  loadProducts() {
    this.setData({ loading: true });
    api
      .listProducts({
        page: 1,
        page_size: 20,
        category_id: this.data.activeId,
        sort: this.data.sort,
        only_in_stock: this.data.onlyInStock,
      })
      .then((data) => {
        this.setData({
          loading: false,
          products: (data && data.products) || [],
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '商品加载失败', icon: 'none' });
      });
  },

  /**
   * 切换分类。
   */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeId) {
      return;
    }
    this.setData({
      activeId: id,
      activeName: this.findCategoryName(this.data.categories, id),
    });
    this.loadProducts();
  },

  /**
   * 切换排序方式。
   */
  onSortTap(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.sort) {
      return;
    }
    this.setData({ sort: sort });
    this.loadProducts();
  },

  /**
   * 切换「仅看有货」。
   */
  onStockFilter() {
    this.setData({ onlyInStock: !this.data.onlyInStock });
    this.loadProducts();
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
