/**
 * 物流轨迹
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/logistics/tracks
 */
const api = require('../../utils/api');
const format = require('../../utils/format');

Page({
  data: {
    loading: true,
    orderId: 0,
    shipment: null,
    tracks: [],
  },

  onLoad(options) {
    const orderId = Number((options && options.order_id) || 0);
    this.setData({ orderId: orderId });
  },

  onShow() {
    this.loadTracks();
  },

  /**
   * 加载物流轨迹。
   */
  loadTracks() {
    if (!this.data.orderId) {
      this.setData({ loading: false, tracks: [] });
      return;
    }
    this.setData({ loading: true });
    api
      .getShipmentTracks({ order_id: this.data.orderId })
      .then((data) => {
        const shipment = (data && data.shipment) || null;
        const tracks = (data && data.tracks) || [];
        this.setData({
          loading: false,
          shipment: shipment
            ? {
                tracking_no: shipment.tracking_no,
                company: shipment.company,
                status_text: shipment.status === 'SHIPMENT_STATUS_DELIVERED' ? '已签收' : (shipment.status === 'SHIPMENT_STATUS_SHIPPED' ? '运输中' : '待发货'),
                receiver: shipment.receiver,
                phone: shipment.phone,
                address: shipment.address,
                shipped_text: shipment.shipped_at ? format.formatDateTime(shipment.shipped_at) : '暂无发货记录',
              }
            : null,
          tracks: tracks.map((track) => ({
            id: track.id,
            location: track.location,
            description: track.description,
            occurred_text: format.formatDateTime(track.occurred_at),
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '物流轨迹加载失败', icon: 'none' });
      });
  },

  /**
   * 按运单号查询其它物流。
   */
  onGoQuery() {
    wx.navigateTo({ url: '/subpkg-order/logistics-track/logistics-track' });
  },
});
