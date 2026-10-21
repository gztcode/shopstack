/**
 * 参团下单
 * ---------------------------------------------------------------
 * 接口：GET  /api/v1/group-buys/{id}
 *       POST /api/v1/group-buys/{id}/join
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

/** 拼团状态文案（status：0 未开始 1 进行中 2 已结束 3 已下线） */
const STATUS_TEXT = {
  0: '未开始',
  1: '拼团中',
  2: '已成团',
  3: '已下线',
};

Page({
  data: {
    loading: true,
    submitting: false,
    groupBuyId: 0,
    groupBuy: null,
    addresses: [],
    addressId: 0,
    joined: false,
  },

  onLoad(options) {
    const id = Number((options && options.id) || 0);
    this.setData({ groupBuyId: id });
  },

  onShow() {
    this.loadData();
  },

  /**
   * 加载拼团与收货地址。
   */
  loadData() {
    if (!this.data.groupBuyId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    Promise.all([api.getGroupBuy(this.data.groupBuyId), api.listAddresses()])
      .then((results) => {
        const detail = results[0] || {};
        const groupBuy = detail.group_buy || null;
        const addressData = results[1] || {};
        const addresses = addressData.addresses || [];
        const selected = addresses.filter((item) => item.is_default)[0] || addresses[0] || null;
        this.setData({
          loading: false,
          addresses: addresses,
          addressId: selected ? selected.id : 0,
          groupBuy: groupBuy
            ? {
                id: groupBuy.id,
                name: groupBuy.name,
                description: groupBuy.description,
                product_cover: groupBuy.product_image,
                price_text: format.formatYuan(groupBuy.price_cents),
                original_text: format.formatYuan(groupBuy.original_price_cents),
                group_size: groupBuy.required_members || groupBuy.group_size || 1,
                joined_count: groupBuy.joined_members || 0,
                status: groupBuy.status,
                status_text: STATUS_TEXT[groupBuy.status] || '拼团中',
              }
            : null,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '拼团加载失败', icon: 'none' });
      });
  },

  /**
   * 选择收货地址。
   */
  onAddressTap(e) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({ addressId: id });
  },

  /**
   * 提交参团。
   */
  onSubmit() {
    if (this.data.submitting) {
      return;
    }
    if (!this.data.addressId) {
      wx.showToast({ title: '请先选择收货地址', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    api
      .joinGroupBuy(this.data.groupBuyId, { quantity: 1 })
      .then((result) => {
        this.setData({ submitting: false, joined: true });
        wx.showToast({ title: result ? '参团成功' : '参团失败', icon: result ? 'success' : 'none' });
        this.loadData();
      })
      .catch((error) => {
        this.setData({ submitting: false });
        wx.showToast({ title: (error && error.message) || '参团失败', icon: 'none' });
      });
  },

  /**
   * 查看我的拼团。
   */
  onGoMine() {
    wx.navigateTo({ url: '/subpkg-order/my-group-buy/my-group-buy' });
  },

  /**
   * 维护收货地址。
   */
  onEditAddress() {
    wx.navigateTo({ url: '/pages/address/address' });
  },
});
