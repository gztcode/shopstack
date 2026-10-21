import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 成长值明细页：展示成长值变动流水，数据来自
/// `GET /api/v1/users/growth-logs`。
class GrowthLogsPage extends ConsumerWidget {
  const GrowthLogsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logs = ref.watch(growthLogsProvider(1));
    return Scaffold(
      appBar: AppBar(title: const Text('成长值明细')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: logs.when(
              data: (result) {
                if (result.items.isEmpty) {
                  return const EmptyState(
                    title: '暂无成长值记录',
                    subtitle: '下单、评价、签到都会累积成长值',
                    icon: Icons.trending_up_rounded,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: result.items.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _GrowthLogCard(log: result.items[index]),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '成长值明细加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(growthLogsProvider(1)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 成长值流水卡片。
class _GrowthLogCard extends StatelessWidget {
  const _GrowthLogCard({required this.log});

  final GrowthLog log;

  @override
  Widget build(BuildContext context) {
    final increase = log.amount >= 0;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: increase ? AppTheme.accent50 : AppTheme.bgMuted,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            alignment: Alignment.center,
            child: Icon(
              increase ? Icons.add_rounded : Icons.remove_rounded,
              size: 20,
              color: increase ? AppTheme.accent600 : AppTheme.textTertiary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.remark.isEmpty ? log.source : log.remark,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${DateFormatter.dateTime(log.createdAt)} · 累计 ${log.balance}',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
              ],
            ),
          ),
          Text(
            '${increase ? '+' : ''}${log.amount}',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: increase ? AppTheme.accent600 : AppTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
