import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/points.dart';
import 'core_providers.dart';

/// 积分明细。
final pointsLogsProvider = FutureProvider<PointsLogsResult>((ref) async {
  try {
    return await ref
        .read(pointsApiProvider)
        .listPointsLogs(page: 1, pageSize: 50);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final logs = MockStore.instance.pointsLogs();
    return PointsLogsResult(
      logs: logs,
      meta: PageMeta(page: 1, pageSize: logs.length, total: logs.length, totalPages: 1),
      currentPoints: MockStore.instance.currentPoints(),
    );
  }
});
