/**
 * 限时频道
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/channel-feed 模板，差异仅由参数区分。
 */
const { createChannelFeedPage } = require('../../templates/channel-feed');

Page(
  createChannelFeedPage({ code: 'flash', channelId: 4, title: '限时频道', intro: '整点开抢，售完即止' })
);
