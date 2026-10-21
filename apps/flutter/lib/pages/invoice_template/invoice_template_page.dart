import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 发票抬头模板页：管理常用开票信息，数据来自
/// `GET/POST/DELETE /api/v1/users/invoice-templates`。
class InvoiceTemplatePage extends ConsumerWidget {
  const InvoiceTemplatePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final templates = ref.watch(invoiceTemplatesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('发票抬头模板')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context, ref),
        icon: const Icon(Icons.add_rounded),
        label: const Text('新增抬头'),
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: templates.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '还没有发票抬头',
                    subtitle: '添加抬头后，开票时可直接选用',
                    icon: Icons.receipt_long_outlined,
                    actionText: '新增抬头',
                    onAction: () => _showCreateDialog(context, ref),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final template = list[index];
                    return _TemplateCard(
                      template: template,
                      onDelete: () => _confirmDelete(context, ref, template),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '发票抬头加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(invoiceTemplatesProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showCreateDialog(BuildContext context, WidgetRef ref) async {
    final titleController = TextEditingController();
    final taxNoController = TextEditingController();
    final emailController = TextEditingController();
    var type = 'personal';

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('新增发票抬头'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(hintText: '抬头名称'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: taxNoController,
                  decoration: const InputDecoration(hintText: '纳税人识别号'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: emailController,
                  decoration:
                      const InputDecoration(hintText: '接收发票的邮箱'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('个人'),
                      selected: type == 'personal',
                      onSelected: (_) => setState(() => type = 'personal'),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('企业'),
                      selected: type == 'company',
                      onSelected: (_) => setState(() => type = 'company'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('保存'),
            ),
          ],
        ),
      ),
    );

    if (submitted != true || titleController.text.trim().isEmpty) {
      titleController.dispose();
      taxNoController.dispose();
      emailController.dispose();
      return;
    }
    final message = await ref.read(expansionActionsProvider).createInvoiceTemplate(
          title: titleController.text.trim(),
          taxNo: taxNoController.text.trim(),
          type: type,
          email: emailController.text.trim(),
        );
    titleController.dispose();
    taxNoController.dispose();
    emailController.dispose();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, InvoiceTemplate template) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除发票抬头'),
        content: Text('确认删除「${template.title}」吗？删除后不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final message = await ref
        .read(expansionActionsProvider)
        .deleteInvoiceTemplate(template.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}

/// 发票抬头卡片。
class _TemplateCard extends StatelessWidget {
  const _TemplateCard({required this.template, required this.onDelete});

  final InvoiceTemplate template;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  template.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              if (template.isDefault)
                const StatusTag(text: '默认', color: AppTheme.success),
            ],
          ),
          const SizedBox(height: 10),
          _row('抬头类型', template.type == 'company' ? '企业' : '个人'),
          if (template.taxNo.isNotEmpty) _row('纳税人识别号', template.taxNo),
          if (template.email.isNotEmpty) _row('接收邮箱', template.email),
          if (template.address.isNotEmpty)
            _row('企业地址', template.address),
          if (template.phone.isNotEmpty) _row('企业电话', template.phone),
          if (template.bankName.isNotEmpty) _row('开户银行', template.bankName),
          if (template.bankAccount.isNotEmpty)
            _row('银行账号', template.bankAccount),
          _row('创建时间', DateFormatter.dateTime(template.createdAt)),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline_rounded, size: 18),
              label: const Text('删除'),
              style: TextButton.styleFrom(foregroundColor: AppTheme.danger600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppTheme.textTertiary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
