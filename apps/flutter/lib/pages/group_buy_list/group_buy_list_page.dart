import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 拼团列表页：展示正在进行的拼团活动，数据来自 `GET /api/v1/group-buys`。
class GroupBuyListPage extends ConsumerWidget {
  const GroupBuyListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groups = ref.watch(groupBuysProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('拼团列表')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: groups.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无拼团活动',
                    subtitle: '商家发起拼团后即可参团成团价',
                    icon: Icons.groups_outlined,
                    actionText: '去首页逛逛',
                    onAction: () => context.go('/home'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _GroupBuyCard(group: list[index]),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '拼团加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(groupBuysProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 拼团卡片。
class _GroupBuyCard extends StatelessWidget {
  const _GroupBuyCard({required this.group});

  final GroupBuy group;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => context.push('/group-buy/${group.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
            child: Row(
              children: [
                StatusTag(text: group.statusLabel),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    group.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppImage(
                  url: group.cover,
                  width: 78,
                  height: 78,
                  radius: AppTheme.radiusMd,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        group.productTitle.isEmpty
                            ? group.title
                            : group.productTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        group.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          PriceText(cents: group.priceCents, size: 18),
                          const SizedBox(width: 8),
                          if (group.originalPriceCents > group.priceCents)
                            Text(
                              Money.formatYuanWithSymbol(
                                  group.originalPriceCents),
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
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusSm),
                              child: LinearProgressIndicator(
                                value: group.requiredMembers == 0
                                    ? 0
                                    : (group.joinedMembers /
                                            group.requiredMembers)
                                        .clamp(0.0, 1.0)
                                        .toDouble(),
                                minHeight: 6,
                                backgroundColor: AppTheme.bgMuted,
                                valueColor:
                                    const AlwaysStoppedAnimation<Color>(
                                        AppTheme.brand),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '${group.joinedMembers}/${group.requiredMembers} 人',
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '结束时间 ${DateFormatter.fromUnix(group.endTime)}',
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
