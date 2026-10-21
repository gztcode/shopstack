import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../providers/core_providers.dart';

/// 演示数据模式提示条：后端不可用时展示在页面顶部。
class DemoBanner extends ConsumerWidget {
  const DemoBanner({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final demo = ref.watch(demoModeProvider);
    if (!demo) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: AppTheme.warning.withValues(alpha: 0.14),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Icon(Icons.cloud_off_rounded, size: 16, color: AppTheme.warning700),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                message ?? '演示数据模式：后端服务未连接，当前展示内置演示数据',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.warning700,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
