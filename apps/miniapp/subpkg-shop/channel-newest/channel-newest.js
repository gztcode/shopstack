/**
 * 新品频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'newest', channelId: 2, title: '新品频道', intro: '最近上架的当季新品' })
);
