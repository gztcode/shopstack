import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/marketing.dart';
import '../../providers/coupon_center_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 领券中心页。
class CouponCenterPage extends ConsumerWidget {
  const CouponCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(couponCenterProvider);
    final notifier = ref.read(couponCenterProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('领券中心'),
        actions: [
          IconButton(
            tooltip: '刷新',
            onPressed: notifier.load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.brand,
              onRefresh: notifier.load,
              child: state.coupons.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 80),
                        EmptyState(
                          title: '暂无可领取的优惠券',
                          subtitle: '稍后再来看看吧',
                          icon: Icons.local_offer_outlined,
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                      itemCount: state.coupons.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final coupon = state.coupons[index];
                        return _CenterCouponTile(
                          coupon: coupon,
                          received: state.isReceived(coupon.id),
                          loading: state.isLoading(coupon.id),
                          onReceive: () => _receive(context, notifier, coupon),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _receive(
    BuildContext context,
    CouponCenterNotifier notifier,
    Coupon coupon,
  ) async {
    final error = await notifier.receive(coupon.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? '已领取「${coupon.name}」，可在我的优惠券查看')),
    );
  }
}

/// 领券中心券卡片。
class _CenterCouponTile extends StatelessWidget {
  const _CenterCouponTile({
    required this.coupon,
    required this.received,
    required this.loading,
    required this.onReceive,
  });

  final Coupon coupon;
  final bool received;
  final bool loading;
  final VoidCallback onReceive;

  @override
  Widget build(BuildContext context) {
    final remain = coupon.totalQuantity - coupon.receivedQuantity;
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: [
          Container(
            width: 108,
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              color: received ? AppTheme.bgMuted : AppTheme.brand50,
              borderRadius: const BorderRadius.horizontal(
                left: Radius.circular(AppTheme.radiusLg),
              ),
            ),
            child: Column(
              children: [
                Text(
                  _faceValue(coupon),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: received ? AppTheme.textTertiary : AppTheme.brand,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  coupon.minAmountCents > 0
                      ? '满 ${Money.formatYuan(coupon.minAmountCents)} 可用'
                      : '无门槛',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    coupon.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    coupon.code,
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '剩余 ${remain > 0 ? remain : 0} 张 · 有效期至 ${DateFormatter.fromUnix(coupon.endTime)}',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 34,
                    child: received
                        ? OutlinedButton(
                            onPressed: null,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(96, 34),
                              textStyle: const TextStyle(fontSize: 13),
                            ),
                            child: const Text('已领取'),
                          )
                        : FilledButton(
                            onPressed: loading ? null : onReceive,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(96, 34),
                              textStyle: const TextStyle(fontSize: 13),
                            ),
                            child: loading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          Colors.white),
                                    ),
                                  )
                                : const Text('立即领取'),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _faceValue(Coupon coupon) {
    switch (coupon.type) {
      case CouponType.fixed:
        return '¥${Money.formatYuan(coupon.faceValueCents)}';
      case CouponType.percent:
        return '${(coupon.percent / 10).toStringAsFixed(1)}折';
      case CouponType.shipping:
        return '免运费';
      case CouponType.unspecified:
        return '优惠券';
    }
  }
}
