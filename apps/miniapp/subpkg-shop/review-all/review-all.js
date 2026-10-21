/**
 * 全部评价
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/review-list 模板，差异仅由参数区分。
 */
const { createReviewListPage } = require('../../templates/review-list');

Page(
  createReviewListPage({ filter: 'all', title: '全部评价', desc: '来自已验证订单的真实评价' })
);
