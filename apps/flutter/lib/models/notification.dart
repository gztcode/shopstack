import '../utils/enums.dart';
import '../utils/json_util.dart';
import 'common.dart';

/// 站内消息，对应 shopstack.notification.v1.Notification。
class AppNotification {
  const AppNotification({
    this.id = 0,
    this.userId = 0,
    this.type = NotificationType.system,
    this.title = '',
    this.content = '',
    this.link = '',
    this.bizId = 0,
    this.read = false,
    this.createdAt = '',
    this.readAt = '',
  });

  final int id;
  final int userId;
  final NotificationType type;
  final String title;
  final String content;
  final String link;
  final int bizId;
  final bool read;
  final String createdAt;
  final String readAt;

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: JsonUtil.intOf(json, 'id'),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        type: parseEnumValue<NotificationType>(
          json['type'],
          NotificationType.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        title: JsonUtil.stringOf(json, 'title'),
        content: JsonUtil.stringOf(json, 'content'),
        link: JsonUtil.stringOf(json, 'link'),
        bizId: JsonUtil.intOf(json, 'biz_id', JsonUtil.intOf(json, 'bizId')),
        read: JsonUtil.boolOf(json, 'read'),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        readAt:
            JsonUtil.stringOf(json, 'read_at', JsonUtil.stringOf(json, 'readAt')),
      );
}

/// 消息列表结果，对应 shopstack.notification.v1.ListNotificationsResponse。
class NotificationListResult {
  const NotificationListResult({
    this.notifications = const <AppNotification>[],
    this.meta = PageMeta.empty,
    this.unreadCount = 0,
  });

  final List<AppNotification> notifications;
  final PageMeta meta;
  final int unreadCount;

  factory NotificationListResult.fromJson(Map<String, dynamic> json) =>
      NotificationListResult(
        notifications: JsonUtil.asMapList(json['notifications'])
            .map(AppNotification.fromJson)
            .toList(),
        meta: PageMeta.fromJson(JsonUtil.asMap(json['meta'])),
        unreadCount: JsonUtil.intOf(json, 'unread_count',
            JsonUtil.intOf(json, 'unreadCount')),
      );
}
