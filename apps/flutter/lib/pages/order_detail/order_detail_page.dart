import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../providers/order_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 订单详情页。
class OrderDetailPage extends ConsumerWidget {
  const OrderDetailPage({super.key, required this.orderId});

  final int orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(orderDetailProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: const Text('订单详情')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: detail.when(
              data: (data) => _DetailBody(detail: data),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单加载失败',
                subtitle: '请返回后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '返回',
                onAction: () => context.pop(),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: detail.maybeWhen(
        data: (data) => _ActionBar(detail: data),
        orElse: () => null,
      ),
    );
  }
}

class _DetailBody extends ConsumerWidget {
  const _DetailBody({required this.detail});

  final OrderDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = detail.order;
    final logs = ref.watch(orderLogsProvider(order.id));
    final logistics = ref.watch(logisticsProvider(order.id));

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
      children: [
        _StatusHeader(order: order),
        const SizedBox(height: 10),
        _Card(
          title: '状态跟踪',
          child: logs.when(
            data: (items) => items.isEmpty
                ? const Text('暂无状态记录',
                    style: TextStyle(
                        fontSize: 13, color: AppTheme.textTertiary))
                : Column(
                    children: [
                      for (var i = 0; i < items.length; i++)
                        _TimelineTile(
                          log: items[i],
                          isLast: i == items.length - 1,
                        ),
                    ],
                  ),
            loading: () => const SizedBox(
              height: 60,
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, stack) => const Text('状态加载失败',
                style: TextStyle(fontSize: 13, color: AppTheme.textTertiary)),
          ),
        ),
        const SizedBox(height: 10),
        if (order.address != null)
          _Card(
            title: '收货信息',
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 18, color: AppTheme.brand),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${order.address!.receiver}  ${order.address!.phone}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.address!.fullAddress,
                        style: const TextStyle(
                            fontSize: 13, color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 10),
        _Card(
          title: '商品清单',
          child: Column(
            children: [
              for (var i = 0; i < detail.items.length; i++) ...[
                Row(
                  children: [
                    AppImage(
                      url: detail.items[i].image,
                      width: 62,
                      height: 62,
                      radius: AppTheme.radiusMd,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            detail.items[i].productTitle,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          if (detail.items[i].specText.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              detail.items[i].specText,
                              style: const TextStyle(
                                  fontSize: 11, color: AppTheme.textTertiary),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        PriceText(
                            cents: detail.items[i].priceCents, size: 14),
                        const SizedBox(height: 4),
                        Text(
                          'x${detail.items[i].quantity}',
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textTertiary),
                        ),
                      ],
                    ),
                  ],
                ),
                if (i != detail.items.length - 1)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Divider(height: 1),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 10),
        _Card(
          title: '金额明细',
          child: Column(
            children: [
              _AmountRow(
                label: '商品总额',
                value: Money.formatYuan(order.totalAmountCents),
              ),
              const SizedBox(height: 8),
              _AmountRow(
                label: '优惠减免',
                value: '-${Money.formatYuan(order.discountCents)}',
              ),
              const SizedBox(height: 8),
              _AmountRow(
                label: '运费',
                value: Money.formatYuan(order.freightCents),
              ),
              if (order.paidCents > 0) ...[
                const SizedBox(height: 8),
                _AmountRow(
                  label: '已支付',
                  value: Money.formatYuan(order.paidCents),
                ),
              ],
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Divider(height: 1),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '实付金额',
                    style:
                        TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                  ),
                  PriceText(cents: order.payableCents, size: 18),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        _Card(
          title: '物流信息',
          child: logistics.when(
            data: (data) {
              if (data.shipment == null) {
                return const Text('暂无物流信息',
                    style: TextStyle(
                        fontSize: 13, color: AppTheme.textTertiary));
              }
              final shipment = data.shipment!;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.local_shipping_outlined,
                          size: 18, color: AppTheme.brand),
                      const SizedBox(width: 8),
                      Text(
                        '${shipment.company}  ${shipment.trackingNo}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        shipment.status.label,
                        style: const TextStyle(
                            fontSize: 12, color: AppTheme.info600),
                      ),
                    ],
                  ),
                  if (data.tracks.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    for (final track in data.tracks)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 5),
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AppTheme.brand,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                track.description,
                                style: const TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.textSecondary),
                              ),
                            ),
                            Text(
                              DateFormatter.dateTime(track.occurredAt),
                              style: const TextStyle(
                                  fontSize: 11, color: AppTheme.textTertiary),
                            ),
                          ],
                        ),
                      ),
                  ],
                ],
              );
            },
            loading: () => const SizedBox(
              height: 40,
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, stack) => const Text('物流加载失败',
                style: TextStyle(fontSize: 13, color: AppTheme.textTertiary)),
          ),
        ),
        const SizedBox(height: 10),
        _Card(
          title: '订单信息',
          child: Column(
            children: [
              _AmountRow(label: '订单编号', value: order.orderNo),
              const SizedBox(height: 8),
              _AmountRow(
                label: '创建时间',
                value: DateFormatter.dateTimeSec(order.createdAt),
              ),
              if (order.remark.isNotEmpty) ...[
                const SizedBox(height: 8),
                _AmountRow(label: '订单备注', value: order.remark),
              ],
              if (order.paymentMethod.isNotEmpty) ...[
                const SizedBox(height: 8),
                _AmountRow(label: '支付方式', value: order.paymentMethod),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// 状态头。
class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.order});

  final Order order;

  @override
  Widget build(BuildContext context) {
    final color = switch (order.status) {
      OrderStatus.pendingPayment => AppTheme.warning600,
      OrderStatus.paid => AppTheme.info600,
      OrderStatus.shipped => AppTheme.brand,
      OrderStatus.refunding => AppTheme.accent600,
      OrderStatus.completed => AppTheme.success600,
      _ => AppTheme.textTertiary,
    };
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: [
          Icon(
            order.status.isFinished
                ? Icons.check_circle_rounded
                : Icons.local_shipping_rounded,
            color: color,
            size: 26,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.status.label,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _subtitle(order.status),
                  style: const TextStyle(
                      fontSize: 13, color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _subtitle(OrderStatus status) {
    switch (status) {
      case OrderStatus.pendingPayment:
        return '请在 30 分钟内完成支付';
      case OrderStatus.paid:
        return '商家正在备货，请耐心等待';
      case OrderStatus.shipped:
        return '包裹已发出，注意查收';
      case OrderStatus.completed:
        return '订单已完成，欢迎评价';
      case OrderStatus.refunding:
        return '退款申请处理中';
      case OrderStatus.refunded:
        return '退款已到账';
      case OrderStatus.cancelled:
        return '订单已取消';
      case OrderStatus.closed:
        return '订单已关闭';
      case OrderStatus.unspecified:
        return '订单状态更新中';
    }
  }
}

/// 时间线。
class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.log, required this.isLast});

  final OrderStatusLog log;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                  color: isLast ? AppTheme.brand : AppTheme.borderDefault,
                  shape: BoxShape.circle,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 1, color: AppTheme.borderSubtle),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    log.remark.isEmpty ? log.action : log.remark,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isLast ? FontWeight.w600 : FontWeight.w400,
                      color: isLast
                          ? AppTheme.textPrimary
                          : AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    DateFormatter.dateTime(log.createdAt),
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 操作栏。
class _ActionBar extends ConsumerWidget {
  const _ActionBar({required this.detail});

  final OrderDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = detail.order;
    final buttons = <Widget>[];

    if (detail.canCancel) {
      buttons.add(_outlineButton('取消订单', () => _cancel(context, ref)));
    }
    if (detail.canPay) {
      buttons.add(
        _filledButton('去支付', () => context.push('/payment/${order.id}')),
      );
    }
    if (detail.canConfirm) {
      buttons.add(_outlineButton('确认收货', () => _confirm(context, ref)));
    }
    if (detail.canRefund) {
      buttons.add(
        _outlineButton(
          '申请退款',
          () => context.push('/refund', extra: order.id),
        ),
      );
    }
    if (detail.canReview) {
      final productId = detail.items.isNotEmpty ? detail.items.first.productId : 0;
      buttons.add(
        _filledButton('去评价', () => context.push('/review', extra: productId)),
      );
    }
    if (buttons.isEmpty) {
      buttons.add(
        _outlineButton('查看物流', () => context.push('/logistics', extra: order.id)),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: buttons,
        ),
      ),
    );
  }

  Widget _outlineButton(String text, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(88, 36),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          textStyle: const TextStyle(fontSize: 13),
        ),
        child: Text(text),
      ),
    );
  }

  Widget _filledButton(String text, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          minimumSize: const Size(88, 36),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          textStyle: const TextStyle(fontSize: 13),
        ),
        child: Text(text),
      ),
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final error = await ref.read(orderActionsProvider).cancel(detail.order.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(error ?? '订单已取消')));
  }

  Future<void> _confirm(BuildContext context, WidgetRef ref) async {
    final error =
        await ref.read(orderActionsProvider).confirm(detail.order.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(error ?? '已确认收货')));
  }

}

/// 通用卡片。
class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

/// 金额行。
class _AmountRow extends StatelessWidget {
  const _AmountRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        Flexible(
          child: Text(
            value,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
          ),
        ),
      ],
    );
  }
}

/// 退款原因弹窗。
class _RefundDialog extends StatefulWidget {
  const _RefundDialog();

  @override
  State<_RefundDialog> createState() => _RefundDialogState();
}

class _RefundDialogState extends State<_RefundDialog> {
  final TextEditingController _controller = TextEditingController();
  String _reason = '不想要了';

  static const List<String> _reasons = [
    '不想要了',
    '商品与描述不符',
    '质量问题',
    '物流太慢',
    '其他原因',
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('申请退款'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            children: _reasons
                .map((reason) => ChoiceChip(
                      label: Text(reason),
                      selected: _reason == reason,
                      onSelected: (_) => setState(() => _reason = reason),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: '补充说明（选填）',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(
            _controller.text.trim().isEmpty
                ? _reason
                : '$_reason：${_controller.text.trim()}',
          ),
          child: const Text('提交申请'),
        ),
      ],
    );
  }
}

/// 评价弹窗。
class _ReviewDialog extends StatefulWidget {
  const _ReviewDialog();

  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  final TextEditingController _controller = TextEditingController();
  int _rating = 5;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('发表评价'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Text('评分', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 12),
              for (var i = 1; i <= 5; i++)
                GestureDetector(
                  onTap: () => setState(() => _rating = i),
                  child: Icon(
                    i <= _rating
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 26,
                    color: AppTheme.accent500,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLines: 3,
            decoration: const InputDecoration(hintText: '说说你的使用感受'),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: () {
            if (_controller.text.trim().isEmpty) return;
            Navigator.of(context)
                .pop((rating: _rating, content: _controller.text.trim()));
          },
          child: const Text('提交'),
        ),
      ],
    );
  }
}
