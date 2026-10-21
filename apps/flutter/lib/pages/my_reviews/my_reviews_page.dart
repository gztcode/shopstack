import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 我的评价页：展示当前用户发表过的评价，数据来自
/// `GET /api/v1/users/reviews`。
class MyReviewsPage extends ConsumerWidget {
  const MyReviewsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(myReviewsProvider(1));
    return Scaffold(
      appBar: AppBar(title: const Text('我的评价')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: reviews.when(
              data: (result) {
                final list = result.$1;
                if (list.isEmpty) {
                  return EmptyState(
                    title: '还没有发表过评价',
                    subtitle: '完成订单后即可评价，晒图还能获得积分',
                    icon: Icons.rate_review_outlined,
                    actionText: '去写评价',
                    onAction: () => context.push('/review'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final review = list[index];
                    return AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  review.productTitle.isEmpty
                                      ? '商品评价'
                                      : review.productTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                DateFormatter.date(review.createdAt),
                                style: const TextStyle(
                                    fontSize: 11, color: AppTheme.textTertiary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              for (var i = 1; i <= 5; i++)
                                Icon(
                                  review.rating >= i
                                      ? Icons.star_rounded
                                      : Icons.star_border_rounded,
                                  size: 14,
                                  color: AppTheme.warning,
                                ),
                              const SizedBox(width: 8),
                              StatusTag(
                                text: review.status.label,
                                color: review.status == ReviewStatus.approved
                                    ? AppTheme.success
                                    : AppTheme.warning,
                              ),
                            ],
                          ),
                          if (review.content.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Text(
                              review.content,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.5,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                          if (review.images.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final image in review.images)
                                  AppImage(
                                    url: image,
                                    width: 66,
                                    height: 66,
                                    radius: AppTheme.radiusSm,
                                  ),
                              ],
                            ),
                          ],
                          if (review.adminReply.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppTheme.bgMuted,
                                borderRadius:
                                    BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              child: Text(
                                '商家回复：${review.adminReply}',
                                style: const TextStyle(
                                    fontSize: 12,
                                    height: 1.5,
                                    color: AppTheme.textSecondary),
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              onPressed: () =>
                                  context.push('/product/${review.productId}'),
                              icon: const Icon(Icons.shopping_bag_outlined,
                                  size: 16),
                              label: const Text('再次购买'),
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
                title: '我的评价加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(myReviewsProvider(1)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
