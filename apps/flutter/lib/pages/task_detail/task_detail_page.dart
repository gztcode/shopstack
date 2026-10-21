import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 任务详情页：展示单个任务的进度与奖励，数据来自
/// `GET /api/v1/marketing/tasks/{id}`。
class TaskDetailPage extends ConsumerWidget {
  const TaskDetailPage({super.key, this.taskId = 0});

  /// 任务 id。
  final int taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final task = ref.watch(taskDetailProvider(taskId));
    return Scaffold(
      appBar: AppBar(title: const Text('任务详情')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: task.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          data.description,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.6,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusSm),
                          child: LinearProgressIndicator(
                            value: data.progressRatio,
                            minHeight: 8,
                            backgroundColor: AppTheme.bgMuted,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                                AppTheme.brand),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(
                              data.target > 0
                                  ? '已完成 ${data.progress} / ${data.target}'
                                  : '已完成 ${data.progress}',
                              style: const TextStyle(
                                  fontSize: 12, color: AppTheme.textTertiary),
                            ),
                            const Spacer(),
                            Text(
                              '${(data.progressRatio * 100).round()}%',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.brand,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '任务奖励',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _RewardRow(
                          icon: Icons.stars_outlined,
                          label: '积分奖励',
                          value: '+${data.rewardPoints}',
                        ),
                        const Divider(height: 20),
                        _RewardRow(
                          icon: Icons.account_balance_wallet_outlined,
                          label: '现金奖励',
                          value: Money.formatYuanWithSymbol(data.rewardCents),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: data.completed
                        ? null
                        : () => _claim(context, ref),
                    child: Text(data.completed ? '奖励已领取' : '领取奖励'),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '任务加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(taskDetailProvider(taskId)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _claim(BuildContext context, WidgetRef ref) async {
    final message =
        await ref.read(expansionActionsProvider).claimTask(taskId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

/// 奖励明细行。
class _RewardRow extends StatelessWidget {
  const _RewardRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.brand),
        const SizedBox(width: 10),
        Text(
          label,
          style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
