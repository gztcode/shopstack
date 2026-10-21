import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme/app_theme.dart';
import '../models/expansion.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/catalog_provider.dart';
import '../providers/expansion_providers.dart';
import '../widgets/app_card.dart';
import '../widgets/demo_banner.dart';
import '../widgets/empty_state.dart';
import '../widgets/product_card.dart';

/// 频道商品页的共享实现。
///
/// 10 个频道页（推荐 / 新品 / 热销 / 限时 / 预售 / 清仓 / 包邮 / 跨境 / 生鲜）
/// 共用本组件，仅通过 [channelType] 与标题区分，数据来自
/// `GET /api/v1/channels/{id}/products`。
class ChannelProductsView extends ConsumerWidget {
  const ChannelProductsView({
    super.key,
    required this.title,
    required this.channelType,
    this.channelId,
  });

  /// 页面标题。
  final String title;

  /// 频道维度：recommend / newest / hot / flash / presale / clearance /
  /// freeship / cross / fresh。
  final String channelType;

  /// 可选的频道 id；为空时按 [channelType] 自动匹配频道列表。
  final int? channelId;

  /// 演示数据下的默认频道 id。
  static const Map<String, int> _defaultChannelIds = <String, int>{
    'recommend': 101,
    'newest': 102,
    'hot': 103,
    'flash': 104,
    'presale': 105,
    'clearance': 106,
    'freeship': 107,
    'cross': 108,
    'fresh': 109,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channels = ref.watch(channelsProvider);
    final matched = _findChannel(channels.asData?.value, channelType);
    final resolvedId = channelId ??
        matched?.id ??
        (_defaultChannelIds[channelType] ?? 101);

    final products =
        ref.watch(channelProductsProvider((channelId: resolvedId, channelType: channelType)));

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Column(
        children: [
          const DemoBanner(),
          _ChannelHeader(
            channel: matched ??
                Channel(
                  id: resolvedId,
                  name: title,
                  code: channelType,
                ),
          ),
          Expanded(
            child: products.when(
              data: (result) {
                if (result.items.isEmpty) {
                  return EmptyState(
                    title: '该频道暂时没有商品',
                    subtitle: '换个频道看看，或去首页发现更多好物',
                    icon: Icons.local_mall_outlined,
                    actionText: '去首页看看',
                    onAction: () => context.go('/home'),
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    childAspectRatio: 0.62,
                  ),
                  itemCount: result.items.length,
                  itemBuilder: (context, index) {
                    final product = result.items[index];
                    return ProductCard(
                      product: product,
                      onTap: () => context.push('/product/${product.id}'),
                      onAddToCart: () => _addToCart(context, ref, product.id),
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
                onAction: () => ref.invalidate(
                  channelProductsProvider(
                      (channelId: resolvedId, channelType: channelType)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addToCart(
      BuildContext context, WidgetRef ref, int productId) async {
    final detail = ref.read(productDetailProvider(productId));
    final skus = detail.asData?.value.skus ?? const <ProductSku>[];
    final skuId = skus.isEmpty ? 0 : skus.first.id;
    final ok = await ref
        .read(cartProvider.notifier)
        .addToCart(productId: productId, skuId: skuId, quantity: 1);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? '已加入购物车' : '加入购物车失败')),
    );
  }
}

/// 按频道维度查找频道。
Channel? _findChannel(List<Channel>? channels, String code) {
  if (channels == null) return null;
  for (final channel in channels) {
    if (channel.code == code) return channel;
  }
  return null;
}

/// 频道头部信息条。
class _ChannelHeader extends StatelessWidget {
  const _ChannelHeader({required this.channel});

  final Channel channel;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.brand50,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.explore_outlined,
                color: AppTheme.brand, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  channel.name.isEmpty ? '精选频道' : channel.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  channel.description.isEmpty
                      ? '平台精选商品，随时更新'
                      : channel.description,
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textTertiary),
                ),
              ],
            ),
          ),
          if (channel.productCount > 0)
            StatusTag(text: '${channel.productCount} 件商品'),
        ],
      ),
    );
  }
}
