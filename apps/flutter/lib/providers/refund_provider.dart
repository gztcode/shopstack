import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_store.dart';
import '../models/order.dart';
import '../utils/enums.dart';
import 'core_providers.dart';
import 'order_provider.dart';
import 'user_provider.dart';

/// 可申请退款的订单（已付款 / 待收货 / 已完成）。
final refundableOrdersProvider = FutureProvider<List<Order>>((ref) async {
  try {
    final result = await ref
        .read(orderApiProvider)
        .listOrders(page: 1, pageSize: 50);
    return result.orders.where(_isRefundable).toList();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.orders().where(_isRefundable).toList();
  }
});

bool _isRefundable(Order order) =>
    order.status == OrderStatus.paid ||
    order.status == OrderStatus.shipped ||
    order.status == OrderStatus.completed;

/// 售后申请操作。
class RefundActions {
  RefundActions(this.ref);

  final Ref ref;

  /// 提交退款申请，成功返回 null，失败返回错误信息。
  Future<String?> apply({
    required int orderId,
    required String reason,
    required int amountCents,
    String description = '',
    List<int> itemIds = const <int>[],
  }) async {
    try {
      await ref.read(orderApiProvider).applyRefund(
            orderId,
            itemIds: itemIds,
            amountCents: amountCents,
            reason: reason,
            description: description,
          );
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.refundOrder(orderId);
    }
    ref.invalidate(refundableOrdersProvider);
    ref.invalidate(orderListProvider);
    ref.invalidate(orderCountProvider);
    return null;
  }
}

final refundActionsProvider = Provider<RefundActions>(RefundActions.new);
