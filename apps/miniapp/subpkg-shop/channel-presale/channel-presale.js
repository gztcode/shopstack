/**
 * 预售频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'presale', channelId: 5, title: '预售频道', intro: '预售定金锁定首发权益' })
);
