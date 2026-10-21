/**
 * 收货地址管理
 * ---------------------------------------------------------------
 * 地址列表、设为默认、编辑与删除。
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    addresses: [],
  },

  onShow() {
    this.loadAddresses();
  },

  /**
   * 加载地址列表。
   */
  loadAddresses() {
    this.setData({ loading: true });
    api
      .listAddresses()
      .then((data) => {
        this.setData({ loading: false, addresses: (data && data.addresses) || [] });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '地址加载失败', icon: 'none' });
      });
  },

  /**
   * 新增地址。
   */
  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' });
  },

  /**
   * 编辑地址。
   */
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/address-edit/address-edit?id=' + id });
  },

  /**
   * 设为默认地址。
   */
  onSetDefault(e) {
    const id = e.currentTarget.dataset.id;
    api
      .setDefaultAddress(id)
      .then(() => {
        wx.showToast({ title: '已设为默认', icon: 'none' });
        this.loadAddresses();
      })
      .catch((error) => {
        wx.showToast({ title: (error && error.message) || '设置失败', icon: 'none' });
      });
  },

  /**
   * 删除地址。
   */
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除地址',
      content: '确定要删除该收货地址吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .deleteAddress(id)
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'none' });
            this.loadAddresses();
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '删除失败', icon: 'none' });
          });
      },
    });
  },
});
