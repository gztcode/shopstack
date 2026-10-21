/**
 * 限时秒杀
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/promotion-list 模板，差异仅由参数区分。
 */
const { createPromotionListPage } = require('../../templates/promotion-list');

Page(
  createPromotionListPage({ type: 'flash', title: '限时秒杀', desc: '限量抢购，售完即止' })
);
