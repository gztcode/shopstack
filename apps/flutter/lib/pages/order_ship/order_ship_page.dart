import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 待发货页：订单状态筛选为 `OrderStatus.paid.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderShipPage extends StatelessWidget {
  const OrderShipPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '待发货',
      status: OrderStatus.paid.code,
      emptyTitle: '没有待发货订单',
      emptySubtitle: '商家发货后会在这里更新',
    );
  }
}
