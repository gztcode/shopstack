import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 会员等级页：展示当前等级与全部等级权益，数据来自
/// `GET /api/v1/users/level` 与 `GET /api/v1/marketing/levels`。
class UserLevelPage extends ConsumerWidget {
  const UserLevelPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final level = ref.watch(userLevelProvider);
    final levels = ref.watch(userLevelsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('会员等级')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: level.when(
              data: (data) {
                final all = levels.asData?.value ?? data.levels;
                final current = _findLevel(all, data.level);
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppTheme.accent500, AppTheme.accent700],
                        ),
                        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                        boxShadow: AppTheme.shadowBrand,
                      ),
                      child: Column(
                        children: [
                          Text(
                            data.levelName.isEmpty ? '普通会员' : data.levelName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '当前成长值 ${data.growth}',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            data.nextLevelName.isEmpty
                                ? '已是最高等级'
                                : '再获得 ${data.growthToNext} 成长值升级为${data.nextLevelName}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withValues(alpha: 0.85),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              _Metric(
                                label: '会员折扣',
                                value:
                                    '${(data.discountPercent / 10).toStringAsFixed(1)} 折',
                              ),
                              _Metric(label: '当前等级', value: 'Lv${data.level}'),
                              _Metric(
                                label: '专属权益',
                                value: '${current?.benefits.length ?? 0} 项',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '我的权益',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          if (current == null || current.benefits.isEmpty)
                            const Text(
                              '当前等级暂未配置专属权益',
                              style: TextStyle(
                                  fontSize: 12, color: AppTheme.textTertiary),
                            )
                          else
                            for (final benefit in current.benefits)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Row(
                                  children: [
                                    const Icon(Icons.check_circle_rounded,
                                        size: 15, color: AppTheme.success),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        benefit,
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppTheme.textSecondary),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '等级体系',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (all.isEmpty)
                            const Text(
                              '等级列表加载中',
                              style: TextStyle(
                                  fontSize: 12, color: AppTheme.textTertiary),
                            )
                          else
                            for (final item in all)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 76,
                                      child: Text(
                                        item.name,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        '${item.minGrowth} - ${item.maxGrowth} 成长值',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.textTertiary),
                                      ),
                                    ),
                                    StatusTag(
                                      text:
                                          '${(item.discountPercent / 10).toStringAsFixed(1)} 折',
                                      color: item.level == data.level
                                          ? AppTheme.brand
                                          : AppTheme.textTertiary,
                                    ),
                                  ],
                                ),
                              ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton(
                      onPressed: () => context.push('/user/growth-logs'),
                      child: const Text('查看成长值明细'),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '会员信息加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(userLevelProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 在等级列表中定位当前等级。
  UserLevel? _findLevel(List<UserLevel> levels, int level) {
    for (final item in levels) {
      if (item.level == level) return item;
    }
    return levels.isEmpty ? null : levels.first;
  }
}

/// 头部指标。
class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }
}
