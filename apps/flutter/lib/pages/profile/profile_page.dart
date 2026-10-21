import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../models/user.dart';
import '../../utils/enums.dart';
import '../../providers/auth_provider.dart';
import '../../providers/user_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/skeleton.dart';

/// 我的页面。
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final counts = ref.watch(orderCountProvider);
    final unread = ref.watch(unreadCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
        actions: [
          IconButton(
            tooltip: '设置',
            onPressed: () => context.push(AppRoutes.settings),
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.brand,
              onRefresh: () async {
                ref.invalidate(profileProvider);
                ref.invalidate(orderCountProvider);
                ref.invalidate(notificationsProvider);
                await ref.read(authProvider.notifier).refreshProfile();
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                children: [
                  _UserCard(profile: profile),
                  const SizedBox(height: 12),
                  _OrderEntryCard(counts: counts),
                  const SizedBox(height: 12),
                  _FunctionCard(
                    unread: unread,
                    onLogout: () => _confirmLogout(context, ref),
                  ),
                  const SizedBox(height: 12),
                  const _ServiceCard(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('退出后需要重新登录才能下单，确定退出吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('退出'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authProvider.notifier).logout();
  }
}

/// 用户信息卡。
class _UserCard extends ConsumerWidget {
  const _UserCard({required this.profile});

  final AsyncValue<User> profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.brand, AppTheme.brandDark],
        ),
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowBrand,
      ),
      child: profile.when(
        data: (user) {
          final points = user.points;
          final balance = user.balanceCents;
          return Column(
            children: [
              Row(
                children: [
                  AppImage(
                    url: user.avatar,
                    width: 54,
                    height: 54,
                    radius: 27,
                    icon: Icons.person_rounded,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.nickname.isEmpty ? user.username : user.nickname,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID ${user.id} · ${user.phone}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _metric(context, '积分', '$points'),
                  _metric(context, '余额', Money.formatYuan(balance)),
                  _metric(
                    context,
                    '优惠券',
                    '${ref.watch(userCouponsProvider).asData?.value.where((c) => c.status == UserCouponStatus.unused).length ?? 0}',
                  ),
                ],
              ),
            ],
          );
        },
        loading: () => const Column(
          children: [
            SkeletonBox(height: 54, radius: 27),
            SizedBox(height: 16),
            SkeletonBox(height: 30, width: 200),
          ],
        ),
        error: (error, stack) => const Text(
          '用户信息加载失败',
          style: TextStyle(color: Colors.white, fontSize: 13),
        ),
      ),
    );
  }

  Widget _metric(BuildContext context, String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

/// 订单状态入口。
class _OrderEntryCard extends ConsumerWidget {
  const _OrderEntryCard({required this.counts});

  final AsyncValue<OrderCount> counts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = counts.asData?.value;
    final pendingPayment = count?.pendingPayment ?? 0;
    final pendingShipment = count?.pendingShipment ?? 0;
    final pendingReceipt = count?.pendingReceipt ?? 0;
    final refunding = count?.refunding ?? 0;

    final entries = <({String label, IconData icon, int badge, String route})>[
      (
        label: '待付款',
        icon: Icons.account_balance_wallet_outlined,
        badge: pendingPayment,
        route: AppRoutes.orderPay
      ),
      (
        label: '待发货',
        icon: Icons.inventory_2_outlined,
        badge: pendingShipment,
        route: AppRoutes.orderShip
      ),
      (
        label: '待收货',
        icon: Icons.local_shipping_outlined,
        badge: pendingReceipt,
        route: AppRoutes.orderReceive
      ),
      (
        label: '退款/售后',
        icon: Icons.assignment_return_outlined,
        badge: refunding,
        route: AppRoutes.orderRefunding
      ),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        children: [
          Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: Text(
                  '我的订单',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => context.push(AppRoutes.orders),
                child: const Row(
                  children: [
                    Text(
                      '全部订单',
                      style: TextStyle(
                          fontSize: 12, color: AppTheme.textTertiary),
                    ),
                    Icon(Icons.chevron_right_rounded,
                        size: 16, color: AppTheme.textTertiary),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              for (final entry in entries)
                Expanded(
                  child: _OrderEntry(
                    label: entry.label,
                    icon: entry.icon,
                    badge: entry.badge,
                    onTap: () => context.push(entry.route),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OrderEntry extends StatelessWidget {
  const _OrderEntry({
    required this.label,
    required this.icon,
    required this.badge,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Badge(
            isLabelVisible: badge > 0,
            label: Text('$badge'),
            child: Icon(icon, size: 24, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
                fontSize: 12, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// 功能列表。
class _FunctionCard extends StatelessWidget {
  const _FunctionCard({required this.unread, required this.onLogout});

  final int unread;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final items = <({String label, IconData icon, String route, int badge})>[
      (
        label: '收货地址',
        icon: Icons.location_on_outlined,
        route: AppRoutes.addresses,
        badge: 0
      ),
      (
        label: '我的收藏',
        icon: Icons.favorite_border_rounded,
        route: AppRoutes.favorites,
        badge: 0
      ),
      (
        label: '我的优惠券',
        icon: Icons.local_offer_outlined,
        route: AppRoutes.coupons,
        badge: 0
      ),
      (
        label: '消息通知',
        icon: Icons.notifications_none_rounded,
        route: AppRoutes.notifications,
        badge: unread
      ),
      (
        label: '设置',
        icon: Icons.settings_outlined,
        route: AppRoutes.settings,
        badge: 0
      ),
      (
        label: '积分明细',
        icon: Icons.stars_outlined,
        route: AppRoutes.points,
        badge: 0
      ),
      (
        label: '发票管理',
        icon: Icons.receipt_long_outlined,
        route: AppRoutes.invoices,
        badge: 0
      ),
      (
        label: '物流跟踪',
        icon: Icons.local_shipping_outlined,
        route: AppRoutes.logistics,
        badge: 0
      ),
      (
        label: '领券中心',
        icon: Icons.local_offer_outlined,
        route: AppRoutes.couponCenter,
        badge: 0
      ),
      (
        label: '发表评价',
        icon: Icons.rate_review_outlined,
        route: AppRoutes.review,
        badge: 0
      ),
      (
        label: '售后申请',
        icon: Icons.assignment_return_outlined,
        route: AppRoutes.refund,
        badge: 0
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            _FunctionRow(
              label: items[i].label,
              icon: items[i].icon,
              badge: items[i].badge,
              onTap: () => context.push(items[i].route),
            ),
            if (i != items.length - 1)
              const Padding(
                padding: EdgeInsets.only(left: 52),
                child: Divider(height: 1),
              ),
          ],
          const Divider(height: 1),
          InkWell(
            onTap: onLogout,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: Text(
                  '退出登录',
                  style: TextStyle(fontSize: 14, color: AppTheme.danger600),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FunctionRow extends StatelessWidget {
  const _FunctionRow({
    required this.label,
    required this.icon,
    required this.badge,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppTheme.textSecondary),
            const SizedBox(width: 12),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 14, color: AppTheme.textPrimary),
            ),
            const Spacer(),
            if (badge > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.danger,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(fontSize: 10, color: Colors.white),
                ),
              ),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: AppTheme.textTertiary),
          ],
        ),
      ),
    );
  }
}

/// 更多服务入口：阶段 3 扩量页面的统一入口。
class _ServiceCard extends StatelessWidget {
  const _ServiceCard();

  static final List<({String label, IconData icon, String route})> _items =
      <({String label, IconData icon, String route})>[
    (label: '全部频道', icon: Icons.explore_outlined, route: AppRoutes.channelList),
    (label: '活动列表', icon: Icons.local_offer_outlined, route: AppRoutes.promotionList),
    (label: '签到中心', icon: Icons.card_giftcard_outlined, route: AppRoutes.signIn),
    (label: '任务中心', icon: Icons.assignment_outlined, route: AppRoutes.taskCenter),
    (label: '我的拼团', icon: Icons.groups_outlined, route: AppRoutes.myGroupBuy),
    (label: '我的评价', icon: Icons.rate_review_outlined, route: AppRoutes.myReviews),
    (label: '售后列表', icon: Icons.assignment_return_outlined, route: AppRoutes.afterSaleList),
    (label: '物流轨迹', icon: Icons.local_shipping_outlined, route: AppRoutes.logisticsTrace),
    (label: '会员等级', icon: Icons.workspace_premium_outlined, route: AppRoutes.userLevel),
    (label: '成长值', icon: Icons.trending_up_rounded, route: AppRoutes.growthLogs),
    (label: '发票抬头', icon: Icons.receipt_long_outlined, route: AppRoutes.invoiceTemplates),
    (label: '通知设置', icon: Icons.notifications_none_rounded, route: AppRoutes.notificationSettings),
    (label: '账号安全', icon: Icons.verified_user_outlined, route: AppRoutes.accountSecurity),
    (label: '实名认证', icon: Icons.badge_outlined, route: AppRoutes.realname),
    (label: '意见反馈', icon: Icons.chat_bubble_outline_rounded, route: AppRoutes.feedback),
    (label: '帮助中心', icon: Icons.help_outline_rounded, route: AppRoutes.helpCenter),
    (label: '收货地区', icon: Icons.map_outlined, route: AppRoutes.regions),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '更多服务',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate:
                const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 14,
              crossAxisSpacing: 8,
              childAspectRatio: 0.86,
            ),
            itemCount: _items.length,
            itemBuilder: (context, index) {
              final item = _items[index];
              return GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => context.push(item.route),
                child: Column(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppTheme.brand50,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      alignment: Alignment.center,
                      child: Icon(item.icon, size: 20, color: AppTheme.brand),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
