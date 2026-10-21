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

/// 我的拼团页：展示我参与过的拼团，数据来自
/// `GET /api/v1/users/group-buys`。
class MyGroupBuyPage extends ConsumerWidget {
  const MyGroupBuyPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groups = ref.watch(myGroupBuysProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('我的拼团')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: groups.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '还没有参与过拼团',
                    subtitle: '参加拼团可以享受更低的拼团价',
                    icon: Icons.groups_outlined,
                    actionText: '去拼团列表看看',
                    onAction: () => context.push('/group-buy/list'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _MyGroupCard(group: list[index]),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '拼团记录加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(myGroupBuysProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 我的拼团卡片。
class _MyGroupCard extends StatelessWidget {
  const _MyGroupCard({required this.group});

  final GroupBuy group;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/group-buy/${group.id}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppImage(
            url: group.cover,
            width: 68,
            height: 68,
            radius: AppTheme.radiusMd,
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
                        group.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    StatusTag(
                      text: group.statusLabel,
                      color: group.status == 1
                          ? AppTheme.success
                          : AppTheme.brand,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                PriceText(cents: group.priceCents, size: 16),
                const SizedBox(height: 8),
                Text(
                  '${group.joinedMembers}/${group.requiredMembers} 人 · '
                  '结束 ${DateFormatter.fromUnix(group.endTime)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
