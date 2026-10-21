/**
 * 全部订单
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/order-list 模板，差异仅由参数区分。
 */
const { createOrderListPage } = require('../../templates/order-list');

Page(
  createOrderListPage({ status: '', title: '全部订单', emptyDesc: '还没有任何订单' })
);
