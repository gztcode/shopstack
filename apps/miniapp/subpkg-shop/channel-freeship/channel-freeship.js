/**
 * 包邮频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'freeship', channelId: 7, title: '包邮频道', intro: '全国包邮，无需凑单' })
);
