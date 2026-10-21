/**
 * 热销频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'hot', channelId: 3, title: '热销频道', intro: '销量领先的当红爆款' })
);
