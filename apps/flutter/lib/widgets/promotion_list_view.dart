import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../models/marketing.dart';
import '../providers/expansion_providers.dart';
import '../utils/formatters.dart';
import '../widgets/app_card.dart';
import '../widgets/demo_banner.dart';
import '../widgets/empty_state.dart';
import '../widgets/price_text.dart';

/// 活动列表页的共享实现。
///
/// 活动列表 / 限时秒杀 / 预售专区共用本组件，仅活动类型不同，
/// 数据来自 `GET /api/v1/promotions`。
class PromotionListView extends ConsumerWidget {
  const PromotionListView({
    super.key,
    required this.title,
    required this.promotionType,
    this.emptyHint = '商家开启活动后会在这里展示',
  });

  /// 页面标题。
  final String title;

  /// 活动类型：all / coupon / discount / flash / presale / groupbuy / seckill。
  final String promotionType;

  /// 空状态副标题。
  final String emptyHint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final promotions = ref.watch(promotionTypeProvider(promotionType));
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: promotions.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无进行中的活动',
                    subtitle: emptyHint,
                    icon: Icons.local_offer_outlined,
                    actionText: '去首页逛逛',
                    onAction: () => context.go('/home'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final promotion = list[index];
                    return _PromotionCard(promotion: promotion);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '活动加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(promotionTypeProvider(promotionType)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 活动卡片。
class _PromotionCard extends StatelessWidget {
  const _PromotionCard({required this.promotion});

  final Promotion promotion;

  @override
  Widget build(BuildContext context) {
    final start = DateFormatter.fromUnix(promotion.startTime);
    final end = DateFormatter.fromUnix(promotion.endTime);
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/promotion/${promotion.id}/sessions'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusTag(text: promotion.typeLabel),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  promotion.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              Text(
                '已参与 ${promotion.soldCount}',
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.textTertiary),
              ),
            ],
          ),
          if (promotion.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              promotion.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  fontSize: 12, height: 1.5, color: AppTheme.textSecondary),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              if (promotion.minAmountCents > 0) ...[
                const Text(
                  '满',
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
                const SizedBox(width: 2),
                PriceText(
                  cents: promotion.minAmountCents,
                  size: 13,
                  color: AppTheme.textSecondary,
                  bold: false,
                ),
                const SizedBox(width: 2),
                const Text(
                  '可用',
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
                const SizedBox(width: 12),
              ],
              if (promotion.discountCents > 0) ...[
                const Text(
                  '立减',
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
                PriceText(cents: promotion.discountCents, size: 16),
                const SizedBox(width: 12),
              ],
              if (promotion.percent < 100)
                StatusTag(
                  text: '${(promotion.percent / 10).toStringAsFixed(1)} 折',
                  color: AppTheme.accent600,
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.schedule_rounded,
                  size: 13, color: AppTheme.textTertiary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '活动时间 $start 至 $end',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  size: 16, color: AppTheme.textTertiary),
            ],
          ),
        ],
      ),
    );
  }
}
