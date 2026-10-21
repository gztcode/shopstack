/**
 * 已回复评价
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/review-list 模板，差异仅由参数区分。
 */
const { createReviewListPage } = require('../../templates/review-list');

Page(
  createReviewListPage({ filter: 'has_reply', title: '已回复评价', desc: '商家已经回复过的评价' })
);
