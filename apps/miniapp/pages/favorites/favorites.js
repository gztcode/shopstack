/**
 * 我的收藏
 * ---------------------------------------------------------------
 * 收藏商品列表，支持取消收藏与进入商品详情。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    products: [],
  },

  onShow() {
    this.loadFavorites();
  },

  /**
   * 加载收藏列表。
   */
  loadFavorites() {
    this.setData({ loading: true });
    api
      .listFavorites({ page: 1, page_size: 50 })
      .then((data) => {
        const list = (data && data.products) || [];
        this.setData({
          loading: false,
          products: list.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            title: item.title,
            cover: item.cover,
            price_text: format.formatYuan(item.price_cents),
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 进入商品详情。
   */
  onProductTap(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 取消收藏。
   */
  onRemove(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏该商品吗？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .toggleFavorite(productId)
          .then(() => {
            wx.showToast({ title: '已取消收藏', icon: 'none' });
            this.loadFavorites();
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
          });
      },
    });
  },
});
