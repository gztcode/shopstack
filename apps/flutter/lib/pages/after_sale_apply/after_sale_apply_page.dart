import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../providers/expansion_providers.dart';
import '../../providers/order_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 申请售后页：选择订单、类型与原因后提交售后申请。
///
/// 数据来源：`GET /api/v1/orders`、`GET /api/v1/refund-reasons`，
/// 提交走 `POST /api/v1/after-sales`。
class AfterSaleApplyPage extends ConsumerStatefulWidget {
  const AfterSaleApplyPage({super.key, this.orderId});

  /// 预选的订单 id。
  final int? orderId;

  @override
  ConsumerState<AfterSaleApplyPage> createState() => _AfterSaleApplyPageState();
}

class _AfterSaleApplyPageState extends ConsumerState<AfterSaleApplyPage> {
  int _selectedOrderId = 0;
  int _type = 1;
  String _reason = '';
  final TextEditingController _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedOrderId = widget.orderId ?? 0;
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(orderListProvider(null));
    final reasons = ref.watch(refundReasonsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('申请售后')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: orders.when(
              data: (result) {
                final payable = result.orders
                    .where((o) =>
                        o.status == OrderStatus.paid ||
                        o.status == OrderStatus.shipped ||
                        o.status == OrderStatus.completed)
                    .toList();
                if (payable.isEmpty) {
                  return EmptyState(
                    title: '暂无可申请售后的订单',
                    subtitle: '只有已付款的订单才能发起售后申请',
                    icon: Icons.assignment_return_outlined,
                    actionText: '去订单列表看看',
                    onAction: () => context.push('/order/all'),
                  );
                }
                final selected = payable.firstWhere(
                  (o) => o.id == _selectedOrderId,
                  orElse: () => payable.first,
                );
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    AppCard(
                      padding: const EdgeInsets.all(14),
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
                          RadioGroup<int>(
                            groupValue: selected.id,
                            onChanged: (value) =>
                                setState(() => _selectedOrderId = value ?? 0),
                            child: Column(
                              children: [
                                for (final order in payable)
                                  // ListTile 的水波纹画在最近的 Material 上，
                                  // 外层 AppCard 已有背景色，必须自带一层 Material
                                  // 否则水波纹不可见（Flutter 会断言告警）。
                                  Material(
                                    color: Colors.transparent,
                                    child: RadioListTile<int>(
                                      value: order.id,
                                      dense: true,
                                      contentPadding: EdgeInsets.zero,
                                      title: Text(
                                        '订单 ${order.orderNo}',
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppTheme.textPrimary),
                                      ),
                                      subtitle: Text(
                                        '${DateFormatter.dateTime(order.createdAt)} · '
                                        '实付 ${Money.formatYuanWithSymbol(order.payableCents)}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppTheme.textTertiary),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '售后类型',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            children: [
                              for (final entry in const [
                                (1, '仅退款'),
                                (2, '退货退款'),
                                (3, '换货'),
                              ])
                                ChoiceChip(
                                  label: Text(entry.$2),
                                  selected: _type == entry.$1,
                                  onSelected: (_) =>
                                      setState(() => _type = entry.$1),
                                ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            '退款原因',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  '选择最接近的原因，有助于更快通过审核',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.textTertiary),
                                ),
                              ),
                              TextButton(
                                onPressed: () => _pickReason(context),
                                child: const Text('更多原因'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          reasons.when(
                            data: (list) => RadioGroup<String>(
                              groupValue: _reason,
                              onChanged: (value) =>
                                  setState(() => _reason = value ?? ''),
                              child: Column(
                                children: [
                                  for (final reason in list)
                                    // 同上：自带 Material 承载水波纹。
                                    Material(
                                      color: Colors.transparent,
                                      child: RadioListTile<String>(
                                        value: reason.name,
                                        dense: true,
                                        contentPadding: EdgeInsets.zero,
                                        title: Text(
                                          reason.name,
                                          style: const TextStyle(
                                              fontSize: 13,
                                              color: AppTheme.textPrimary),
                                        ),
                                        subtitle: reason.description.isEmpty
                                            ? null
                                            : Text(
                                                reason.description,
                                                style: const TextStyle(
                                                    fontSize: 11,
                                                    color:
                                                        AppTheme.textTertiary),
                                              ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            loading: () => const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Center(child: CircularProgressIndicator()),
                            ),
                            error: (error, stack) => const Text(
                              '退款原因加载失败，请稍后重试',
                              style: TextStyle(
                                  fontSize: 12, color: AppTheme.textTertiary),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '问题描述',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _descriptionController,
                            maxLines: 4,
                            decoration: const InputDecoration(
                              hintText: '补充说明商品问题，便于商家快速处理',
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Text(
                                '预计退款金额',
                                style: TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.textSecondary),
                              ),
                              const Spacer(),
                              PriceText(
                                  cents: selected.payableCents, size: 16),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _reason.isEmpty
                          ? null
                          : () => _submit(context, ref, selected),
                      child: const Text('提交售后申请'),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(orderListProvider(null)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 跳转「退款原因」页选择，返回后回填。
  Future<void> _pickReason(BuildContext context) async {
    final picked = await context.push<String>('/refund-reason');
    if (picked == null || picked.isEmpty) return;
    setState(() => _reason = picked);
  }

  Future<void> _submit(
      BuildContext context, WidgetRef ref, Order order) async {
    final message = await ref.read(expansionActionsProvider).createAfterSale(
          orderId: order.id,
          type: _type,
          reason: _reason,
          amountCents: order.payableCents,
          description: _descriptionController.text.trim(),
        );
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    if (context.mounted) {
      context.push('/after-sale/list');
    }
  }
}
