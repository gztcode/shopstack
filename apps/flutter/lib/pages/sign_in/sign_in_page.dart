import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';

/// 签到中心页：每日签到领积分，数据来自 `POST /api/v1/marketing/sign-in`。
class SignInPage extends ConsumerWidget {
  const SignInPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final info = ref.watch(signInProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('签到中心'),
        actions: [
          TextButton(
            onPressed: () => context.push('/sign-in/calendar'),
            child: const Text('签到日历'),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: info.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  _SignInHeader(data: data),
                  const SizedBox(height: 12),
                  AppCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '本周签到',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            for (final day in data.calendar.skip(24))
                              Expanded(
                                child: _DayCell(
                                  label: '${day.date.day}',
                                  signed: day.signed,
                                  today: day.date.day == DateTime.now().day,
                                ),
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
                          '签到规则',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '1. 每天可签到一次，签到后立即到账积分；\n'
                          '2. 连续签到奖励递增，断签后重新计算连续天数；\n'
                          '3. 签到所得积分可用于抵扣订单金额；\n'
                          '4. 累计签到天数可在「成长值明细」中查看。',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.8,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off_rounded,
                        size: 40, color: AppTheme.textTertiary),
                    const SizedBox(height: 12),
                    const Text(
                      '签到信息加载失败',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => ref.invalidate(signInProvider),
                      child: const Text('重新加载'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 签到头部（连续天数 + 签到按钮）。
class _SignInHeader extends ConsumerWidget {
  const _SignInHeader({required this.data});

  final SignInInfo data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.brand, AppTheme.brandDark],
        ),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowBrand,
      ),
      child: Column(
        children: [
          Row(
            children: [
              _Metric(label: '连续签到', value: '${data.continuousDays} 天'),
              _Metric(label: '累计签到', value: '${data.totalDays} 天'),
              _Metric(label: '今日积分', value: '${data.rewardPoints}'),
            ],
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: data.signedToday
                  ? null
                  : () => _signIn(context, ref),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.brand,
                disabledBackgroundColor: Colors.white.withValues(alpha: 0.7),
                disabledForegroundColor: AppTheme.brand,
              ),
              icon: Icon(
                data.signedToday
                    ? Icons.check_circle_rounded
                    : Icons.card_giftcard_rounded,
                size: 18,
              ),
              label: Text(data.signedToday ? '今日已签到' : '立即签到'),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            data.signedToday
                ? '明天继续签到，奖励更多积分'
                : '签到即得积分，连续签到奖励递增',
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _signIn(BuildContext context, WidgetRef ref) async {
    final message = await ref.read(expansionActionsProvider).signIn();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

/// 单日签到格子。
class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.label,
    required this.signed,
    required this.today,
  });

  final String label;
  final bool signed;
  final bool today;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary),
        ),
        const SizedBox(height: 6),
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: signed ? AppTheme.brand : AppTheme.bgMuted,
            shape: BoxShape.circle,
            border: today
                ? Border.all(color: AppTheme.brand, width: 1.4)
                : null,
          ),
          alignment: Alignment.center,
          child: signed
              ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
              : Text(
                  label,
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
        ),
      ],
    );
  }
}
