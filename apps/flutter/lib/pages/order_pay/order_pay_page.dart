import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 待付款页：订单状态筛选为 `OrderStatus.pendingPayment.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderPayPage extends StatelessWidget {
  const OrderPayPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '待付款',
      status: OrderStatus.pendingPayment.code,
      emptyTitle: '没有待付款订单',
      emptySubtitle: '待支付订单会显示在这里',
    );
  }
}
