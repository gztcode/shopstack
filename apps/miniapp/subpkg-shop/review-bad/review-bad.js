/**
 * 差评
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/review-list 模板，差异仅由参数区分。
 */
const { createReviewListPage } = require('../../templates/review-list');

Page(
  createReviewListPage({ filter: 'bad', title: '差评', desc: '2 星及以下的待改进反馈' })
);
