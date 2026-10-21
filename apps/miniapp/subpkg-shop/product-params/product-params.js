/**
 * 商品参数
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/products/{id}/params
 *       GET /api/v1/products/{id}（用于展示商品标题）
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    productId: 0,
    title: '',
    params: [],
  },

  onLoad(options) {
    const productId = Number((options && options.product_id) || (options && options.id)) || 0;
    this.setData({ productId: productId });
  },

  onShow() {
    this.loadParams();
  },

  /**
   * 加载商品参数与商品标题。
   */
  loadParams() {
    if (!this.data.productId) {
      this.setData({ loading: false, params: [] });
      return;
    }
    this.setData({ loading: true });
    Promise.all([api.getProductParams(this.data.productId), api.getProduct(this.data.productId)])
      .then((results) => {
        const params = (results[0] && results[0].params) || [];
        const detail = results[1] || {};
        const product = detail.product || {};
        this.setData({
          loading: false,
          title: product.title || '',
          params: params.map((item) => ({
            id: item.id,
            name: item.name,
            value: item.value,
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '参数加载失败', icon: 'none' });
      });
  },

  /**
   * 回到商品详情。
   */
  onGoDetail() {
    if (!this.data.productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + this.data.productId });
  },
});
