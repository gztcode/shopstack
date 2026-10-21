import 'package:flutter/material.dart';

import '../../utils/enums.dart';
import '../../widgets/order_status_view.dart';

/// 退款/售后中页：订单状态筛选为 `OrderStatus.refunding.code`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderRefundingPage extends StatelessWidget {
  const OrderRefundingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '退款/售后中',
      status: OrderStatus.refunding.code,
      emptyTitle: '没有售后中的订单',
      emptySubtitle: '退款申请处理中会显示在这里',
    );
  }
}
