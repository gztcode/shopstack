import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/logistics.dart';
import '../models/order.dart';
import '../utils/enums.dart';
import 'cart_provider.dart';
import 'core_providers.dart';
import 'user_provider.dart';

/// 订单列表（按状态过滤，null 表示全部）。
final orderListProvider =
    FutureProvider.family<OrderListResult, int?>((ref, status) async {
  try {
    return await ref
        .read(orderApiProvider)
        .listOrders(status: status, pageSize: 50);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final orders = MockStore.instance.orders(status: status);
    final count = MockStore.instance.orderCount();
    return OrderListResult(
      orders: orders,
      meta: PageMeta(page: 1, pageSize: orders.length, total: orders.length, totalPages: 1),
      pendingPaymentCount: count.pendingPayment,
      pendingShipmentCount: count.pendingShipment,
      pendingReceiptCount: count.pendingReceipt,
      refundingCount: count.refunding,
    );
  }
});

/// 订单详情。
final orderDetailProvider =
    FutureProvider.family<OrderDetail, int>((ref, id) async {
  try {
    return await ref.read(orderApiProvider).orderDetail(id);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return _mockDetail(id);
  }
});

OrderDetail _mockDetail(int id) {
  final order = MockStore.instance.orderById(id) ??
      MockData.demoOrders().first;
  final items = MockStore.instance.orderItems(order.id);
  final logs = MockStore.instance.orderLogs(order.id);
  final status = order.status;
  return OrderDetail(
    order: order,
    items: items,
    logs: logs,
    couponId: 0,
    couponName: '',
    paymentId: 0,
    shipmentId: 0,
    trackingNo: status == OrderStatus.shipped ? 'SF1234567890' : '',
    logisticsCompany: status == OrderStatus.shipped ? '顺丰速运' : '',
    logisticsTracks: const <String>[],
    canCancel: status == OrderStatus.pendingPayment,
    canPay: status == OrderStatus.pendingPayment,
    canConfirm: status == OrderStatus.shipped,
    canRefund: status == OrderStatus.paid || status == OrderStatus.shipped,
    canReview: status == OrderStatus.completed,
  );
}

/// 订单状态日志。
final orderLogsProvider =
    FutureProvider.family<List<OrderStatusLog>, int>((ref, orderId) async {
  try {
    return await ref.read(orderApiProvider).logs(orderId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.orderLogs(orderId);
  }
});

/// 订单物流。
final logisticsProvider =
    FutureProvider.family<LogisticsResult, int>((ref, orderId) async {
  try {
    return await ref.read(logisticsApiProvider).orderLogistics(orderId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.orderLogistics(orderId);
  }
});

/// 订单写操作。
class OrderActions {
  OrderActions(this.ref);

  final Ref ref;

  /// 创建订单，返回订单号；失败返回错误信息。
  Future<MapEntry<int, String?>> createOrder({
    List<Map<String, dynamic>> items = const <Map<String, dynamic>>[],
    bool fromCart = false,
    List<int> cartItemIds = const <int>[],
    int addressId = 0,
    int couponId = 0,
    String remark = '',
    String paymentMethod = 'wechat',
  }) async {
    try {
      final order = await ref.read(orderApiProvider).createOrder(
            items: items,
            fromCart: fromCart,
            cartItemIds: cartItemIds,
            addressId: addressId,
            couponId: couponId,
            remark: remark,
            paymentMethod: paymentMethod,
          );
      await ref.read(cartProvider.notifier).load();
      return MapEntry(order.id, null);
    } on ApiException catch (e) {
      return MapEntry(0, e.message);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      final order = MockStore.instance.createOrder(
        items: items,
        fromCart: fromCart,
        cartItemIds: cartItemIds,
        addressId: addressId,
        couponId: couponId,
        remark: remark,
        paymentMethod: paymentMethod,
      );
      await ref.read(cartProvider.notifier).load();
      return MapEntry(order.id, null);
    }
  }

  /// 取消订单。
  Future<String?> cancel(int orderId, {String reason = ''}) async {
    try {
      await ref.read(orderApiProvider).cancelOrder(orderId, reason: reason);
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.cancelOrder(orderId);
    }
    _invalidateOrder(orderId);
    return null;
  }

  /// 确认收货。
  Future<String?> confirm(int orderId) async {
    try {
      await ref.read(orderApiProvider).confirmReceipt(orderId);
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.confirmOrder(orderId);
    }
    _invalidateOrder(orderId);
    return null;
  }

  /// 申请退款。
  Future<String?> refund(
    int orderId, {
    String reason = '',
    String description = '',
  }) async {
    try {
      await ref.read(orderApiProvider).applyRefund(
            orderId,
            reason: reason,
            description: description,
          );
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.refundOrder(orderId);
    }
    _invalidateOrder(orderId);
    return null;
  }

  void _invalidateOrder(int orderId) {
    ref.invalidate(orderDetailProvider(orderId));
    ref.invalidate(orderLogsProvider(orderId));
    ref.invalidate(orderListProvider);
    ref.invalidate(orderCountProvider);
  }
}

final orderActionsProvider = Provider<OrderActions>(OrderActions.new);
