import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../providers/order_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 订单列表页。
class OrderListPage extends ConsumerStatefulWidget {
  const OrderListPage({super.key});

  @override
  ConsumerState<OrderListPage> createState() => _OrderListPageState();
}

class _OrderListPageState extends ConsumerState<OrderListPage> {
  static final List<({String label, int? status})> _tabs = [
    (label: '全部', status: null),
    (label: '待付款', status: OrderStatus.pendingPayment.code),
    (label: '待发货', status: OrderStatus.paid.code),
    (label: '待收货', status: OrderStatus.shipped.code),
    (label: '退款', status: OrderStatus.refunding.code),
  ];

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('我的订单'),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: _tabs
                .map((tab) => Tab(text: tab.label))
                .toList(),
          ),
        ),
        body: Column(
          children: [
            const DemoBanner(),
            Expanded(
              child: TabBarView(
                children: _tabs
                    .map((tab) => _OrderListView(status: tab.status))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 单个 Tab 的订单列表。
class _OrderListView extends ConsumerWidget {
  const _OrderListView({required this.status});

  final int? status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(orderListProvider(status));
    return orders.when(
      data: (result) {
        if (result.orders.isEmpty) {
          return const EmptyState(
            title: '暂无相关订单',
            subtitle: '去首页挑选心仪商品吧',
            icon: Icons.receipt_long_outlined,
          );
        }
        return RefreshIndicator(
          color: AppTheme.brand,
          onRefresh: () async => ref.invalidate(orderListProvider(status)),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
            itemCount: result.orders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) => _OrderCard(order: result.orders[index]),
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => const EmptyState(
        title: '订单加载失败',
        subtitle: '请下拉重试',
        icon: Icons.wifi_off_rounded,
      ),
    );
  }
}

/// 订单卡片。
class _OrderCard extends ConsumerWidget {
  const _OrderCard({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(orderDetailProvider(order.id));
    final items = detail.asData?.value.items ?? const <OrderItem>[];
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
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
                        style: TextStyle(
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
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.textTertiary),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Text(
                            'x${item.quantity}',
                            style: TextStyle(
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
                        style: TextStyle(
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
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
                const SizedBox(width: 8),
                Text(
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
      buttons.add(_actionButton('取消订单', onTap: () => _cancel(context, ref)));
      buttons.add(
        _actionButton(
          '去支付',
          filled: true,
          onTap: () => context.push('/payment/${order.id}'),
        ),
      );
    } else if (order.status == OrderStatus.shipped) {
      buttons.add(_actionButton('确认收货', onTap: () => _confirm(context, ref)));
    } else if (order.status == OrderStatus.paid) {
      buttons.add(_actionButton('申请退款', onTap: () => _refund(context, ref)));
    } else {
      buttons.add(
        _actionButton('查看详情',
            onTap: () => context.push('/order/${order.id}')),
      );
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
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认收货'),
        content: const Text('请确认已收到商品，确认后订单将完成。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('确认收货'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final error = await ref.read(orderActionsProvider).confirm(order.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? '已确认收货')),
    );
  }

  Future<void> _refund(BuildContext context, WidgetRef ref) async {
    final error = await ref
        .read(orderActionsProvider)
        .refund(order.id, reason: '不想要了', description: '用户发起退款申请');
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error ?? '退款申请已提交')),
    );
  }
}

/// 订单状态对应的颜色。
Color statusColor(OrderStatus status) {
  return switch (status) {
    OrderStatus.pendingPayment => AppTheme.warning600,
    OrderStatus.paid => AppTheme.info600,
    OrderStatus.shipped => AppTheme.brand,
    OrderStatus.refunding => AppTheme.accent600,
    OrderStatus.completed => AppTheme.success600,
    _ => AppTheme.textTertiary,
  };
}
