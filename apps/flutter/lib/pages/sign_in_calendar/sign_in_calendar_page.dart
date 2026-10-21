import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 签到日历页：展示当月签到记录，数据来自
/// `GET /api/v1/marketing/sign-in`。
class SignInCalendarPage extends ConsumerWidget {
  const SignInCalendarPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(signInProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('签到日历')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: info.when(
              data: (data) {
                if (data.calendar.isEmpty) {
                  return const EmptyState(
                    title: '暂无签到记录',
                    subtitle: '完成首次签到后，日历会记录你的坚持',
                    icon: Icons.calendar_month_outlined,
                  );
                }
                final days = data.calendar;
                final signedDays = days.where((d) => d.signed).length;
                final points =
                    days.fold<int>(0, (sum, d) => sum + d.rewardPoints);
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          _Stat(label: '本月签到', value: '$signedDays 天'),
                          _Stat(label: '获得积分', value: '$points'),
                          _Stat(
                              label: '连续签到', value: '${data.continuousDays} 天'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${days.first.date.year} 年 ${days.first.date.month} 月签到记录',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              for (final label in const ['一', '二', '三', '四', '五', '六', '日'])
                                Expanded(
                                  child: Center(
                                    child: Text(
                                      label,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          for (var i = 0; i < days.length; i += 7)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  for (var j = 0; j < 7; j++)
                                    Expanded(
                                      child: _CalendarCell(
                                        day: i + j < days.length
                                            ? days[i + j]
                                            : null,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '签到记录加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(signInProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 统计项。
class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

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
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppTheme.textTertiary),
          ),
        ],
      ),
    );
  }
}

/// 日历格子。
class _CalendarCell extends StatelessWidget {
  const _CalendarCell({required this.day});

  final SignInDay? day;

  @override
  Widget build(BuildContext context) {
    if (day == null) {
      return const SizedBox(height: 46);
    }
    final signed = day!.signed;
    return Padding(
      padding: const EdgeInsets.all(2),
      child: Column(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: signed ? AppTheme.brand50 : AppTheme.bgMuted,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            alignment: Alignment.center,
            child: Text(
              '${day!.date.day}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: signed ? FontWeight.w700 : FontWeight.w400,
                color: signed ? AppTheme.brand : AppTheme.textTertiary,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            signed ? '+${day!.rewardPoints}' : '',
            style: const TextStyle(fontSize: 10, color: AppTheme.accent600),
          ),
        ],
      ),
    );
  }
}
