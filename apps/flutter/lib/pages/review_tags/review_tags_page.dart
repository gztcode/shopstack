import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 评价标签页：展示平台评价标签，数据来自 `GET /api/v1/reviews/tags`。
class ReviewTagsPage extends ConsumerWidget {
  const ReviewTagsPage({super.key, this.productId});

  /// 可选的商品 id，为空时展示全站标签。
  final int? productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tags = ref.watch(reviewTagsProvider(productId));
    return Scaffold(
      appBar: AppBar(title: const Text('评价标签')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: tags.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无评价标签',
                    subtitle: '商家还未配置标签，去商品页看看真实评价',
                    icon: Icons.sell_outlined,
                    actionText: '去首页逛逛',
                    onAction: () => context.go('/home'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final tag = list[index];
                    return AppCard(
                      onTap: () => context.push('/review/all'),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppTheme.accent50,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusSm),
                            ),
                            child: Text(
                              tag.name,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accent700,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '${tag.count} 条相关评价',
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right_rounded,
                              size: 18, color: AppTheme.textTertiary),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '标签加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(reviewTagsProvider(productId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
