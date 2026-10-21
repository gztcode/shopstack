import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../providers/refund_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 售后申请页。
class RefundPage extends ConsumerStatefulWidget {
  const RefundPage({super.key, this.initialOrderId});

  /// 从订单详情跳转过来时预选订单。
  final int? initialOrderId;

  @override
  ConsumerState<RefundPage> createState() => _RefundPageState();
}

class _RefundPageState extends ConsumerState<RefundPage> {
  static const List<String> _reasons = <String>[
    '不想要了',
    '商品与描述不符',
    '质量问题',
    '物流太慢',
    '发错货 / 漏发',
    '其他原因',
  ];

  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  int? _orderId;
  String _reason = _reasons.first;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _orderId = widget.initialOrderId;
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(refundableOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('售后申请')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: orders.when(
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    title: '暂无可申请售后的订单',
                    subtitle: '已付款、待收货或已完成的订单可申请售后',
                    icon: Icons.assignment_return_outlined,
                  );
                }
                return _buildBody(context, ref, list);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(refundableOrdersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, List<Order> orders) {
    final orderId = _orderId ?? orders.first.id;
    final Order selected = orders.firstWhere(
      (order) => order.id == orderId,
      orElse: () => orders.first,
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '选择订单',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              for (final order in orders)
                _OrderSelectTile(
                  order: order,
                  active: order.id == selected.id,
                  onTap: () => setState(() {
                    _orderId = order.id;
                    _amountController.text =
                        (order.payableCents / 100).toStringAsFixed(2);
                  }),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '退款原因',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _reasons
                    .map((reason) => ChoiceChip(
                          label: Text(reason),
                          selected: _reason == reason,
                          onSelected: (_) => setState(() => _reason = reason),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Text(
                    '退款金额',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '最多可退 ${Money.formatYuanWithSymbol(selected.payableCents)}',
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  hintText: '请输入退款金额（元）',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                '补充说明',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _descriptionController,
                maxLines: 3,
                maxLength: 100,
                decoration: const InputDecoration(
                  hintText: '可补充问题描述，便于商家更快处理',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting ? null : () => _submit(selected),
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('提交退款申请'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _submit(Order order) async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    final cents = (amount * 100).round();
    if (cents <= 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请输入正确的退款金额')));
      return;
    }
    if (cents > order.payableCents - order.refundedCents) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('退款金额不能超过可退金额')),
      );
      return;
    }
    setState(() => _submitting = true);
    final error = await ref.read(refundActionsProvider).apply(
          orderId: order.id,
          reason: _reason,
          amountCents: cents,
          description: _descriptionController.text.trim(),
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    _descriptionController.clear();
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('退款申请已提交')));
  }
}

/// 可申请售后的订单条目。
class _OrderSelectTile extends StatelessWidget {
  const _OrderSelectTile({
    required this.order,
    required this.active,
    required this.onTap,
  });

  final Order order;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.orderNo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${order.status.label} · 共 ${order.totalQuantity} 件',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
            PriceText(cents: order.payableCents, size: 15),
            const SizedBox(width: 8),
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
