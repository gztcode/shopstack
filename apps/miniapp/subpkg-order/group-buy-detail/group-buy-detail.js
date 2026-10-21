/**
 * 拼团详情
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/group-buys/{id}
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
    groupBuyId: 0,
    groupBuy: null,
    members: [],
  },

  onLoad(options) {
    const id = Number((options && options.id) || 0);
    this.setData({ groupBuyId: id });
  },

  onShow() {
    this.loadDetail();
  },

  /**
   * 加载拼团详情。
   */
  loadDetail() {
    if (!this.data.groupBuyId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    api
      .getGroupBuy(this.data.groupBuyId)
      .then((data) => {
        const groupBuy = (data && data.group_buy) || null;
        const members = (data && data.members) || [];
        if (!groupBuy) {
          this.setData({ loading: false, groupBuy: null });
          return;
        }
        const groupSize = groupBuy.required_members || groupBuy.group_size || 1;
        const joined = groupBuy.joined_members || 0;
        this.setData({
          loading: false,
          groupBuy: {
            id: groupBuy.id,
            name: groupBuy.name,
            description: groupBuy.description,
            product_id: groupBuy.product_id,
            product_title: groupBuy.product_title,
            product_cover: groupBuy.product_image,
            price_text: format.formatYuan(groupBuy.price_cents),
            origin_text: format.formatYuan(groupBuy.original_price_cents),
            group_size: groupSize,
            joined_count: joined,
            need_count: Math.max(0, groupSize - joined),
            percent: Math.min(100, Math.round((joined / groupSize) * 100)),
            status: groupBuy.status,
            status_text: STATUS_TEXT[groupBuy.status] || '拼团中',
            end_text: '结束时间 ' + format.formatUnixTime(groupBuy.end_time),
          },
          members: members.map((member) => {
            const nickname = member.user_nickname || '匿名用户';
            return {
              id: member.id,
              user_nickname: nickname,
              // 头像位展示昵称首字：WXML 表达式不支持方法调用，这里算好。
              nickname_initial: nickname.slice(0, 1),
              joined_text: format.fromNow(member.joined_at),
            };
          }),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '拼团加载失败', icon: 'none' });
      });
  },

  /**
   * 参团。
   */
  onJoin() {
    if (!this.data.groupBuyId) {
      return;
    }
    wx.navigateTo({ url: '/subpkg-order/group-buy-join/group-buy-join?id=' + this.data.groupBuyId });
  },

  /**
   * 查看拼团商品。
   */
  onProductTap() {
    const productId = this.data.groupBuy && this.data.groupBuy.product_id;
    if (!productId) {
      return;
    }
    wx.navigateTo({ url: '/pages/detail/detail?id=' + productId });
  },

  /**
   * 返回拼团列表。
   */
  onGoList() {
    wx.navigateTo({ url: '/subpkg-order/group-buy-list/group-buy-list' });
  },
});
