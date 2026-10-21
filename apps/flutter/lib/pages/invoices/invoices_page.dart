import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/invoice.dart';
import '../../models/order.dart';
import '../../providers/invoice_provider.dart';
import '../../providers/order_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 发票管理页。
class InvoicesPage extends ConsumerWidget {
  const InvoicesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoices = ref.watch(invoicesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('发票管理')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: invoices.when(
              data: (result) => RefreshIndicator(
                color: AppTheme.brand,
                onRefresh: () async => ref.invalidate(invoicesProvider),
                child: result.invoices.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 80),
                          EmptyState(
                            title: '暂无发票申请',
                            subtitle: '点击右下角按钮申请开票',
                            icon: Icons.receipt_long_outlined,
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
                        itemCount: result.invoices.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 10),
                        itemBuilder: (context, index) =>
                            _InvoiceTile(invoice: result.invoices[index]),
                      ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '发票列表加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(invoicesProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showApplySheet(context, ref),
        backgroundColor: AppTheme.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('申请开票'),
      ),
    );
  }

  Future<void> _showApplySheet(BuildContext context, WidgetRef ref) async {
    final orders = ref.read(orderListProvider(null));
    final list = orders.asData?.value.orders ?? const <Order>[];
    final payable = list
        .where((o) =>
            o.status == OrderStatus.paid ||
            o.status == OrderStatus.shipped ||
            o.status == OrderStatus.completed)
        .toList();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _InvoiceFormSheet(orders: payable),
    );
  }
}

/// 发票条目。
class _InvoiceTile extends StatelessWidget {
  const _InvoiceTile({required this.invoice});

  final Invoice invoice;

  @override
  Widget build(BuildContext context) {
    final color = switch (invoice.status) {
      1 => AppTheme.success600,
      2 => AppTheme.danger600,
      _ => AppTheme.warning600,
    };
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  invoice.title.isEmpty ? '未填写抬头' : invoice.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              StatusTag(text: invoice.statusLabel, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '订单号 ${invoice.orderNo}',
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          if (invoice.taxNo.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '税号 ${invoice.taxNo}',
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
          if (invoice.email.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '接收邮箱 ${invoice.email}',
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
          if (invoice.remark.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '备注：${invoice.remark}',
              style: const TextStyle(fontSize: 12, color: AppTheme.textTertiary),
            ),
          ],
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                invoice.typeLabel,
                style: const TextStyle(fontSize: 12, color: AppTheme.textTertiary),
              ),
              const Spacer(),
              PriceText(cents: invoice.amountCents, size: 16),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                DateFormatter.dateTime(invoice.createdAt),
                style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary),
              ),
              const Spacer(),
              if (invoice.invoiceUrl.isNotEmpty)
                TextButton.icon(
                  onPressed: () => _showInvoiceUrl(context, invoice.invoiceUrl),
                  icon: const Icon(Icons.description_outlined, size: 16),
                  label: const Text('查看发票'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _showInvoiceUrl(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('电子发票'),
        content: Text(url),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }
}

/// 申请开票表单。
class _InvoiceFormSheet extends ConsumerStatefulWidget {
  const _InvoiceFormSheet({required this.orders});

  final List<Order> orders;

  @override
  ConsumerState<_InvoiceFormSheet> createState() => _InvoiceFormSheetState();
}

class _InvoiceFormSheetState extends ConsumerState<_InvoiceFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _taxNoController = TextEditingController();
  final _emailController = TextEditingController();
  final _remarkController = TextEditingController();
  String _type = 'personal';
  int? _selectedOrderId;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.orders.isNotEmpty) {
      _selectedOrderId = widget.orders.first.id;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _taxNoController.dispose();
    _emailController.dispose();
    _remarkController.dispose();
    super.dispose();
  }

  Order? get _selectedOrder {
    for (final order in widget.orders) {
      if (order.id == _selectedOrderId) return order;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('申请开票', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              if (widget.orders.isEmpty)
                const Text(
                  '暂无可开票的订单',
                  style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
                )
              else
                DropdownButtonFormField<int>(
                  initialValue: _selectedOrderId,
                  decoration: const InputDecoration(labelText: '选择订单'),
                  items: widget.orders
                      .map((order) => DropdownMenuItem<int>(
                            value: order.id,
                            child: Text(
                              '${order.orderNo}  ¥${Money.formatYuan(order.payableCents)}',
                              style: const TextStyle(fontSize: 13),
                            ),
                          ))
                      .toList(),
                  onChanged: (value) => setState(() => _selectedOrderId = value),
                ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: '发票抬头'),
                validator: (value) {
                  if ((value ?? '').trim().isEmpty) return '请输入发票抬头';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('个人'),
                      selected: _type == 'personal',
                      onSelected: (_) => setState(() => _type = 'personal'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('企业'),
                      selected: _type == 'company',
                      onSelected: (_) => setState(() => _type = 'company'),
                    ),
                  ),
                ],
              ),
              if (_type == 'company') ...[
                const SizedBox(height: 14),
                TextFormField(
                  controller: _taxNoController,
                  decoration: const InputDecoration(labelText: '纳税人识别号'),
                  validator: (value) {
                    if (_type == 'company' && (value ?? '').trim().isEmpty) {
                      return '企业发票需填写税号';
                    }
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 14),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: '接收邮箱'),
                validator: (value) {
                  final text = (value ?? '').trim();
                  if (text.isEmpty) return '请输入接收邮箱';
                  if (!text.contains('@')) return '邮箱格式不正确';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _remarkController,
                maxLength: 50,
                decoration: const InputDecoration(
                  labelText: '备注（选填）',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting || widget.orders.isEmpty ? null : _submit,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('提交申请'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final order = _selectedOrder;
    if (order == null) return;
    setState(() => _submitting = true);
    final result = await ref.read(invoiceActionsProvider).createInvoice(
          orderNo: order.orderNo,
          title: _titleController.text.trim(),
          taxNo: _taxNoController.text.trim(),
          type: _type,
          email: _emailController.text.trim(),
          amountCents: order.payableCents,
          remark: _remarkController.text.trim(),
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    final error = result.$2;
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('开票申请已提交')),
    );
  }
}
