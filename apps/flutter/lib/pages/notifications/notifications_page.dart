import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/notification.dart';
import '../../providers/user_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 消息通知页。
class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('消息通知'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(userActionsProvider).markAllRead();
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('已全部标记为已读')),
              );
            },
            child: const Text('全部已读'),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: notifications.when(
              data: (result) {
                if (result.notifications.isEmpty) {
                  return const EmptyState(
                    title: '暂无消息',
                    subtitle: '订单与活动动态会在这里提醒你',
                    icon: Icons.notifications_none_rounded,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                  itemCount: result.notifications.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = result.notifications[index];
                    return _NotificationTile(
                      notification: item,
                      onRead: () =>
                          ref.read(userActionsProvider).markRead(item.id),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const EmptyState(
                title: '消息加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onRead});

  final AppNotification notification;
  final VoidCallback onRead;

  IconData get _icon {
    switch (notification.type) {
      case NotificationType.order:
        return Icons.receipt_long_outlined;
      case NotificationType.logistics:
        return Icons.local_shipping_outlined;
      case NotificationType.promotion:
        return Icons.campaign_outlined;
      case NotificationType.system:
        return Icons.info_outline_rounded;
      case NotificationType.unspecified:
        return Icons.notifications_none_rounded;
    }
  }

  Color get _color {
    switch (notification.type) {
      case NotificationType.order:
        return AppTheme.brand;
      case NotificationType.logistics:
        return AppTheme.info;
      case NotificationType.promotion:
        return AppTheme.accent600;
      case NotificationType.system:
      case NotificationType.unspecified:
        return AppTheme.textTertiary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: notification.read ? null : onRead,
      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
      child: AppCard(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: Icon(_icon, size: 18, color: _color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ),
                      if (!notification.read)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.danger,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    notification.content,
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${notification.type.label} · ${DateFormatter.relative(notification.createdAt)}',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
