import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/payment.dart';
import '../../providers/order_provider.dart';
import '../../providers/payment_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 支付页。
class PaymentPage extends ConsumerStatefulWidget {
  const PaymentPage({super.key, required this.orderId});

  final int orderId;

  @override
  ConsumerState<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends ConsumerState<PaymentPage> {
  PaymentChannel _channel = PaymentChannel.wechat;
  bool _paying = false;
  Payment? _payment;

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('订单支付')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: order.when(
              data: (detail) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 28),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                      boxShadow: AppTheme.shadowSm,
                    ),
                    child: Column(
                      children: [
                        Text(
                          '支付金额',
                          style: TextStyle(
                              fontSize: 13, color: AppTheme.textTertiary),
                        ),
                        const SizedBox(height: 10),
                        PriceText(cents: detail.order.payableCents, size: 34),
                        const SizedBox(height: 8),
                        Text(
                          '订单号 ${detail.order.orderNo}',
                          style: TextStyle(
                              fontSize: 12, color: AppTheme.textTertiary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.bgCard,
                      borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                      boxShadow: AppTheme.shadowSm,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '选择支付方式',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        for (final channel in const [
                          PaymentChannel.wechat,
                          PaymentChannel.alipay,
                          PaymentChannel.balance,
                        ])
                          _ChannelTile(
                            channel: channel,
                            active: _channel == channel,
                            onTap: () => setState(() => _channel = channel),
                          ),
                      ],
                    ),
                  ),
                  if (_payment != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.bgCard,
                        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                        boxShadow: AppTheme.shadowSm,
                      ),
                      child: Column(
                        children: [
                          _InfoRow(
                              label: '支付单号', value: _payment!.paymentNo),
                          const SizedBox(height: 8),
                          _InfoRow(
                            label: '支付渠道',
                            value: _payment!.channel.label,
                          ),
                          if (_payment!.transactionId.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            _InfoRow(
                              label: '交易号',
                              value: _payment!.transactionId,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单信息加载失败',
                subtitle: '请返回后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '返回',
                onAction: () => context.pop(),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          border: Border(
            top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
          ),
        ),
        child: SafeArea(
          top: false,
          child: FilledButton(
            onPressed: _paying ? null : _pay,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              backgroundColor: AppTheme.accent500,
            ),
            child: _paying
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text('确认支付 ${_channel.label}'),
          ),
        ),
      ),
    );
  }

  Future<void> _pay() async {
    setState(() => _paying = true);
    final actions = ref.read(paymentActionsProvider);
    final created = await actions.createPayment(
      orderId: widget.orderId,
      channel: _channel,
    );
    if (!mounted) return;
    if (created == null) {
      setState(() => _paying = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('支付单创建失败，请重试')),
      );
      return;
    }
    setState(() => _payment = created);

    // 轮询支付状态（最多 10 次，每次间隔 2 秒）。
    for (var i = 0; i < 10; i++) {
      await Future<void>.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      final payment = await actions.queryPayment(
        paymentId: created.id,
        orderId: widget.orderId,
      );
      if (payment == null) continue;
      if (payment.status == PaymentStatus.success) {
        setState(() {
          _paying = false;
          _payment = payment;
        });
        ref.invalidate(orderDetailProvider(widget.orderId));
        ref.invalidate(orderListProvider);
        _showResult(true);
        return;
      }
      if (payment.status == PaymentStatus.failed ||
          payment.status == PaymentStatus.closed) {
        setState(() {
          _paying = false;
          _payment = payment;
        });
        _showResult(false);
        return;
      }
    }
    if (!mounted) return;
    setState(() => _paying = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('支付处理中，请稍后在订单列表查看')),
    );
  }

  void _showResult(bool success) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              success ? Icons.check_circle_rounded : Icons.error_rounded,
              color: success ? AppTheme.success : AppTheme.danger,
            ),
            const SizedBox(width: 8),
            Text(success ? '支付成功' : '支付失败'),
          ],
        ),
        content: Text(
          success
              ? '支付金额 ${Money.formatYuanWithSymbol(_payment?.amountCents ?? 0)}，商家将尽快为你发货。'
              : (_payment?.failReason.isNotEmpty ?? false
                  ? _payment!.failReason
                  : '支付未完成，请稍后重试。'),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/home');
            },
            child: const Text('返回首页'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/order/${widget.orderId}');
            },
            child: const Text('查看订单'),
          ),
        ],
      ),
    );
  }
}

/// 支付方式条目。
class _ChannelTile extends StatelessWidget {
  const _ChannelTile({
    required this.channel,
    required this.active,
    required this.onTap,
  });

  final PaymentChannel channel;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final icon = switch (channel) {
      PaymentChannel.wechat => Icons.chat_bubble_rounded,
      PaymentChannel.alipay => Icons.account_balance_wallet_rounded,
      PaymentChannel.balance => Icons.payments_rounded,
      PaymentChannel.unspecified => Icons.help_outline_rounded,
    };
    final color = switch (channel) {
      PaymentChannel.wechat => AppTheme.success,
      PaymentChannel.alipay => AppTheme.info,
      _ => AppTheme.accent600,
    };
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(width: 12),
            Text(
              channel.label,
              style: TextStyle(
                fontSize: 14,
                color: active ? AppTheme.textPrimary : AppTheme.textSecondary,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            const Spacer(),
            Icon(
              active
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: active ? AppTheme.brand : AppTheme.borderDefault,
            ),
          ],
        ),
      ),
    );
  }
}

/// 信息行。
class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 13, color: AppTheme.textTertiary)),
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
