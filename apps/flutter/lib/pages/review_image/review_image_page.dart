import 'package:flutter/material.dart';

import '../../widgets/review_filter_view.dart';

/// 有图评价页：筛选维度为 `has_image`，数据来自 `GET /api/v1/reviews`。
///
/// 与其他评价筛选页共用 [ReviewFilterView]，仅筛选维度不同。
class ReviewImagePage extends StatelessWidget {
  const ReviewImagePage({super.key, this.productId});

  /// 可选的商品 id。
  final int? productId;

  @override
  Widget build(BuildContext context) {
    return ReviewFilterView(
      title: '有图评价',
      filter: 'has_image',
      productId: productId,
    );
  }
}
