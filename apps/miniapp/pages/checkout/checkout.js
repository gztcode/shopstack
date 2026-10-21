/**
 * 结算页
 * ---------------------------------------------------------------
 * 地址选择、商品清单、优惠券选择、金额明细与提交订单。
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    submitting: false,
    /** 结算来源：cart | buy */
    source: 'cart',
    cartItemIds: [],
    address: null,
    addressList: [],
    items: [],
    totalAmountText: '0.00',
    discountText: '0.00',
    freightText: '0.00',
    payableText: '0.00',
    /** 可用优惠券 */
    availableCoupons: [],
    selectedCoupon: null,
    couponVisible: false,
    remark: '',
  },

  onLoad(options) {
    const source = options && options.source === 'buy' ? 'buy' : 'cart';
    const ids = options && options.ids ? String(options.ids).split(',').filter(Boolean) : [];
    this.buyParams =
      source === 'buy'
        ? {
            product_id: Number(options.product_id) || 0,
            sku_id: Number(options.sku_id) || 0,
            quantity: Number(options.quantity) || 1,
          }
        : null;
    this.setData({ source: source, cartItemIds: ids });
    this.loadData();
  },

  onShow() {
    // 从新增地址页返回时刷新地址列表
    if (!this.data.loading) {
      this.refreshAddress();
    }
  },

  /**
   * 仅刷新收货地址，不影响已加载的商品清单。
   */
  refreshAddress() {
    api
      .listAddresses()
      .then((data) => {
        const addressList = (data && data.addresses) || [];
        const current = this.data.address;
        const address =
          addressList.filter((item) => item.is_default)[0] ||
          addressList.filter((item) => current && item.id === current.id)[0] ||
          addressList[0] ||
          null;
        this.setData({ addressList: addressList, address: address });
      })
      .catch(() => null);
  },

  /**
   * 加载地址与商品清单。
   */
  loadData() {
    this.setData({ loading: true });
    Promise.all([api.listAddresses(), this.loadItems()])
      .then((results) => {
        const addressList = (results[0] && results[0].addresses) || [];
        const address =
          addressList.filter((item) => item.is_default)[0] || addressList[0] || null;
        this.setData({ addressList: addressList, address: address, items: results[1] || [] });
        this.refreshPreview();
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 组装结算商品清单。
   * @returns {Promise<Array>}
   */
  loadItems() {
    if (this.data.source === 'buy') {
      return api.getProduct(this.buyParams.product_id).then((detail) => {
        const skus = (detail && detail.skus) || [];
        const sku = skus.filter((item) => item.id === this.buyParams.sku_id)[0] || skus[0];
        if (!sku) {
          return [];
        }
        return [
          {
            product_id: this.buyParams.product_id,
            sku_id: sku.id,
            product_title: detail.product.title,
            spec_text: sku.spec_text,
            image: detail.product.cover,
            price_cents: sku.price_cents,
            price_text: format.formatYuan(sku.price_cents),
            quantity: this.buyParams.quantity,
            amount_cents: sku.price_cents * this.buyParams.quantity,
          },
        ];
      });
    }
    return api.getCart().then((cart) => {
      const ids = this.data.cartItemIds;
      return (cart.items || [])
        .filter((item) => ids.indexOf(item.id) >= 0 && item.available)
        .map((item) => ({
          product_id: item.product_id,
          sku_id: item.sku_id,
          product_title: item.product_title,
          spec_text: item.spec_text,
          image: item.image,
          price_cents: item.price_cents,
          price_text: format.formatYuan(item.price_cents),
          quantity: item.quantity,
          amount_cents: item.price_cents * item.quantity,
        }));
    });
  },

  /**
   * 刷新金额预览（金额均来自后端 preview 接口）。
   */
  refreshPreview(couponId) {
    const items = this.data.items;
    if (!items.length) {
      this.setData({ loading: false, items: items });
      return;
    }
    const payload = {
      items: items.map((item) => ({
        sku_id: item.sku_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_cents: item.price_cents,
      })),
      address_id: this.data.address ? this.data.address.id : 0,
      coupon_id: couponId || 0,
      points_used: 0,
    };
    api
      .previewCheckout(payload)
      .then((preview) => {
        const data = preview || {};
        this.setData({
          loading: false,
          totalAmountText: format.formatYuan(data.total_amount_cents),
          discountText: format.formatYuan(data.discount_cents),
          freightText: format.formatYuan(data.freight_cents),
          payableText: format.formatYuan(data.payable_cents),
          availableCoupons: data.available_coupons || [],
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '金额计算失败', icon: 'none' });
      });
  },

  /**
   * 选择收货地址。
   */
  onChooseAddress() {
    if (!this.data.addressList.length) {
      wx.navigateTo({ url: '/pages/address-edit/address-edit' });
      return;
    }
    const list = this.data.addressList;
    const labels = list.map((item) => {
      return item.receiver + ' ' + item.phone + '\n' + item.province + item.city + item.district + item.detail;
    });
    wx.showActionSheet({
      itemList: labels,
      success: (res) => {
        const picked = list[res.tapIndex];
        if (picked) {
          this.setData({ address: picked });
          this.refreshPreview();
        }
      },
    });
  },

  /**
   * 新增地址。
   */
  onAddAddress() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },

  /**
   * 打开优惠券选择面板。
   */
  onOpenCoupon() {
    if (!this.data.availableCoupons.length) {
      wx.showToast({ title: '暂无可用优惠券', icon: 'none' });
      return;
    }
    this.setData({ couponVisible: true });
  },

  /**
   * 关闭优惠券面板。
   */
  onCloseCoupon() {
    this.setData({ couponVisible: false });
  },

  /**
   * 阻止弹层内部事件冒泡。
   */
  onStopTap() {},

  /**
   * 选择优惠券。
   */
  onSelectCoupon(e) {
    const couponId = Number(e.currentTarget.dataset.id) || 0;
    const coupon = this.data.availableCoupons.filter((item) => item.coupon_id === couponId)[0] || null;
    this.setData({ couponVisible: false, selectedCoupon: coupon });
    this.refreshPreview(couponId);
  },

  /**
   * 不使用优惠券。
   */
  onClearCoupon() {
    this.setData({ couponVisible: false, selectedCoupon: null });
    this.refreshPreview(0);
  },

  /**
   * 填写订单备注。
   */
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  /**
   * 提交订单。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.address) {
      wx.showModal({
        title: '请选择收货地址',
        content: '还没有收货地址，先去新增一个吧',
        confirmText: '去新增',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/address-edit/address-edit' });
          }
        },
      });
      return;
    }
    if (!this.data.items.length) {
      wx.showToast({ title: '没有可结算的商品', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    const body = {
      items: this.data.items.map((item) => ({
        product_id: item.product_id,
        sku_id: item.sku_id,
        quantity: item.quantity,
      })),
      from_cart: this.data.source === 'cart',
      cart_item_ids: this.data.source === 'cart' ? this.data.cartItemIds : [],
      address_id: this.data.address.id,
      coupon_id: this.data.selectedCoupon ? this.data.selectedCoupon.coupon_id : 0,
      remark: this.data.remark,
      payment_method: 'wechat',
      points_used: 0,
    };
    api
      .createOrder(body)
      .then((order) => {
        this.setData({ submitting: false });
        const app = getApp();
        if (app && typeof app.refreshCartCount === 'function') {
          app.refreshCartCount();
        }
        wx.redirectTo({
          url: '/pages/pay/pay?order_id=' + order.id + '&amount=' + order.payable_cents,
        });
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '下单失败', icon: 'none' });
      });
  },
});
