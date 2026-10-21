/**
 * 商品详情页
 * ---------------------------------------------------------------
 * 轮播图、价格、SKU 规格选择（联动价格 / 库存 / 图片）、商品参数、
 * 评价列表与评分分布、相关推荐，底部固定操作栏。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');
const history = require('../../utils/history');

Page({
  data: {
    loading: true,
    productId: 0,
    product: {},
    images: [],
    attributes: [],
    reviews: [],
    reviewSummary: { total: 0, good: 0, medium: 0, bad: 0, average: 0 },
    goodRate: 0,
    mediumRate: 0,
    badRate: 0,
    related: [],
    /** 规格分组：[{ name, values: [{ value, enabled }] }] */
    specGroups: [],
    /** 已选规格：{ 规格名: 规格值 } */
    selectedSpecs: {},
    /** 当前命中的 SKU */
    currentSku: null,
    selectedText: '',
    priceText: '0.00',
    originText: '0.00',
    stock: 0,
    quantity: 1,
    favorited: false,
    /** 规格选择弹层 */
    panelVisible: false,
    panelMode: 'cart',
    ratingText: '0.0',
  },

  onLoad(options) {
    const id = Number(options && options.id) || 0;
    this.setData({ productId: id });
    this.loadDetail(id);
  },

  onShow() {
    if (this.data.productId) {
      this.checkFavorite(this.data.productId);
    }
  },

  /**
   * 加载商品详情。
   * @param {number} id 商品 ID
   */
  loadDetail(id) {
    this.setData({ loading: true });
    api
      .getProduct(id)
      .then((detail) => {
        if (!detail || !detail.product) {
          this.setData({ loading: false });
          wx.showToast({ title: '商品不存在', icon: 'none' });
          return;
        }
        const skus = (detail.skus || []).filter((sku) => sku.enabled);
        this.allSkus = skus;
        const groups = this.buildSpecGroups(skus);
        const firstSku = skus[0] || null;
        const selectedSpecs = firstSku ? Object.assign({}, firstSku.specs) : {};
        const images = (detail.images || []).map((image) => image.url);
        if (!images.length && detail.product.cover) {
          images.push(detail.product.cover);
        }
        const summary = detail.review_summary || { total: 0, good: 0, medium: 0, bad: 0 };
        const total = summary.total || 1;
        this.setData({
          loading: false,
          product: detail.product,
          images: images,
          attributes: detail.attributes || [],
          reviews: detail.reviews || [],
          reviewSummary: detail.review_summary || { total: 0, good: 0, medium: 0, bad: 0, average: 0 },
          goodRate: Math.round((summary.good || 0) * 100 / total),
          mediumRate: Math.round((summary.medium || 0) * 100 / total),
          badRate: Math.round((summary.bad || 0) * 100 / total),
          related: detail.related || [],
          ratingText: Number(detail.review_rating || 0).toFixed(1),
          specGroups: groups,
          selectedSpecs: selectedSpecs,
          currentSku: firstSku,
        });
        this.applySku(firstSku, skus);
        this.checkFavorite(id);
        // 记录浏览足迹（本地）
        history.add(detail.product);
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 根据 SKU 列表生成规格分组。
   * @param {Array} skus SKU 列表
   * @returns {Array}
   */
  buildSpecGroups(skus) {
    const groups = [];
    const index = {};
    skus.forEach((sku) => {
      const specs = sku.specs || {};
      Object.keys(specs).forEach((name) => {
        if (index[name] === undefined) {
          index[name] = groups.length;
          groups.push({ name: name, values: [] });
        }
        const group = groups[index[name]];
        if (!group.values.some((item) => item.value === specs[name])) {
          group.values.push({ value: specs[name], enabled: true });
        }
      });
    });
    return groups;
  },

  /**
   * 根据已选规格计算每个规格值是否可选。
   * @param {Array} skus SKU 列表
   */
  refreshSpecEnabled(skus) {
    const selected = this.data.selectedSpecs;
    const groups = this.data.specGroups.map((group) => ({
      name: group.name,
      values: group.values.map((item) => {
        const target = Object.assign({}, selected);
        target[group.name] = item.value;
        const matched = skus.some(
          (sku) =>
            sku.stock > 0 &&
            Object.keys(target).every((key) => (sku.specs || {})[key] === target[key])
        );
        return { value: item.value, enabled: matched };
      }),
    }));
    this.setData({ specGroups: groups });
  },

  /**
   * 选中 SKU 后同步价格、库存与规格文案。
   * @param {object} sku SKU
   * @param {Array} skus 全部 SKU
   */
  applySku(sku, skus) {
    if (!sku) {
      this.setData({
        priceText: '0.00',
        originText: '0.00',
        stock: 0,
        selectedText: '请选择规格',
      });
      this.refreshSpecEnabled(skus || []);
      return;
    }
    this.setData({
      priceText: format.formatYuan(sku.price_cents),
      originText: format.formatYuan(sku.original_price_cents),
      stock: sku.stock,
      selectedText: sku.spec_text,
      quantity: 1,
    });
    this.refreshSpecEnabled(skus || []);
  },

  /**
   * 点击规格值。
   */
  onSpecTap(e) {
    const group = e.currentTarget.dataset.group;
    const value = e.currentTarget.dataset.value;
    if (e.currentTarget.dataset.enabled === false) {
      wx.showToast({ title: '该规格暂不可选', icon: 'none' });
      return;
    }
    const selected = Object.assign({}, this.data.selectedSpecs);
    selected[group] = value;
    const skus = this.allSkus || [];
    const matched = skus.filter(
      (sku) => Object.keys(selected).every((key) => (sku.specs || {})[key] === selected[key])
    )[0];
    this.setData({ selectedSpecs: selected });
    this.applySku(matched || null, skus);
  },

  /**
   * 打开规格选择弹层。
   * @param {string} mode cart | buy
   */
  onOpenPanel(e) {
    this.setData({ panelVisible: true, panelMode: e.currentTarget.dataset.mode || 'cart' });
  },

  /**
   * 关闭弹层。
   */
  onClosePanel() {
    this.setData({ panelVisible: false });
  },

  /**
   * 阻止弹层内部冒泡。
   */
  onStopTap() {},

  /**
   * 修改购买数量。
   */
  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value });
  },

  /**
   * 确认规格：加入购物车或立即购买。
   */
  onConfirmSku() {
    const sku = this.data.currentSku;
    if (!sku) {
      wx.showToast({ title: '请选择商品规格', icon: 'none' });
      return;
    }
    if (this.data.quantity > sku.stock) {
      wx.showToast({ title: '超出库存，请减少数量', icon: 'none' });
      return;
    }
    if (this.data.panelMode === 'cart') {
      api
        .addToCart({
          product_id: this.data.productId,
          sku_id: sku.id,
          quantity: this.data.quantity,
          selected: true,
        })
        .then(() => {
          this.setData({ panelVisible: false });
          wx.showToast({ title: '已加入购物车', icon: 'success' });
          const app = getApp();
          if (app && typeof app.refreshCartCount === 'function') {
            app.refreshCartCount();
          }
        })
        .catch((error) => {
          wx.showToast({ title: (error && error.message) || '加入购物车失败', icon: 'none' });
        });
      return;
    }
    this.setData({ panelVisible: false });
    wx.navigateTo({
      url:
        '/pages/checkout/checkout?source=buy&product_id=' +
        this.data.productId +
        '&sku_id=' +
        sku.id +
        '&quantity=' +
        this.data.quantity,
    });
  },

  /**
   * 收藏 / 取消收藏。
   */
  onToggleFavorite() {
    api
      .toggleFavorite(this.data.productId)
      .then((data) => {
        const favorited = !!(data && data.favorited);
        this.setData({ favorited: favorited });
        wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' });
      })
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
      });
  },

  /**
   * 联系客服。
   */
  onContactService() {
    if (typeof wx.openCustomerServiceChat === 'function') {
      wx.openCustomerServiceChat({
        extInfo: { url: '' },
        fail() {
          wx.showModal({
            title: '联系客服',
            content: '客服热线 400-888-8888（服务时间 9:00 - 21:00）',
            showCancel: false,
            confirmText: '知道了',
          });
        },
      });
      return;
    }
    wx.showModal({
      title: '联系客服',
      content: '客服热线 400-888-8888（服务时间 9:00 - 21:00）',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  /**
   * 分享（转发给好友 / 分享到朋友圈）。
   */
  onShareAppMessage() {
    return {
      title: this.data.product.title || 'ShopStack 好物',
      path: '/pages/detail/detail?id=' + this.data.productId,
      imageUrl: this.data.product.cover,
    };
  },

  /**
   * 查看全部评价。
   */
  onViewReviews() {
    wx.showModal({
      title: '全部评价',
      content: this.data.reviewSummary.total ? '共 ' + this.data.reviewSummary.total + ' 条评价，评分 ' + this.data.ratingText : '暂无评价',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  /**
   * 点击相关推荐。
   */
  onRelatedSelect(e) {
    const product = e.detail.product;
    if (!product) {
      return;
    }
    wx.redirectTo({ url: '/pages/detail/detail?id=' + product.id });
  },

  /**
   * 查询收藏状态。
   * @param {number} productId 商品 ID
   */
  checkFavorite(productId) {
    api
      .listFavorites({ page: 1, page_size: 100 })
      .then((data) => {
        const list = (data && data.products) || [];
        const favorited = list.some((item) => item.product_id === productId);
        this.setData({ favorited: favorited });
      })
      .catch(() => null);
  },
});
