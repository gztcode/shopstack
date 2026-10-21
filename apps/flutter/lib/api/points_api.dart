import '../models/points.dart';
import 'api_client.dart';

/// 积分明细接口。
class PointsApi {
  PointsApi(this.client);

  final ApiClient client;

  /// 积分变动明细。
  Future<PointsLogsResult> listPointsLogs({
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/users/points-logs', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PointsLogsResult.fromJson(data);
  }
}
