/**
 * 推荐频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'recommend', channelId: 1, title: '推荐频道', intro: '结合你的浏览与收藏智能推荐' })
);
