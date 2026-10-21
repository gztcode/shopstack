import 'package:flutter/material.dart';

import '../../widgets/review_filter_view.dart';

/// 好评页：筛选维度为 `good`，数据来自 `GET /api/v1/reviews`。
///
/// 与其他评价筛选页共用 [ReviewFilterView]，仅筛选维度不同。
class ReviewGoodPage extends StatelessWidget {
  const ReviewGoodPage({super.key, this.productId});

  /// 可选的商品 id。
  final int? productId;

  @override
  Widget build(BuildContext context) {
    return ReviewFilterView(
      title: '好评',
      filter: 'good',
      productId: productId,
    );
  }
}
