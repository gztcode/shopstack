import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 账号安全页：展示账号绑定与登录状态，数据来自
/// `GET /api/v1/users/security`。
class AccountSecurityPage extends ConsumerWidget {
  const AccountSecurityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final security = ref.watch(securityProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('账号安全')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: security.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  AppCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '账号绑定',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          '建议定期检查绑定状态，确保账号可正常找回',
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.textTertiary),
                        ),
                        const SizedBox(height: 10),
                        _SecurityRow(
                          icon: Icons.lock_outline_rounded,
                          label: '登录密码',
                          bound: data.passwordSet,
                          boundText: '已设置',
                          unboundText: '未设置',
                        ),
                        _SecurityRow(
                          icon: Icons.phone_iphone_rounded,
                          label: '手机号',
                          bound: data.phoneBound,
                          boundText: '已绑定',
                          unboundText: '未绑定',
                        ),
                        _SecurityRow(
                          icon: Icons.mail_outline_rounded,
                          label: '邮箱',
                          bound: data.emailBound,
                          boundText: '已绑定',
                          unboundText: '未绑定',
                        ),
                        _SecurityRow(
                          icon: Icons.chat_bubble_outline_rounded,
                          label: '微信',
                          bound: data.wechatBound,
                          boundText: '已绑定',
                          unboundText: '未绑定',
                        ),
                        _SecurityRow(
                          icon: Icons.badge_outlined,
                          label: '实名认证',
                          bound: data.realnameVerified,
                          boundText: '已认证',
                          unboundText: '未认证',
                          route: '/user/realname',
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
                          '账号状态',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _Row(label: '安全等级', value: data.riskLabel),
                        _Row(
                          label: '最近修改密码',
                          value: DateFormatter.dateTime(data.passwordChangedAt),
                        ),
                        if (data.warnings.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          for (final warning in data.warnings)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.warning_amber_rounded,
                                      size: 15, color: AppTheme.warning),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      warning,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          height: 1.5,
                                          color: AppTheme.textSecondary),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
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
                          '安全建议',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          '1. 不与他人共享账号密码，定期更换密码；\\n'
                          '2. 公共设备登录后请退出账号；\\n'
                          '3. 发现异常登录记录请立即修改密码；\\n'
                          '4. 完善手机号绑定，账号找回更方便。',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.8,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '账号安全信息加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(securityProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 绑定状态行。
class _SecurityRow extends StatelessWidget {
  const _SecurityRow({
    required this.icon,
    required this.label,
    required this.bound,
    required this.boundText,
    required this.unboundText,
    this.route,
  });

  final IconData icon;
  final String label;
  final bool bound;
  final String boundText;
  final String unboundText;
  final String? route;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                  fontSize: 14, color: AppTheme.textPrimary),
            ),
          ),
          StatusTag(
            text: bound ? boundText : unboundText,
            color: bound ? AppTheme.success : AppTheme.warning,
          ),
          if (route != null) ...[
            const SizedBox(width: 6),
            GestureDetector(
              onTap: () => context.push(route!),
              child: const Icon(Icons.chevron_right_rounded,
                  size: 18, color: AppTheme.textTertiary),
            ),
          ],
        ],
      ),
    );
  }
}

/// 信息行。
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppTheme.textTertiary),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value.isEmpty ? '--' : value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
