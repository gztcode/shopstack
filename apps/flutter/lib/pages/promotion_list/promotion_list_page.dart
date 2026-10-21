import 'package:flutter/material.dart';

import '../../widgets/promotion_list_view.dart';

/// 活动列表页：活动类型 `all`，数据来自 `GET /api/v1/promotions`。
///
/// 与其他活动页共用 [PromotionListView]，仅活动类型不同。
class PromotionListPage extends StatelessWidget {
  const PromotionListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return PromotionListView(
      title: '活动列表',
      promotionType: 'all',
      emptyHint: '商家开启活动后会在这里展示',
    );
  }
}
