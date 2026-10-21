/**
 * 清仓频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'clearance', channelId: 6, title: '清仓频道', intro: '断码清仓，低价出清' })
);
