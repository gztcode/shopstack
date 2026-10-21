import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 已完成页：订单状态筛选为 `OrderStatus.completed.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderDonePage extends StatelessWidget {
  const OrderDonePage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '已完成',
      status: OrderStatus.completed.code,
      emptyTitle: '没有已完成订单',
      emptySubtitle: '完成并确认收货的订单会归档到这里',
    );
  }
}
