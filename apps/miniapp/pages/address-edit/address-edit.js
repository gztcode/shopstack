/**
 * 收货地址编辑
 * ---------------------------------------------------------------
 * 新增 / 修改收货地址，支持标签与默认地址设置。
 */
const api = require('../../utils/api');

Page({
  data: {
    addressId: 0,
    loading: true,
    saving: false,
    receiver: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    postalCode: '',
    tag: '家',
    isDefault: false,
    tags: ['家', '公司', '学校', '其他'],
  },

  onLoad(options) {
    const id = Number(options && options.id) || 0;
    this.setData({ addressId: id });
    if (id) {
      this.loadAddress(id);
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 加载地址详情。
   * @param {number} id 地址 ID
   */
  loadAddress(id) {
    api
      .listAddresses()
      .then((data) => {
        const list = (data && data.addresses) || [];
        const address = list.filter((item) => item.id === id)[0];
        if (!address) {
          this.setData({ loading: false });
          return;
        }
        this.setData({
          loading: false,
          receiver: address.receiver || '',
          phone: address.phone || '',
          province: address.province || '',
          city: address.city || '',
          district: address.district || '',
          detail: address.detail || '',
          postalCode: address.postal_code || '',
          tag: address.tag || '家',
          isDefault: !!address.is_default,
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
      });
  },

  /**
   * 表单输入。
   */
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const patch = {};
    patch[field] = e.detail.value;
    this.setData(patch);
  },

  /**
   * 选择地址标签。
   */
  onTagTap(e) {
    this.setData({ tag: e.currentTarget.dataset.tag });
  },

  /**
   * 切换默认地址。
   */
  onToggleDefault() {
    this.setData({ isDefault: !this.data.isDefault });
  },

  /**
   * 保存地址。
   */
  onSave() {
    const { receiver, phone, province, city, district, detail } = this.data;
    if (!receiver) {
      wx.showToast({ title: '请填写收货人', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请填写正确的手机号', icon: 'none' });
      return;
    }
    if (!province || !city || !district) {
      wx.showToast({ title: '请填写省市区', icon: 'none' });
      return;
    }
    if (!detail) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' });
      return;
    }
    if (this.data.saving) {
      return;
    }
    this.setData({ saving: true });
    api
      .saveAddress({
        id: this.data.addressId,
        receiver: receiver,
        phone: phone,
        province: province,
        city: city,
        district: district,
        detail: detail,
        postal_code: this.data.postalCode,
        tag: this.data.tag,
        is_default: this.data.isDefault,
      })
      .then(() => {
        this.setData({ saving: false });
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 600);
      })
      .catch((error) => {
        this.setData({ saving: false });
        wx.showToast({ title: (error && error.message) || '保存失败', icon: 'none' });
      });
  },
});
