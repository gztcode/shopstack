/**
 * 生鲜频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'fresh', channelId: 9, title: '生鲜频道', intro: '冷链直发，新鲜到家' })
);
