/**
 * 售后中
 * ---------------------------------------------------------------
 * 本页与同类页面共用 templates/order-list 模板，差异仅由参数区分。
 */
const { createOrderListPage } = require('../../templates/order-list');

Page(
  createOrderListPage({ status: 'ORDER_STATUS_REFUNDING', title: '售后中', emptyDesc: '当前没有处理中的售后订单' })
);
