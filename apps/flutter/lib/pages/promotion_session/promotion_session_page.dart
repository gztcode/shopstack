import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 活动场次页：展示活动的每场时间安排，数据来自
/// `GET /api/v1/promotions/{id}/sessions`。
class PromotionSessionPage extends ConsumerWidget {
  const PromotionSessionPage({super.key, this.promotionId = 0});

  /// 活动 id。
  final int promotionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(promotionSessionsProvider(promotionId));
    return Scaffold(
      appBar: AppBar(title: const Text('活动场次')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: sessions.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无场次安排',
                    subtitle: '商家排期后即可查看每场开抢时间',
                    icon: Icons.event_outlined,
                    actionText: '去活动列表看看',
                    onAction: () => context.push('/promotion/list'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final session = list[index];
                    return AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  session.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                              StatusTag(
                                text: session.statusLabel,
                                color: session.status == 1
                                    ? AppTheme.success
                                    : AppTheme.textTertiary,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '开抢时间 ${DateFormatter.fromUnix(session.startTime)} · '
                            '结束 ${DateFormatter.fromUnix(session.endTime)}',
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(Icons.local_offer_outlined,
                                  size: 15, color: AppTheme.accent600),
                              const SizedBox(width: 6),
                              const Text(
                                '本场库存有限，售完即止',
                                style: TextStyle(
                                    fontSize: 12, color: AppTheme.textSecondary),
                              ),
                              const Spacer(),
                              Text(
                                '已抢 ${session.soldCount}/${session.stock}',
                                style: const TextStyle(
                                    fontSize: 12, color: AppTheme.textTertiary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: session.status == 1
                                  ? () => context.push('/promotion/list')
                                  : null,
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(40),
                              ),
                              child: Text(session.status == 1
                                  ? '立即参与本场'
                                  : '本场已结束'),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '场次加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(promotionSessionsProvider(promotionId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
