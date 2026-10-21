import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../utils/enums.dart';
import '../utils/json_util.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// 可评价的订单（已付款 / 待收货 / 已完成）。
final reviewableOrdersProvider = FutureProvider<List<Order>>((ref) async {
  try {
    final result = await ref
        .read(orderApiProvider)
        .listOrders(page: 1, pageSize: 50);
    return result.orders.where(_isReviewable).toList();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.orders().where(_isReviewable).toList();
  }
});

bool _isReviewable(Order order) =>
    order.status == OrderStatus.paid ||
    order.status == OrderStatus.shipped ||
    order.status == OrderStatus.completed;

/// 我发表过的评价。
final myReviewsProvider = FutureProvider<List<Review>>((ref) async {
  try {
    final userId = ref.read(currentUserIdProvider);
    final data = await ref.read(productApiProvider).client.get('/reviews', query: {
      'user_id': userId,
      'page.page': 1,
      'page.page_size': 50,
    });
    return JsonUtil.asMapList(data['reviews']).map(Review.fromJson).toList();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockData.reviews.take(2).toList();
  }
});

/// 发表评价。
class ReviewActions {
  ReviewActions(this.ref);

  final Ref ref;

  /// 提交评价，成功返回 null，失败返回错误信息。
  Future<String?> submit({
    required int productId,
    required int skuId,
    required int rating,
    required String content,
    List<String> images = const <String>[],
  }) async {
    try {
      await ref.read(productApiProvider).createReview(
            productId: productId,
            skuId: skuId,
            rating: rating,
            content: content,
            images: images,
          );
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
    }
    ref.invalidate(myReviewsProvider);
    return null;
  }
}

final reviewActionsProvider = Provider<ReviewActions>(ReviewActions.new);
