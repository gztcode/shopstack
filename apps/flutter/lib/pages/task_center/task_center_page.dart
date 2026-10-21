import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 任务中心页：展示可参与的任务与奖励，数据来自
/// `GET /api/v1/marketing/tasks`。
class TaskCenterPage extends ConsumerWidget {
  const TaskCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(tasksProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('任务中心')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: tasks.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无可参与的任务',
                    subtitle: '商家配置任务后即可在这里领取奖励',
                    icon: Icons.assignment_outlined,
                    actionText: '去首页逛逛',
                    onAction: () => context.go('/home'),
                  );
                }
                final doneCount = list.where((t) => t.completed).length;
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '今日任务',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '已完成 $doneCount / ${list.length} 个任务',
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.textTertiary),
                                ),
                              ],
                            ),
                          ),
                          StatusTag(
                            text: '完成全部得 ${list.length * 50} 积分',
                            color: AppTheme.accent600,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (final task in list) ...[
                      _TaskCard(task: task),
                      const SizedBox(height: 10),
                    ],
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '任务加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(tasksProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 任务卡片。
class _TaskCard extends ConsumerWidget {
  const _TaskCard({required this.task});

  final MarketingTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/task/${task.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  task.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              if (task.completed)
                const StatusTag(
                  text: '已完成',
                  color: AppTheme.success,
                  icon: Icons.check_circle_outline,
                )
              else
                StatusTag(
                  text: '进行中',
                  color: AppTheme.warning,
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            task.description,
            style: const TextStyle(
                fontSize: 12, color: AppTheme.textTertiary),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  child: LinearProgressIndicator(
                    value: task.progressRatio,
                    minHeight: 6,
                    backgroundColor: AppTheme.bgMuted,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                        AppTheme.brand),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                task.target > 0
                    ? '${task.progress}/${task.target}'
                    : '${task.progress}',
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (task.rewardPoints > 0) ...[
                const Icon(Icons.stars_outlined,
                    size: 15, color: AppTheme.accent600),
                const SizedBox(width: 3),
                Text(
                  '+${task.rewardPoints} 积分',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.accent600,
                  ),
                ),
              ],
              if (task.rewardCents > 0) ...[
                const SizedBox(width: 12),
                const Icon(Icons.account_balance_wallet_outlined,
                    size: 15, color: AppTheme.brand),
                const SizedBox(width: 3),
                PriceText(cents: task.rewardCents, size: 13),
              ],
              const Spacer(),
              FilledButton(
                onPressed: task.completed
                    ? null
                    : () => _claim(context, ref),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(84, 30),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  textStyle: const TextStyle(fontSize: 12),
                ),
                child: Text(task.completed ? '已领取' : '领取'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _claim(BuildContext context, WidgetRef ref) async {
    final message =
        await ref.read(expansionActionsProvider).claimTask(task.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
