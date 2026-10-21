import '../models/expansion.dart';
import '../models/notification.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 站内消息接口。
class NotificationApi {
  NotificationApi(this.client);

  final ApiClient client;

  /// 消息列表。
  Future<NotificationListResult> list({
    int? type,
    bool unreadOnly = false,
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/notifications', query: {
      'type': ?type,
      'unread_only': unreadOnly,
      'page.page': page,
      'page.page_size': pageSize,
    });
    return NotificationListResult.fromJson(data);
  }

  /// 标记已读。
  Future<void> markRead(int id) async {
    await client.put('/notifications/$id/read');
  }

  /// 全部标记已读。
  Future<void> markAllRead() async {
    await client.post('/notifications/read-all');
  }

  /// 未读数量。
  Future<int> unreadCount() async {
    final data = await client.get('/notifications/unread-count');
    return data['count'] is int ? data['count'] as int : 0;
  }

  /// 消息分类。
  Future<List<NotificationCategory>> categories() async {
    final data = await client.get('/notifications/categories');
    return JsonUtil.asMapList(data['categories'])
        .map(NotificationCategory.fromJson)
        .toList();
  }
}
