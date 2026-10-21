/**
 * 拼团列表
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/group-buy-list 模板，差异仅由参数区分。
 */
const { createGroupBuyListPage } = require('../../templates/group-buy-list');

Page(
  createGroupBuyListPage({ title: '拼团列表', desc: '和好友一起拼，优惠力度更大' })
);
