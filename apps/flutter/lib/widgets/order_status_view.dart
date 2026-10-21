import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../models/order.dart';
import '../providers/order_provider.dart';
import '../utils/enums.dart';
import '../utils/formatters.dart';
import '../widgets/app_card.dart';
import '../widgets/app_image.dart';
import '../widgets/demo_banner.dart';
import '../widgets/empty_state.dart';
import '../widgets/price_text.dart';

/// 订单状态页的共享实现。
///
/// 全部 / 待付款 / 待发货 / 待收货 / 已完成 / 已取消 / 退款中 7 个页面共用
/// 本组件，仅订单状态不同，数据来自 `GET /api/v1/orders`。
class OrderStatusView extends ConsumerWidget {
  const OrderStatusView({
    super.key,
    required this.title,
    this.status,
    this.emptyTitle = '暂无相关订单',
    this.emptySubtitle = '去首页挑选心仪商品吧',
  });

  /// 页面标题。
  final String title;

  /// 订单状态；为空表示全部订单。
  final int? status;

  /// 空状态标题。
  final String emptyTitle;

  /// 空状态副标题。
  final String emptySubtitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(orderListProvider(status));
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: result.when(
              data: (data) {
                if (data.orders.isEmpty) {
                  return EmptyState(
                    title: emptyTitle,
                    subtitle: emptySubtitle,
                    icon: Icons.receipt_long_outlined,
                    actionText: '去首页看看',
                    onAction: () => context.go('/home'),
                  );
                }
                return RefreshIndicator(
                  color: AppTheme.brand,
                  onRefresh: () async => ref.invalidate(orderListProvider(status)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                    itemCount: data.orders.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        _OrderStatusCard(order: data.orders[index]),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(orderListProvider(status)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 订单卡片（含状态标签、商品条目与操作按钮）。
class _OrderStatusCard extends ConsumerWidget {
  const _OrderStatusCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(orderDetailProvider(order.id));
    final items = detail.asData?.value.items ?? const <OrderItem>[];
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          InkWell(
            onTap: () => context.push('/order/${order.id}'),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      Text(
                        DateFormatter.dateTime(order.createdAt),
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.textTertiary),
                      ),
                      const Spacer(),
                      StatusTag(
                        text: order.status.label,
                        color: statusColor(order.status),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  for (final item in items.take(3))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          AppImage(
                            url: item.image,
                            width: 58,
                            height: 58,
                            radius: AppTheme.radiusMd,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productTitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                if (item.specText.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    item.specText,
                                    style: const TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.textTertiary),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Text(
                            'x${item.quantity}',
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  if (items.length > 3)
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        '等 ${items.length} 件商品',
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
              ),
            ),
            child: Row(
              children: [
                Text(
                  '共 ${order.totalQuantity} 件',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textTertiary),
                ),
                const SizedBox(width: 8),
                const Text(
                  '实付',
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
                const SizedBox(width: 4),
                PriceText(cents: order.payableCents, size: 16),
                const Spacer(),
                ..._actions(context, ref),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _actions(BuildContext context, WidgetRef ref) {
    final buttons = <Widget>[];
    if (order.status == OrderStatus.pendingPayment) {
      buttons.add(_actionButton(
        '取消订单',
        onTap: () => _cancel(context, ref),
      ));
      buttons.add(_actionButton(
        '去支付',
        filled: true,
        onTap: () => context.push('/payment/${order.id}'),
      ));
    } else if (order.status == OrderStatus.shipped) {
      buttons.add(_actionButton(
        '确认收货',
        onTap: () => _confirm(context, ref),
      ));
    } else if (order.status == OrderStatus.paid) {
      buttons.add(_actionButton(
        '申请退款',
        onTap: () => context.push('/refund'),
      ));
    } else {
      buttons.add(_actionButton(
        '查看详情',
        onTap: () => context.push('/order/${order.id}'),
      ));
    }
    return buttons;
  }

  Widget _actionButton(
    String text, {
    required VoidCallback onTap,
    bool filled = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: filled
          ? FilledButton(
              onPressed: onTap,
              style: FilledButton.styleFrom(
                minimumSize: const Size(78, 30),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                textStyle: const TextStyle(fontSize: 12),
              ),
              child: Text(text),
            )
          : OutlinedButton(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(78, 30),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                textStyle: const TextStyle(fontSize: 12),
              ),
              child: Text(text),
            ),
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final error = await ref.read(orderActionsProvider).cancel(order.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? '订单已取消')),
    );
  }

  Future<void> _confirm(BuildContext context, WidgetRef ref) async {
    final error = await ref.read(orderActionsProvider).confirm(order.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? '已确认收货')),
    );
  }
}

/// 订单状态对应的主色。
Color statusColor(OrderStatus status) {
  switch (status) {
    case OrderStatus.pendingPayment:
      return AppTheme.warning;
    case OrderStatus.paid:
      return AppTheme.brand;
    case OrderStatus.shipped:
      return AppTheme.info;
    case OrderStatus.completed:
      return AppTheme.success;
    case OrderStatus.cancelled:
    case OrderStatus.closed:
      return AppTheme.textTertiary;
    case OrderStatus.refunding:
    case OrderStatus.refunded:
      return AppTheme.danger;
    case OrderStatus.unspecified:
      return AppTheme.textTertiary;
  }
}
