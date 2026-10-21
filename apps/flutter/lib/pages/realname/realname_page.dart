import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';

/// 实名认证页：提交姓名与证件号，数据来自 `POST /api/v1/users/realname`。
class RealnamePage extends ConsumerStatefulWidget {
  const RealnamePage({super.key});

  @override
  ConsumerState<RealnamePage> createState() => _RealnamePageState();
}

class _RealnamePageState extends ConsumerState<RealnamePage> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _idController = TextEditingController();
  bool _agree = false;
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _idController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('实名认证')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
              children: [
                AppCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '实名信息',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '认证信息仅用于身份核验，请如实填写',
                        style: TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: '真实姓名',
                          hintText: '与证件保持一致',
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _idController,
                        maxLength: 18,
                        decoration: const InputDecoration(
                          labelText: '证件号码',
                          hintText: '身份证 / 护照号码',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                AppCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '认证须知',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        '1. 提交后由平台在 1 个工作日内完成审核；\\n'
                        '2. 审核通过后可参与部分需要实名认证的专属活动；\\n'
                        '3. 证件信息加密存储，仅用于核验；\\n'
                        '4. 审核不通过会通过站内消息通知原因。',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.8,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Checkbox(
                            value: _agree,
                            onChanged: (value) =>
                                setState(() => _agree = value ?? false),
                          ),
                          const Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(top: 12),
                              child: Text(
                                '我已阅读并同意《实名认证服务协议》',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _agree && !_submitting ? () => _submit(context, ref) : null,
                  child: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('提交认证'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final name = _nameController.text.trim();
    final idCard = _idController.text.trim();
    if (name.isEmpty || idCard.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请完整填写姓名与证件号码')),
      );
      return;
    }
    setState(() => _submitting = true);
    final message = await ref
        .read(expansionActionsProvider)
        .realname(realName: name, idCard: idCard);
    if (!context.mounted) return;
    setState(() => _submitting = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
}
