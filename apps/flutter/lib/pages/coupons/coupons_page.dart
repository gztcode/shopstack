import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/marketing.dart';
import '../../providers/user_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 我的优惠券页。
class CouponsPage extends ConsumerStatefulWidget {
  const CouponsPage({super.key});

  @override
  ConsumerState<CouponsPage> createState() => _CouponsPageState();
}

class _CouponsPageState extends ConsumerState<CouponsPage> {
  UserCouponStatus _status = UserCouponStatus.unused;

  @override
  Widget build(BuildContext context) {
    final coupons = ref.watch(userCouponsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('我的优惠券')),
      body: Column(
        children: [
          const DemoBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: Row(
              children: [
                for (final status in const [
                  UserCouponStatus.unused,
                  UserCouponStatus.used,
                  UserCouponStatus.expired,
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(status.label),
                      selected: _status == status,
                      onSelected: (_) => setState(() => _status = status),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: coupons.when(
              data: (list) {
                final items =
                    list.where((c) => c.status == _status).toList();
                if (items.isEmpty) {
                  return const EmptyState(
                    title: '暂无相关优惠券',
                    subtitle: '去首页参与活动领取吧',
                    icon: Icons.local_offer_outlined,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                  itemCount: items.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _CouponTile(coupon: items[index]),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const EmptyState(
                title: '优惠券加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CouponTile extends StatelessWidget {
  const _CouponTile({required this.coupon});

  final UserCoupon coupon;

  @override
  Widget build(BuildContext context) {
    final used = coupon.status != UserCouponStatus.unused;
    return Opacity(
      opacity: used ? 0.6 : 1,
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Row(
          children: [
            Container(
              width: 104,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(AppTheme.radiusLg),
                ),
              ),
              child: Column(
                children: [
                  Text(
                    coupon.discountText,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.brand,
                    ),
                  ),
                  const SizedBox(height: 6),
                  StatusTag(
                    text: coupon.status.label,
                    color: used ? AppTheme.textTertiary : AppTheme.brand,
                  ),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      coupon.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      coupon.minAmountCents > 0
                          ? '满 ${Money.formatYuan(coupon.minAmountCents)} 可用'
                          : '无使用门槛',
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      coupon.code,
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textTertiary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '有效期至 ${DateFormatter.date(coupon.receivedAt)}',
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textTertiary),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
