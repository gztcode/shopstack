import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 频道列表页：展示全部频道入口，数据来自 `GET /api/v1/channels`。
class ChannelListPage extends ConsumerWidget {
  const ChannelListPage({super.key});

  /// 频道维度与路由的对应关系。
  static const Map<String, String> _routes = <String, String>{
    'recommend': '/channel/recommend',
    'newest': '/channel/newest',
    'hot': '/channel/hot',
    'flash': '/channel/flash',
    'presale': '/channel/presale',
    'clearance': '/channel/clearance',
    'freeship': '/channel/freeship',
    'cross': '/channel/cross',
    'fresh': '/channel/fresh',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channels = ref.watch(channelsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('全部频道')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: channels.when(
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    title: '暂无频道',
                    subtitle: '商家尚未配置频道，先去逛逛首页商品',
                    icon: Icons.grid_view_outlined,
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 1.7,
                  ),
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    final channel = list[index];
                    final route = _routes[channel.code];
                    return AppCard(
                      onTap: route == null ? null : () => context.push(route),
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: AppTheme.brand50,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusMd),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.explore_outlined,
                                color: AppTheme.brand, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  channel.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  channel.description.isEmpty
                                      ? '${channel.productCount} 件商品'
                                      : channel.description,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.textTertiary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '频道加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(channelsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
