import 'package:flutter/material.dart';

import '../../widgets/review_filter_view.dart';

/// 差评页：筛选维度为 `bad`，数据来自 `GET /api/v1/reviews`。
///
/// 与其他评价筛选页共用 [ReviewFilterView]，仅筛选维度不同。
class ReviewBadPage extends StatelessWidget {
  const ReviewBadPage({super.key, this.productId});

  /// 可选的商品 id。
  final int? productId;

  @override
  Widget build(BuildContext context) {
    return ReviewFilterView(
      title: '差评',
      filter: 'bad',
      productId: productId,
    );
  }
}
