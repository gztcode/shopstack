import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 拼团详情页：展示拼团活动与成员，数据来自
/// `GET /api/v1/group-buys/{id}`。
class GroupBuyDetailPage extends ConsumerWidget {
  const GroupBuyDetailPage({super.key, this.groupBuyId = 0});

  /// 拼团 id。
  final int groupBuyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final group = ref.watch(groupBuyDetailProvider(groupBuyId));
    return Scaffold(
      appBar: AppBar(title: const Text('拼团详情')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: group.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppImage(
                          url: data.cover,
                          width: double.infinity,
                          height: 180,
                        ),
                        Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  StatusTag(text: data.statusLabel),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      data.title,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                data.description,
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textTertiary),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  PriceText(cents: data.priceCents, size: 22),
                                  const SizedBox(width: 8),
                                  if (data.originalPriceCents > data.priceCents)
                                    Text(
                                      Money.formatYuanWithSymbol(
                                          data.originalPriceCents),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary,
                                        decoration: TextDecoration.lineThrough,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(
                                          AppTheme.radiusSm),
                                      child: LinearProgressIndicator(
                                        value: data.requiredMembers == 0
                                            ? 0
                                            : (data.joinedMembers /
                                                    data.requiredMembers)
                                                .clamp(0.0, 1.0)
                                                .toDouble(),
                                        minHeight: 8,
                                        backgroundColor: AppTheme.bgMuted,
                                        valueColor:
                                            const AlwaysStoppedAnimation<Color>(
                                                AppTheme.brand),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    '${data.joinedMembers}/${data.requiredMembers} 人已参团',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textSecondary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '开团时间 ${DateFormatter.fromUnix(data.startTime)} · '
                                '结束时间 ${DateFormatter.fromUnix(data.endTime)}',
                                style: const TextStyle(
                                    fontSize: 11, color: AppTheme.textTertiary),
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
                          '参团成员',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (data.members.isEmpty)
                          const Text(
                            '还没有人加入，快来开第一团',
                            style: TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          )
                        else
                          for (final member in data.members)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                children: [
                                  AppImage(
                                    url: member.avatar,
                                    width: 32,
                                    height: 32,
                                    radius: 16,
                                    icon: Icons.person_rounded,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      member.nickname.isEmpty
                                          ? '参团用户'
                                          : member.nickname,
                                      style: const TextStyle(
                                          fontSize: 13,
                                          color: AppTheme.textPrimary),
                                    ),
                                  ),
                                  if (member.isLeader)
                                    const StatusTag(
                                        text: '团长', color: AppTheme.accent600)
                                  else
                                    const Text(
                                      '已参团',
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textTertiary),
                                    ),
                                ],
                              ),
                            ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: data.status != 0
                        ? null
                        : () => context.push('/group-buy/$groupBuyId/join'),
                    child: Text(data.status != 0 ? '拼团已结束' : '立即参团'),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '拼团详情加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(groupBuyDetailProvider(groupBuyId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
