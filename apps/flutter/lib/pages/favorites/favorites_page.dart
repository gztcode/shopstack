import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/user_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 我的收藏页。
class FavoritesPage extends ConsumerWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('我的收藏')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: favorites.when(
              data: (result) {
                if (result.products.isEmpty) {
                  return const EmptyState(
                    title: '还没有收藏商品',
                    subtitle: '在商品详情页点击收藏即可加入',
                    icon: Icons.favorite_border_rounded,
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                  itemCount: result.products.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = result.products[index];
                    return AppCard(
                      padding: const EdgeInsets.all(10),
                      child: Row(
                        children: [
                          AppImage(
                            url: item.cover,
                            width: 72,
                            height: 72,
                            radius: AppTheme.radiusMd,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  Money.formatYuanWithSymbol(item.priceCents),
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.danger,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push('/product/${item.productId}'),
                            child: const Text('查看'),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const EmptyState(
                title: '收藏加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
