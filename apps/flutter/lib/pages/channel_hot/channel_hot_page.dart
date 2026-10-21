import 'package:flutter/material.dart';

import '../../widgets/channel_products_view.dart';

/// 热销频道页：热销爆款。
///
/// 与其他频道页共用 [ChannelProductsView]，仅频道维度（hot）不同，
/// 数据来自 `GET /api/v1/channels/{id}/products`。
class ChannelHotPage extends StatelessWidget {
  const ChannelHotPage({super.key, this.channelId});

  /// 可选的频道 id，为空时按频道维度自动匹配。
  final int? channelId;

  @override
  Widget build(BuildContext context) {
    return ChannelProductsView(
      title: '热销',
      channelType: 'hot',
      channelId: channelId,
    );
  }
}
