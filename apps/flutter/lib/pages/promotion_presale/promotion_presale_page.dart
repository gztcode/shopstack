import 'package:flutter/material.dart';

import '../../widgets/promotion_list_view.dart';

/// 预售专区页：活动类型 `presale`，数据来自 `GET /api/v1/promotions`。
///
/// 与其他活动页共用 [PromotionListView]，仅活动类型不同。
class PromotionPresalePage extends StatelessWidget {
  const PromotionPresalePage({super.key});

  @override
  Widget build(BuildContext context) {
    return PromotionListView(
      title: '预售专区',
      promotionType: 'presale',
      emptyHint: '暂无预售活动，先关注新品预告',
    );
  }
}
