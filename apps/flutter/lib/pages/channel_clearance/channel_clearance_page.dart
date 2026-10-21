import 'package:flutter/material.dart';

import '../../widgets/channel_products_view.dart';

/// 清仓频道页：清仓特卖。
///
/// 与其他频道页共用 [ChannelProductsView]，仅频道维度（clearance）不同，
/// 数据来自 `GET /api/v1/channels/{id}/products`。
class ChannelClearancePage extends StatelessWidget {
  const ChannelClearancePage({super.key, this.channelId});

  /// 可选的频道 id，为空时按频道维度自动匹配。
  final int? channelId;

  @override
  Widget build(BuildContext context) {
    return ChannelProductsView(
      title: '清仓',
      channelType: 'clearance',
      channelId: channelId,
    );
  }
}
