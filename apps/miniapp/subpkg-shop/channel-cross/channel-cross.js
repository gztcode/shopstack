/**
 * 跨境频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'cross', channelId: 8, title: '跨境频道', intro: '原产地直采，全球好物' })
);
