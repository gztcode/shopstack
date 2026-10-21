/**
 * 我的拼团
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/group-buy-list 模板，差异仅由参数区分。
 */
const { createGroupBuyListPage } = require('../../templates/group-buy-list');

Page(
  createGroupBuyListPage({ mine: true, title: '我的拼团', desc: '你参与过的全部拼团' })
);
