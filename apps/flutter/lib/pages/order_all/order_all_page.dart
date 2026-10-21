import 'package:flutter/material.dart';

import '../../widgets/order_status_view.dart';

/// 全部订单页：订单状态筛选为 `null`，数据来自 `GET /api/v1/orders`。
///
/// 与其他订单状态页共用 [OrderStatusView]，仅订单状态不同。
class OrderAllPage extends StatelessWidget {
  const OrderAllPage({super.key});

  @override
  Widget build(BuildContext context) {
    return OrderStatusView(
      title: '全部订单',
      status: null,
      emptyTitle: '暂无相关订单',
      emptySubtitle: '去首页挑选心仪商品吧',
    );
  }
}
