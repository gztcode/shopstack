/**
 * 已完成
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/order-list 模板，差异仅由参数区分。
 */
const { createOrderListPage } = require('../../templates/order-list');

Page(
  createOrderListPage({ status: 'ORDER_STATUS_COMPLETED', title: '已完成', emptyDesc: '还没有已完成订单' })
);
