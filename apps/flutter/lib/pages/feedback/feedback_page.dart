import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';

/// 意见反馈页：提交使用建议与问题反馈，数据来自
/// `POST /api/v1/users/feedback`。
class FeedbackPage extends ConsumerStatefulWidget {
  const FeedbackPage({super.key});

  @override
  ConsumerState<FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends ConsumerState<FeedbackPage> {
  /// 后端 `type` 为整型：1 功能建议 2 使用问题 3 投诉 4 其他。
  static const List<({int type, String label})> _types =
      <({int type, String label})>[
    (type: 1, label: '功能建议'),
    (type: 2, label: '使用问题'),
    (type: 3, label: '投诉吐槽'),
    (type: 4, label: '其他'),
  ];

  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _contactController = TextEditingController();
  int _type = 1;
  bool _submitting = false;

  @override
  void dispose() {
    _contentController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('意见反馈')),
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
                        '反馈类型',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final item in _types)
                            ChoiceChip(
                              label: Text(item.label),
                              selected: _type == item.type,
                              onSelected: (_) =>
                                  setState(() => _type = item.type),
                            ),
                        ],
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
                        '反馈内容',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _contentController,
                        maxLines: 6,
                        decoration: const InputDecoration(
                          hintText: '请描述你遇到的问题或建议，至少 5 个字',
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        '联系方式',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '选填，方便我们回复你',
                        style: TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _contactController,
                        decoration: const InputDecoration(
                          hintText: '手机号 / 邮箱 / 微信号',
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed:
                      _submitting ? null : () => _submit(context, ref),
                  child: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('提交反馈'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final content = _contentController.text.trim();
    if (content.length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('反馈内容至少 5 个字')),
      );
      return;
    }
    setState(() => _submitting = true);
    final message = await ref.read(expansionActionsProvider).feedback(
          content: content,
          type: _type,
          contact: _contactController.text.trim(),
        );
    if (!context.mounted) return;
    setState(() => _submitting = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    if (content.isNotEmpty) {
      _contentController.clear();
    }
  }
}
