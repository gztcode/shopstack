/**
 * 物流查询
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/logistics/tracking/{no}
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    trackingNo: '',
    searching: false,
    searched: false,
    result: null,
  },

  /**
   * 输入运单号。
   */
  onInput(e) {
    this.setData({ trackingNo: e.detail.value });
  },

  /**
   * 查询物流。
   */
  onSearch() {
    const no = this.data.trackingNo.trim();
    if (!no) {
      wx.showToast({ title: '请输入运单号', icon: 'none' });
      return;
    }
    if (this.data.searching) {
      return;
    }
    this.setData({ searching: true });
    api
      .getTrackingByNo(no)
      .then((data) => {
        this.setData({
          searching: false,
          searched: true,
          result: {
            tracking_no: (data && data.tracking_no) || no,
            company: (data && data.company) || '未知快递',
            status_text: (data && data.status) === 'SHIPMENT_STATUS_SHIPPED' ? '运输中' : '待揽收',
            tracks: ((data && data.tracks) || []).map((track) => ({
              id: track.id,
              description: track.description,
              occurred_text: format.formatDateTime(track.occurred_at),
              location: track.location,
            })),
          },
        });
      })
      .catch((error) => {
        this.setData({ searching: false });
        wx.showToast({ title: (error && error.message) || '查询失败', icon: 'none' });
      });
  },

  /**
   * 清空输入。
   */
  onClear() {
    this.setData({ trackingNo: '', searched: false, result: null });
  },
});
