import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock/mock_store.dart';
import '../models/payment.dart';
import '../utils/enums.dart';
import 'core_providers.dart';

/// 支付相关操作。
class PaymentActions {
  PaymentActions(this.ref);

  final Ref ref;

  /// 创建支付单，失败返回 null。
  Future<Payment?> createPayment({
    required int orderId,
    required PaymentChannel channel,
  }) async {
    try {
      return await ref.read(paymentApiProvider).createPayment(
            orderId: orderId,
            channel: channel.code,
          );
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      return MockStore.instance.createPayment(
        orderId: orderId,
        channel: channel.code,
      );
    }
  }

  /// 查询支付状态，失败返回 null。
  Future<Payment?> queryPayment({int? paymentId, int? orderId}) async {
    try {
      return await ref
          .read(paymentApiProvider)
          .queryPayment(paymentId: paymentId, orderId: orderId);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      return MockStore.instance.queryPayment(
        paymentId: paymentId,
        orderId: orderId,
      );
    }
  }
}

final paymentActionsProvider = Provider<PaymentActions>(PaymentActions.new);
