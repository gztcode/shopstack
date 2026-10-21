/**
 * 购物车页
 * ---------------------------------------------------------------
 * 支持勾选、数量步进、删除、失效商品置灰，底部结算栏统计已选商品金额。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    items: [],
    totalCount: 0,
    selectedCount: 0,
    selectedAmountText: '0.00',
    allSelected: false,
  },

  onShow() {
    this.loadCart();
  },

  /**
   * 加载购物车。
   */
  loadCart() {
    this.setData({ loading: true });
    api
      .getCart()
      .then((cart) => {
        const data = cart || {};
        const items = (data.items || []).map((item) => ({
          id: item.id,
          product_id: item.product_id,
          sku_id: item.sku_id,
          product_title: item.product_title,
          spec_text: item.spec_text,
          image: item.image,
          price_cents: item.price_cents,
          quantity: item.quantity,
          stock: item.stock,
          selected: item.selected,
          available: item.available,
          subtotal_text: format.formatYuan(item.subtotal_cents),
          price_text: format.formatYuan(item.price_cents),
        }));
        const validItems = items.filter((item) => item.available);
        const allSelected = validItems.length > 0 && validItems.every((item) => item.selected);
        this.setData({
          loading: false,
          items: items,
          totalCount: data.total_count || 0,
          selectedCount: data.selected_count || 0,
          selectedAmountText: format.formatYuan(data.selected_payable_cents),
          allSelected: allSelected,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '购物车加载失败', icon: 'none' });
      });
  },

  /**
   * 勾选 / 取消勾选单个商品。
   */
  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selected = e.currentTarget.dataset.selected;
    api
      .updateCartItem(id, { selected: !selected })
      .then(() => this.loadCart())
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
      });
  },

  /**
   * 全选 / 全不选。
   */
  onToggleAll() {
    const allSelected = this.data.allSelected;
    api
      .selectAllCart(!allSelected)
      .then(() => this.loadCart())
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '操作失败', icon: 'none' });
      });
  },

  /**
   * 修改购买数量。
   */
  onQuantityChange(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    api
      .updateCartItem(id, { quantity: value })
      .then(() => this.loadCart())
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '修改失败', icon: 'none' });
      });
  },

  /**
   * 删除购物车条目。
   */
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除商品',
      content: '确定要移除该商品吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .removeCartItem(id)
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'none' });
            this.loadCart();
            const app = getApp();
            if (app && typeof app.refreshCartCount === 'function') {
              app.refreshCartCount();
            }
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '删除失败', icon: 'none' });
          });
      },
    });
  },

  /**
   * 点击商品进入详情。
   */
  onProductTap(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 空状态：去首页逛逛。
   */
  onGoShopping() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  /**
   * 去结算。
   */
  onCheckout() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }
    const ids = this.data.items
      .filter((item) => item.available && item.selected)
      .map((item) => item.id)
      .join(',');
    wx.navigateTo({ url: '/pages/checkout/checkout?source=cart&ids=' + ids });
  },
});
