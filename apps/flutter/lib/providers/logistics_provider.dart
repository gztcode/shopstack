import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock/mock_store.dart';
import '../models/logistics.dart';
import 'core_providers.dart';

/// 物流查询结果（含错误信息，便于页面给出重试入口）。
class LogisticsPageState {
  const LogisticsPageState({this.result, this.error});

  final LogisticsResult? result;

  /// 接口异常信息（非空时页面展示错误条与重试按钮）。
  final String? error;

  bool get hasData =>
      result != null &&
      (result!.shipment != null || result!.tracks.isNotEmpty);
}

/// 按订单查询物流轨迹。
final orderLogisticsProvider =
    FutureProvider.family<LogisticsPageState, int>((ref, orderId) async {
  try {
    final result = await ref.read(logisticsApiProvider).tracksByOrder(orderId);
    return LogisticsPageState(result: result);
  } catch (e) {
    ref.read(demoModeProvider.notifier).enable();
    return LogisticsPageState(
      result: MockStore.instance.orderLogistics(orderId),
      error: '物流服务暂时不可用，已切换为演示数据',
    );
  }
});
