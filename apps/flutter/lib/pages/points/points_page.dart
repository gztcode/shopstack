import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/points.dart';
import '../../providers/points_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 积分明细页。
class PointsPage extends ConsumerWidget {
  const PointsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final points = ref.watch(pointsLogsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('积分明细')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: points.when(
              data: (result) => RefreshIndicator(
                color: AppTheme.brand,
                onRefresh: () async => ref.invalidate(pointsLogsProvider),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                  children: [
                    _PointsSummary(points: result.currentPoints),
                    const SizedBox(height: 12),
                    if (result.logs.isEmpty)
                      const EmptyState(
                        title: '暂无积分变动记录',
                        subtitle: '签到、下单与评价都可以获得积分',
                        icon: Icons.stars_outlined,
                      )
                    else
                      for (final log in result.logs) _PointsTile(log: log),
                  ],
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '积分明细加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(pointsLogsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 积分概览卡。
class _PointsSummary extends StatelessWidget {
  const _PointsSummary({required this.points});

  final int points;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.accent500, AppTheme.accent700],
        ),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowLg,
      ),
      child: Row(
        children: [
          const Icon(Icons.stars_rounded, size: 34, color: Colors.white),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$points',
                style: const TextStyle(
                  fontSize: 30,
                  height: 1.1,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '当前可用积分',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// 积分变动条目。
class _PointsTile extends StatelessWidget {
  const _PointsTile({required this.log});

  final PointsLog log;

  @override
  Widget build(BuildContext context) {
    final increase = log.isIncrease;
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: increase
                  ? AppTheme.success50
                  : AppTheme.danger50,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Icon(
              increase ? Icons.add_rounded : Icons.remove_rounded,
              size: 20,
              color: increase ? AppTheme.success600 : AppTheme.danger600,
            ),
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
                        log.title.isEmpty ? log.bizTypeLabel : log.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    Text(
                      '${increase ? '+' : ''}${log.change}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: increase
                            ? AppTheme.success600
                            : AppTheme.danger600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    StatusTag(text: log.bizTypeLabel),
                    const SizedBox(width: 8),
                    Text(
                      '余额 ${log.balance}',
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.textTertiary),
                    ),
                    const Spacer(),
                    Text(
                      DateFormatter.dateTime(log.createdAt),
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textTertiary),
                    ),
                  ],
                ),
                if (log.bizId.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    '关联单号 ${log.bizId}',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
