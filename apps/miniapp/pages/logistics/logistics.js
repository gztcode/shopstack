/**
 * 物流跟踪
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/logistics/tracks?order_id=<int64>
 *       GET /api/v1/logistics/order/{order_id}
 *       GET /api/v1/orders（选择要跟踪的订单）
 */
const api = require('../../utils/api');
const format = require('../../utils/format');
const enums = require('../../utils/enums');

Page({
  data: {
    loading: true,
    error: '',
    orderId: 0,
    /** 可选择的订单 */
    orders: [],
    /** 发货单 */
    shipment: null,
    /** 轨迹 */
    tracks: [],
  },

  onLoad(options) {
    const orderId = Number(options && options.order_id) || 0;
    this.setData({ orderId: orderId });
    if (orderId) {
      this.loadTracks(orderId);
    } else {
      this.loadOrders();
    }
  },

  /**
   * 加载可跟踪的订单列表。
   */
  loadOrders() {
    this.setData({ loading: true, error: '' });
    api
      .listOrders({ page: 1, page_size: 20 })
      .then((data) => {
        const orders = ((data && data.orders) || [])
          .filter((order) => order.status === 'ORDER_STATUS_SHIPPED' || order.status === 'ORDER_STATUS_COMPLETED' || order.status === 'ORDER_STATUS_PAID')
          .map((order) => ({
            id: order.id,
            order_no: order.order_no,
            status_text: enums.orderStatusText(order.status),
            total_text: format.formatYuan(order.payable_cents),
            created_text: format.formatDateTime(order.created_at),
            item_count: order.total_quantity || order.item_count || 0,
          }));
        this.setData({ loading: false, orders: orders });
      })
      .catch((error) => {
        this.setData({ loading: false, error: (error && error.message) || '订单加载失败' });
      });
  },

  /**
   * 加载指定订单的物流轨迹。
   * @param {number} orderId 订单 ID
   */
  loadTracks(orderId) {
    this.setData({ loading: true, error: '' });
    api
      .getShipmentTracks({ order_id: orderId })
      .then((data) => {
        const shipment = (data && data.shipment) || null;
        const tracks = (data && data.tracks) || [];
        this.setData({
          loading: false,
          shipment: shipment
            ? {
                id: shipment.id,
                company: shipment.company || '未知承运商',
                tracking_no: shipment.tracking_no || '',
                status: shipment.status,
                status_text: enums.textOf(enums.SHIPMENT_STATUS, shipment.status, '物流信息'),
                receiver: shipment.receiver || '',
                phone: shipment.phone || '',
                address: shipment.address || '',
                freight_text: format.formatYuan(shipment.freight_cents),
                shipped_text: format.formatDateTime(shipment.shipped_at),
                delivered_text: format.formatDateTime(shipment.delivered_at),
              }
            : null,
          tracks: tracks.map((track) => ({
            id: track.id,
            location: track.location || '',
            description: track.description || '',
            time_text: format.formatDateTime(track.occurred_at),
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false, error: (error && error.message) || '物流信息加载失败' });
      });
  },

  /**
   * 选择要跟踪的订单。
   */
  onOrderTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ orderId: id });
    this.loadTracks(id);
  },

  /**
   * 切换到订单选择列表。
   */
  onChooseOrder() {
    this.setData({ orderId: 0, shipment: null, tracks: [] });
    this.loadOrders();
  },

  /**
   * 复制运单号。
   */
  onCopyTracking() {
    const no = this.data.shipment && this.data.shipment.tracking_no;
    if (!no) {
      return;
    }
    wx.setClipboardData({
      data: no,
      success() {
        wx.showToast({ title: '运单号已复制', icon: 'none' });
      },
    });
  },

  /**
   * 重试。
   */
  onRetry() {
    if (this.data.orderId) {
      this.loadTracks(this.data.orderId);
    } else {
      this.loadOrders();
    }
  },

  /**
   * 查看订单详情。
   */
  onOrderDetail() {
    if (!this.data.orderId) {
      return;
    }
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + this.data.orderId });
  },
});
