import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 通知设置页：开关各类消息提醒，数据来自
/// `GET/PUT /api/v1/users/notification-settings`。
class NotificationSettingPage extends ConsumerWidget {
  const NotificationSettingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(notificationSettingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('通知设置')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: settings.when(
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    title: '暂无可设置的项',
                    subtitle: '商家配置通知项后即可在这里开关',
                    icon: Icons.notifications_off_outlined,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final setting = list[index];
                    return _SettingCard(setting: setting);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '通知设置加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(notificationSettingsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 单个通知开关卡片。
class _SettingCard extends ConsumerWidget {
  const _SettingCard({required this.setting});

  final NotificationSetting setting;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppCard(
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  setting.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                if (setting.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    setting.description,
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ],
            ),
          ),
          Switch(
            value: setting.enabled,
            onChanged: (value) => _toggle(context, ref, value),
          ),
        ],
      ),
    );
  }

  Future<void> _toggle(
      BuildContext context, WidgetRef ref, bool value) async {
    final message = await ref
        .read(expansionActionsProvider)
        .updateNotificationSetting(setting.category, value);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
