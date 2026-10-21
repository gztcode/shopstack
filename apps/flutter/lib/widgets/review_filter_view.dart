import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../models/product.dart';
import '../providers/expansion_providers.dart';
import '../utils/formatters.dart';
import '../widgets/app_card.dart';
import '../widgets/app_image.dart';
import '../widgets/demo_banner.dart';
import '../widgets/empty_state.dart';

/// 评价筛选页的共享实现。
///
/// 全部 / 好评 / 中评 / 差评 / 有图 / 已回复 6 个页面共用本组件，
/// 仅筛选维度不同，数据来自 `GET /api/v1/reviews`。
class ReviewFilterView extends ConsumerWidget {
  const ReviewFilterView({
    super.key,
    required this.title,
    required this.filter,
    this.productId,
  });

  /// 页面标题。
  final String title;

  /// 筛选维度：all / good / medium / bad / has_image / has_reply。
  final String filter;

  /// 可选的商品 id。
  final int? productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data =
        ref.watch(reviewFilterProvider((productId: productId, filter: filter)));
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: data.when(
              data: (result) {
                if (result.reviews.isEmpty) {
                  return EmptyState(
                    title: '暂无符合条件的评价',
                    subtitle: '换个筛选条件，或去商品页看看其他买家怎么说',
                    icon: Icons.rate_review_outlined,
                    actionText: '去逛逛',
                    onAction: () => context.go('/home'),
                  );
                }
                return RefreshIndicator(
                  color: AppTheme.brand,
                  onRefresh: () async => ref.invalidate(
                    reviewFilterProvider(
                        (productId: productId, filter: filter)),
                  ),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                    itemCount: result.reviews.length + 1,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _ReviewSummary(summary: result.summary);
                      }
                      return _ReviewCard(review: result.reviews[index - 1]);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '评价加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(
                  reviewFilterProvider(
                      (productId: productId, filter: filter)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 评价汇总条。
class _ReviewSummary extends StatelessWidget {
  const _ReviewSummary({required this.summary});

  final ReviewSummary summary;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    summary.average.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.danger,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    '分',
                    style: TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '共 ${summary.total} 条评价',
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.textTertiary),
              ),
            ],
          ),
          const Spacer(),
          _CountChip(label: '好评', count: summary.good, color: AppTheme.success),
          const SizedBox(width: 8),
          _CountChip(label: '中评', count: summary.medium, color: AppTheme.warning),
          const SizedBox(width: 8),
          _CountChip(label: '差评', count: summary.bad, color: AppTheme.danger),
        ],
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary),
        ),
      ],
    );
  }
}

/// 单条评价卡片。
class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppImage(
                url: review.userAvatar,
                width: 34,
                height: 34,
                radius: 17,
                icon: Icons.person_rounded,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.userNickname.isEmpty
                          ? '匿名买家'
                          : review.userNickname,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        for (var i = 1; i <= 5; i++)
                          Icon(
                            review.rating >= i
                                ? Icons.star_rounded
                                : Icons.star_border_rounded,
                            size: 13,
                            color: AppTheme.warning,
                          ),
                        const SizedBox(width: 8),
                        Text(
                          DateFormatter.date(review.createdAt),
                          style: const TextStyle(
                              fontSize: 11, color: AppTheme.textTertiary),
                        ),
                      ],
                    ),
                  ],
                ),
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
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '商家回复',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.brand,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    review.adminReply,
                    style: const TextStyle(
                        fontSize: 12, height: 1.5, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
