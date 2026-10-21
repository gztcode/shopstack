/**
 * 待付款
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/order-list 模板，差异仅由参数区分。
 */
const { createOrderListPage } = require('../../templates/order-list');

Page(
  createOrderListPage({ status: 'ORDER_STATUS_PENDING_PAYMENT', title: '待付款', emptyDesc: '还没有待付款订单' })
);
