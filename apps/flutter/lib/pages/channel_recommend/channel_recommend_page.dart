import 'package:flutter/material.dart';

import '../../widgets/channel_products_view.dart';

/// 推荐频道页：为你推荐。
///
/// 与其他频道页共用 [ChannelProductsView]，仅频道维度（recommend）不同，
/// 数据来自 `GET /api/v1/channels/{id}/products`。
class ChannelRecommendPage extends StatelessWidget {
  const ChannelRecommendPage({super.key, this.channelId});

  /// 可选的频道 id，为空时按频道维度自动匹配。
  final int? channelId;

  @override
  Widget build(BuildContext context) {
    return ChannelProductsView(
      title: '推荐',
      channelType: 'recommend',
      channelId: channelId,
    );
  }
}
