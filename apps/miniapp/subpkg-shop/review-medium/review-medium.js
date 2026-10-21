/**
 * 中评
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/review-list 模板，差异仅由参数区分。
 */
const { createReviewListPage } = require('../../templates/review-list');

Page(
  createReviewListPage({ filter: 'medium', title: '中评', desc: '3 星的中立评价内容' })
);
