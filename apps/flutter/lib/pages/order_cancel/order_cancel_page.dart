import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 已取消页：订单状态筛选为 `OrderStatus.cancelled.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderCancelPage extends StatelessWidget {
  const OrderCancelPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '已取消',
      status: OrderStatus.cancelled.code,
      emptyTitle: '没有已取消订单',
      emptySubtitle: '已取消的订单会保留在这里',
    );
  }
}
