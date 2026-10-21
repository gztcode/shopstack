import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/core_providers.dart';
import '../../widgets/demo_banner.dart';

/// 设置页。
class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  static const String _pushKey = 'shopstack_setting_push';
  static const String _recommendKey = 'shopstack_setting_recommend';

  bool _push = true;
  bool _recommend = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _push = prefs.getBool(_pushKey) ?? true;
      _recommend = prefs.getBool(_recommendKey) ?? true;
    });
  }

  Future<void> _setBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              children: [
                _group('消息与推荐', [
                  SwitchListTile(
                    value: _push,
                    onChanged: (value) {
                      setState(() => _push = value);
                      _setBool(_pushKey, value);
                    },
                    title: const Text('订单与物流推送',
                        style: TextStyle(fontSize: 14)),
                    subtitle: const Text('关闭后将不再收到站内提醒',
                        style: TextStyle(fontSize: 12)),
                    contentPadding: EdgeInsets.zero,
                    activeThumbColor: AppTheme.brand,
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    value: _recommend,
                    onChanged: (value) {
                      setState(() => _recommend = value);
                      _setBool(_recommendKey, value);
                    },
                    title: const Text('个性化商品推荐',
                        style: TextStyle(fontSize: 14)),
                    subtitle: const Text('根据浏览记录推荐商品',
                        style: TextStyle(fontSize: 12)),
                    contentPadding: EdgeInsets.zero,
                    activeThumbColor: AppTheme.brand,
                  ),
                ]),
                const SizedBox(height: 12),
                _group('账号与数据', [
                  _tile('清除本地缓存', Icons.cleaning_services_outlined,
                      () => _clearCache(context, ref)),
                  const Divider(height: 1),
                  _tile('退出登录', Icons.logout_rounded, () => _logout(context, ref),
                      danger: true),
                ]),
                const SizedBox(height: 12),
                _group('关于', [
                  _tile('关于 ShopStack', Icons.info_outline_rounded,
                      () => _showAbout(context)),
                  const Divider(height: 1),
                  _tile('服务协议与隐私政策', Icons.description_outlined,
                      () => _showPolicy(context)),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _group(String title, List<Widget> children) {
    // 使用 Material 承载 ListTile 的水波纹效果，外层仅负责阴影。
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Material(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
              child: Text(
                title,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textTertiary),
              ),
            ),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _tile(
    String label,
    IconData icon,
    VoidCallback onTap, {
    bool danger = false,
  }) {
    final color = danger ? AppTheme.danger600 : AppTheme.textPrimary;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: danger ? AppTheme.danger600 : AppTheme.textSecondary),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(fontSize: 14, color: color)),
            const Spacer(),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: AppTheme.textTertiary),
          ],
        ),
      ),
    );
  }

  Future<void> _clearCache(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('清除本地缓存'),
        content: const Text('将清除本地令牌与搜索记录，并退出当前登录。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('清除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('shopstack_search_history');
    await ref.read(tokenStoreProvider).clear();
    await ref.read(authProvider.notifier).logout();
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('本地缓存已清除')));
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authProvider.notifier).logout();
  }

  void _showAbout(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('关于 ShopStack'),
        content: const Text(
          'ShopStack 是面向消费者的电商中台演示应用，'
          '覆盖商品浏览、购物车、结算、支付与订单全链路。\n\n'
          '当前版本：v1.0.0\n'
          '后端未连接时自动切换为内置演示数据。',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }

  void _showPolicy(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('服务协议与隐私政策'),
        content: const Text(
          '我们仅在必要范围内收集账号、地址与订单信息，'
          '并使用其完成下单、配送与售后等服务。\n\n'
          '你可以随时在「我的 - 设置」中清除本地数据或退出登录。',
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }
}
