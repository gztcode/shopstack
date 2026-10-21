/**
 * 我的评价 / 发表评价
 * ---------------------------------------------------------------
 * 接口：POST /api/v1/reviews
 *       GET  /api/v1/reviews?product_id=（或 user_id= 查看我的评价）
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 无 OSS 时使用的图片占位地址 */
const MOCK_IMAGES = [
  'https://placehold.co/300x300/2A4AD9/FFFFFF?text=Photo+1',
  'https://placehold.co/300x300/12B76A/FFFFFF?text=Photo+2',
  'https://placehold.co/300x300/F5811F/FFFFFF?text=Photo+3',
];

const MAX_IMAGES = 3;

Page({
  data: {
    tab: 'publish',
    loading: true,
    submitting: false,
    /** 可评价商品（来自我的订单） */
    products: [],
    selectedProductId: 0,
    selectedProduct: null,
    /** 选中商品的规格 */
    skus: [],
    selectedSkuId: 0,
    rating: 5,
    content: '',
    images: [],
    /** 评价列表 */
    reviews: [],
    reviewsLoading: false,
  },

  onLoad(options) {
    const productId = Number(options && options.product_id) || 0;
    const skuId = Number(options && options.sku_id) || 0;
    if (productId) {
      this.setData({ selectedProductId: productId, selectedSkuId: skuId });
    }
    this.loadOrderableProducts(productId);
  },

  onShow() {
    if (this.data.selectedProductId) {
      this.loadReviews();
    }
  },

  /**
   * 加载可评价商品（取自已下单商品）。
   * @param {number} presetProductId 预选商品 ID
   */
  loadOrderableProducts(presetProductId) {
    api
      .listOrders({ page: 1, page_size: 20 })
      .then((data) => {
        const orders = (data && data.orders) || [];
        const map = {};
        orders.forEach((order) => {
          (order.items || []).forEach((item) => {
            if (!map[item.product_id]) {
              map[item.product_id] = {
                product_id: item.product_id,
                title: item.product_title,
                cover: item.image,
                sku_id: item.sku_id,
                spec_text: item.spec_text,
              };
            }
          });
        });
        const products = Object.keys(map).map((key) => map[key]);
        this.setData({ loading: false, products: products });
        const target = presetProductId || (products.length ? products[0].product_id : 0);
        if (target) {
          this.selectProduct(target);
        }
        this.loadReviews();
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
        this.loadReviews();
      });
  },

  /**
   * 选择商品并加载其规格。
   * @param {number} productId 商品 ID
   */
  selectProduct(productId) {
    this.setData({ selectedProductId: productId });
    api
      .getProduct(productId)
      .then((detail) => {
        const skus = ((detail && detail.skus) || []).filter((sku) => sku.enabled);
        this.setData({
          selectedProduct: {
            product_id: productId,
            title: detail.product.title,
            cover: detail.product.cover,
          },
          skus: skus.map((sku) => ({
            id: sku.id,
            spec_text: sku.spec_text,
            price_text: format.formatYuan(sku.price_cents),
          })),
          selectedSkuId: skus.length ? skus[0].id : 0,
        });
      })
      .catch(() => {
        this.setData({ selectedProduct: null, skus: [], selectedSkuId: 0 });
      });
  },

  /**
   * 点击商品切换。
   */
  onProductTap(e) {
    const productId = Number(e.currentTarget.dataset.id);
    if (productId === this.data.selectedProductId) {
      return;
    }
    this.selectProduct(productId);
    this.loadReviews();
  },

  /**
   * 选择规格。
   */
  onSkuTap(e) {
    this.setData({ selectedSkuId: Number(e.currentTarget.dataset.id) || 0 });
  },

  /**
   * 切换页签。
   */
  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) {
      return;
    }
    this.setData({ tab: tab });
    if (tab === 'list') {
      this.loadReviews();
    }
  },

  /**
   * 打分。
   */
  onRateTap(e) {
    this.setData({ rating: Number(e.currentTarget.dataset.score) || 5 });
  },

  /**
   * 填写评价内容。
   */
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  /**
   * 添加图片（无 OSS 时使用占位图地址）。
   */
  onAddImage() {
    if (this.data.images.length >= MAX_IMAGES) {
      wx.showToast({ title: '最多上传 ' + MAX_IMAGES + ' 张图片', icon: 'none' });
      return;
    }
    const next = MOCK_IMAGES[this.data.images.length % MOCK_IMAGES.length];
    this.setData({ images: this.data.images.concat([next]) });
  },

  /**
   * 删除图片。
   */
  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const images = this.data.images.slice();
    images.splice(index, 1);
    this.setData({ images: images });
  },

  /**
   * 提交评价。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.selectedProductId) {
      wx.showToast({ title: '请选择要评价的商品', icon: 'none' });
      return;
    }
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请填写评价内容', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    api
      .createReview({
        product_id: this.data.selectedProductId,
        sku_id: this.data.selectedSkuId,
        rating: this.data.rating,
        content: this.data.content.trim(),
        images: this.data.images,
      })
      .then(() => {
        this.setData({ submitting: false, content: '', images: [] });
        wx.showToast({ title: '评价发表成功', icon: 'success' });
        this.setData({ tab: 'list' });
        this.loadReviews();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '评价失败', icon: 'none' });
      });
  },

  /**
   * 加载评价列表：选中商品时看该商品评价，否则看我的评价。
   */
  loadReviews() {
    this.setData({ reviewsLoading: true });
    const params = { page: 1, page_size: 20 };
    if (this.data.selectedProductId) {
      params.product_id = this.data.selectedProductId;
    } else {
      params.user_id = 1;
    }
    api
      .listReviews(params)
      .then((data) => {
        const list = (data && data.reviews) || [];
        this.setData({
          reviewsLoading: false,
          reviews: list.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product_title: item.product_title,
            nickname: item.user_nickname,
            avatar: item.user_avatar,
            rating: item.rating,
            content: item.content,
            images: item.images || [],
            sku_text: item.sku_text,
            like_count: item.like_count,
            created_text: format.formatDateTime(item.created_at),
          })),
        });
      })
      .catch((error) => {
        this.setData({ reviewsLoading: false });
        wx.showToast({ title: (error && error.message) || '评价加载失败', icon: 'none' });
      });
  },

  /**
   * 评价列表中点击商品进入详情。
   */
  onProductTap(e) {
    const productId = e.currentTarget.dataset.id;
    if (!productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 没有可评价商品时去逛逛。
   */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
