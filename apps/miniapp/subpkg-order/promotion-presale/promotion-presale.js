/**
 * 预售专区
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'presale', channelId: 5, title: '预售专区', intro: '新品首发预售，付定金锁定首发权益' })
);
