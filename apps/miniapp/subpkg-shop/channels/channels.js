/**
 * 频道列表
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/channels
 */
const api = require('../../utils/api');

/** 频道 code -> 频道页面路径（与 app.json 中的分包页面一一对应） */
const CHANNEL_PAGES = {
  recommend: '/subpkg-shop/channel-recommend/channel-recommend',
  newest: '/subpkg-shop/channel-newest/channel-newest',
  hot: '/subpkg-shop/channel-hot/channel-hot',
  flash: '/subpkg-shop/channel-flash/channel-flash',
  presale: '/subpkg-shop/channel-presale/channel-presale',
  clearance: '/subpkg-shop/channel-clearance/channel-clearance',
  freeship: '/subpkg-shop/channel-freeship/channel-freeship',
  cross: '/subpkg-shop/channel-cross/channel-cross',
  fresh: '/subpkg-shop/channel-fresh/channel-fresh',
};

/** 频道 code -> 前端图标（后端 icon 字段为图片地址，此处仅做列表装饰） */
const CHANNEL_ICONS = {
  recommend: '✨',
  newest: '🆕',
  hot: '🔥',
  flash: '⏰',
  presale: '📅',
  clearance: '🏷️',
  freeship: '🚚',
  cross: '🌏',
  fresh: '🥬',
};

Page({
  data: {
    loading: true,
    channels: [],
  },

  onShow() {
    this.loadChannels();
  },

  /**
   * 加载频道列表。
   */
  loadChannels() {
    this.setData({ loading: true });
    api
      .listChannels()
      .then((data) => {
        const list = (data && data.channels) || [];
        this.setData({
          loading: false,
          channels: list.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            icon_text: CHANNEL_ICONS[item.code] || '🏷️',
            description: item.description,
            banner_url: item.banner_url,
            product_count: item.product_count || 0,
          })),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '频道加载失败', icon: 'none' });
      });
  },

  /**
   * 进入频道页。
   */
  onChannelTap(e) {
    const code = e.currentTarget.dataset.code;
    const url = CHANNEL_PAGES[code] || CHANNEL_PAGES.recommend;
    wx.navigateTo({ url: url });
  },

  /**
   * 空状态引导：回到首页。
   */
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
