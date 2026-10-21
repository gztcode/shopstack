/**
 * 浏览足迹
 * ---------------------------------------------------------------
 * 纯本地数据：浏览商品详情时由 utils/history.js 写入 wx storage。
 */
const history = require('../../utils/history');
const format = require('../../utils/format');

Page({
  data: {
    items: [],
  },

  onShow() {
    this.loadHistory();
  },

  /**
   * 读取本地足迹。
   */
  loadHistory() {
    const items = history.list().map((item) => ({
      product_id: item.product_id,
      title: item.title,
      cover: item.cover,
      price_text: format.formatYuan(item.price_cents),
      category_name: item.category_name || '',
      viewed_text: format.fromNow(item.viewed_at),
    }));
    this.setData({ items: items });
  },

  /**
   * 点击商品进入详情。
   */
  onItemTap(e) {
    const productId = e.currentTarget.dataset.id;
    if (!productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 删除单条足迹。
   */
  onDelete(e) {
    const productId = Number(e.currentTarget.dataset.id);
    history.remove(productId);
    this.loadHistory();
    wx.showToast({ title: '已删除', icon: 'none' });
  },

  /**
   * 清空足迹。
   */
  onClear() {
    wx.showModal({
      title: '清空浏览记录',
      content: '确定要清空全部浏览足迹吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        history.clear();
        this.loadHistory();
        wx.showToast({ title: '已清空', icon: 'none' });
      },
    });
  },

  /**
   * 去首页逛逛。
   */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
