/**
 * 订单确认
 * ---------------------------------------------------------------
 * 下单前的最后确认页：核对商品、地址与金额后提交订单。
 * 接口：GET  /api/v1/cart
 *       GET  /api/v1/users/addresses
 *       POST /api/v1/marketing/preview
 *       POST /api/v1/orders
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    submitting: false,
    items: [],
    address: null,
    addresses: [],
    totalText: '0.00',
    discountText: '0.00',
    freightText: '0.00',
    payableText: '0.00',
    couponText: '0.00',
  },

  onShow() {
    this.loadConfirm();
  },

  /**
   * 加载待确认的订单信息。
   */
  loadConfirm() {
    this.setData({ loading: true });
    Promise.all([api.getCart(), api.listAddresses()])
      .then((results) => {
        const cart = results[0] || {};
        const addressData = results[1] || {};
        const addresses = addressData.addresses || [];
        const selectedItems = (cart.items || []).filter((item) => item.selected && item.available);
        const address = addresses.filter((item) => item.is_default)[0] || addresses[0] || null;
        const previewItems = selectedItems.map((item) => ({
          product_id: item.product_id,
          sku_id: item.sku_id,
          quantity: item.quantity,
          price_cents: item.price_cents,
        }));
        return api.previewCheckout({ items: previewItems }).then((preview) => {
          this.setData({
            loading: false,
            addresses: addresses,
            address: address,
            items: selectedItems.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_title: item.product_title,
              spec_text: item.spec_text,
              image: item.image,
              quantity: item.quantity,
              price_text: format.formatYuan(item.price_cents),
            })),
            totalText: format.formatYuan((preview && preview.total_amount_cents) || 0),
            discountText: format.formatYuan((preview && preview.discount_cents) || 0),
            freightText: format.formatYuan((preview && preview.freight_cents) || 0),
            payableText: format.formatYuan((preview && preview.payable_cents) || 0),
            couponText: format.formatYuan((preview && preview.coupon_discount_cents) || 0),
          });
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '订单信息加载失败', icon: 'none' });
      });
  },

  /**
   * 切换收货地址。
   */
  onAddressTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    const address = this.data.addresses.filter((item) => item.id === id)[0];
    if (address) {
      this.setData({ address: address });
    }
  },

  /**
   * 提交订单。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.items.length) {
      wx.showToast({ title: '没有可提交的商品', icon: 'none' });
      return;
    }
    if (!this.data.address) {
      wx.showToast({ title: '请先选择收货地址', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const cartItemIds = this.data.items.map((item) => item.id);
    api
      .createOrder({
        from_cart: true,
        cart_item_ids: cartItemIds,
        address_id: this.data.address.id,
        remark: '',
      })
      .then((order) => {
        this.setData({ submitting: false });
        const orderId = order && order.id;
        wx.redirectTo({ url: '/pages/pay/pay?order_id=' + orderId + '&amount=' + (order && order.payable_cents ? order.payable_cents : 0) });
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '下单失败', icon: 'none' });
      });
  },

  /**
   * 前往购物车继续挑选。
   */
  onGoCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  /**
   * 维护收货地址。
   */
  onEditAddress() {
    wx.navigateTo({ url: '/pages/address/address' });
  },
});
