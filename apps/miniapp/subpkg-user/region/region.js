/**
 * 收货地区
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/regions
 * 后端返回扁平列表（level：1 省 2 市 3 区，parent_id 指向上级），
 * 页面据此构建省市区三级联动。
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    regions: [],
    provinces: [],
    cities: [],
    districts: [],
    provinceIndex: -1,
    cityIndex: -1,
    districtIndex: -1,
    provinceName: '',
    cityName: '',
    districtName: '',
  },

  onShow() {
    this.loadRegions();
  },

  /**
   * 加载地区字典并构建层级。
   */
  loadRegions() {
    this.setData({ loading: true });
    api
      .listRegions()
      .then((data) => {
        const regions = (data && data.regions) || [];
        this.setData({
          loading: false,
          regions: regions,
          provinces: this.childrenOf(regions, 0),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '地区数据加载失败', icon: 'none' });
      });
  },

  /**
   * 取某个地区的下级列表。
   * @param {Array} regions 扁平地区列表
   * @param {number} parentId 上级 id
   * @returns {Array}
   */
  childrenOf(regions, parentId) {
    return (regions || []).filter((item) => item.parent_id === parentId);
  },

  /**
   * 选择省份。
   */
  onProvinceChange(e) {
    const index = Number(e.detail.value);
    const province = this.data.provinces[index] || {};
    const cities = this.childrenOf(this.data.regions, province.id);
    this.setData({
      provinceIndex: index,
      cityIndex: -1,
      districtIndex: -1,
      provinceName: province.name || '',
      cityName: '',
      districtName: '',
      cities: cities,
      districts: [],
    });
  },

  /**
   * 选择城市。
   */
  onCityChange(e) {
    const index = Number(e.detail.value);
    const city = this.data.cities[index] || {};
    const districts = this.childrenOf(this.data.regions, city.id);
    this.setData({
      cityIndex: index,
      districtIndex: -1,
      cityName: city.name || '',
      districtName: '',
      districts: districts,
    });
  },

  /**
   * 选择区县。
   */
  onDistrictChange(e) {
    const index = Number(e.detail.value);
    const district = this.data.districts[index] || {};
    this.setData({ districtIndex: index, districtName: district.name || '' });
  },

  /**
   * 保存选择的地区。
   */
  onSave() {
    if (!this.data.provinceName || !this.data.cityName || !this.data.districtName) {
      wx.showToast({ title: '请选择完整的省市区', icon: 'none' });
      return;
    }
    const text = this.data.provinceName + ' ' + this.data.cityName + ' ' + this.data.districtName;
    wx.showToast({ title: '已选择：' + text, icon: 'none' });
  },
});
