import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 待收货页：订单状态筛选为 `OrderStatus.shipped.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderReceivePage extends StatelessWidget {
  const OrderReceivePage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '待收货',
      status: OrderStatus.shipped.code,
      emptyTitle: '没有待收货订单',
      emptySubtitle: '包裹发出后可在这里查看物流',
    );
  }
}
