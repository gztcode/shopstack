import 'package:flutter/material.dart';

import '../../widgets/promotion_list_view.dart';

/// 限时秒杀页：活动类型 `flash`，数据来自 `GET /api/v1/promotions`。
///
/// 与其他活动页共用 [PromotionListView]，仅活动类型不同。
class PromotionFlashPage extends StatelessWidget {
  const PromotionFlashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PromotionListView(
      title: '限时秒杀',
      promotionType: 'flash',
      emptyHint: '当前场次已结束，下一场即将开始',
    );
  }
}
