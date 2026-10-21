/**
 * 活动列表
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/promotion-list 模板，差异仅由参数区分。
 */
const { createPromotionListPage } = require('../../templates/promotion-list');

Page(
  createPromotionListPage({ type: 'all', title: '活动列表', desc: '平台正在进行的全部优惠活动' })
);
