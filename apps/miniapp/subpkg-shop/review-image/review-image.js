/**
 * 有图评价
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/review-list 模板，差异仅由参数区分。
 */
const { createReviewListPage } = require('../../templates/review-list');

Page(
  createReviewListPage({ filter: 'has_image', title: '有图评价', desc: '买家上传了实拍图的评价' })
);
