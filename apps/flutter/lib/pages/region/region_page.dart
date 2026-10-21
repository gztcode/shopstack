import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 收货地区页：展示行政区域列表，数据来自 `GET /api/v1/regions`。
class RegionPage extends ConsumerStatefulWidget {
  const RegionPage({super.key, this.parentId = 0, this.title = '收货地区'});

  /// 上级区域 id，0 表示省级列表。
  final int parentId;

  /// 页面标题。
  final String title;

  @override
  ConsumerState<RegionPage> createState() => _RegionPageState();
}

class _RegionPageState extends ConsumerState<RegionPage> {
  int _parentId = 0;
  String _selectedName = '';

  @override
  void initState() {
    super.initState();
    _parentId = widget.parentId;
  }

  @override
  Widget build(BuildContext context) {
    final regions = ref.watch(regionsProvider(_parentId));
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: regions.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无地区数据',
                    subtitle: '返回上级列表重新选择',
                    icon: Icons.map_outlined,
                    actionText: '返回省级列表',
                    onAction: () => setState(() => _parentId = 0),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final region = list[index];
                    return _RegionTile(
                      region: region,
                      onTap: () => _onTap(region),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '地区加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(regionsProvider(_parentId)),
              ),
            ),
          ),
          if (_selectedName.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                border: Border(
                  top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '已选择：$_selectedName',
                      style: const TextStyle(
                          fontSize: 14, color: AppTheme.textPrimary),
                    ),
                  ),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop(_selectedName),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(96, 42),
                    ),
                    child: const Text('确定'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _onTap(Region region) {
    if (region.level == 1) {
      setState(() {
        _parentId = region.id;
        _selectedName = region.name;
      });
    } else {
      setState(() => _selectedName = region.name);
    }
  }
}

/// 地区条目。
class _RegionTile extends StatelessWidget {
  const _RegionTile({required this.region, required this.onTap});

  final Region region;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  region.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '编码 ${region.code}',
                  style: const TextStyle(
                      fontSize: 11, color: AppTheme.textTertiary),
                ),
              ],
            ),
          ),
          Text(
            region.level == 1 ? '查看下级' : '选择',
            style: const TextStyle(fontSize: 12, color: AppTheme.brand),
          ),
          const Icon(Icons.chevron_right_rounded,
              size: 16, color: AppTheme.textTertiary),
        ],
      ),
    );
  }
}
