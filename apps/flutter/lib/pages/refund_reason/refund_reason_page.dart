import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 退款原因页：列出可选的退款原因，数据来自
/// `GET /api/v1/refund-reasons`。
///
/// 本页可作为「申请售后」的选择器使用：选择后通过路由返回值回传。
class RefundReasonPage extends ConsumerWidget {
  const RefundReasonPage({super.key, this.selected});

  /// 当前已选中的原因。
  final String? selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reasons = ref.watch(refundReasonsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('退款原因')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: reasons.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无可选原因',
                    subtitle: '商家还未配置退款原因，可先联系客服处理',
                    icon: Icons.help_outline_rounded,
                    actionText: '返回申请售后',
                    onAction: () => context.push('/after-sale/apply'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final reason = list[index];
                    final isSelected = reason.name == selected;
                    return AppCard(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      onTap: () {
                        context.pop(reason.name);
                      },
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      reason.name,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                if (reason.description.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    reason.description,
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle_rounded,
                                color: AppTheme.brand, size: 20)
                          else
                            const Icon(Icons.chevron_right_rounded,
                                size: 18, color: AppTheme.textTertiary),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '退款原因加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(refundReasonsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
