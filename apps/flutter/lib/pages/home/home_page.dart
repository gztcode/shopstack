import 'dart:async';

import 'package:flutter/material.dart' hide Banner;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';
import '../../providers/user_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';
import '../../widgets/product_card.dart';
import '../../widgets/skeleton.dart';

/// 首页。
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cartProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final banners = ref.watch(bannersProvider);
    final categories = ref.watch(topCategoriesProvider);
    final flash = ref.watch(flashSaleProductsProvider);
    final recommend = ref.watch(recommendProductsProvider);
    final unread = ref.watch(unreadCountProvider);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            const Icon(Icons.location_on_outlined,
                size: 18, color: AppTheme.brand),
            const SizedBox(width: 2),
            Text(
              '杭州',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const Icon(Icons.expand_more_rounded,
                size: 16, color: AppTheme.textTertiary),
          ],
        ),
        actions: [
          IconButton(
            tooltip: '消息通知',
            onPressed: () => context.push(AppRoutes.notifications),
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.brand,
              onRefresh: () async {
                ref.invalidate(bannersProvider);
                ref.invalidate(recommendProductsProvider);
                ref.invalidate(flashSaleProductsProvider);
                ref.invalidate(topCategoriesProvider);
                await ref.read(cartProvider.notifier).load();
              },
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                      child: _SearchEntry(
                        onTap: () => context.push(AppRoutes.search),
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: banners.when(
                      data: (list) => list.isEmpty
                          ? const SizedBox.shrink()
                          : _BannerCarousel(banners: list),
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: SkeletonBox(height: 160, radius: 14),
                      ),
                      error: (error, stack) => const SizedBox.shrink(),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: categories.when(
                      data: (list) => list.isEmpty
                          ? const SizedBox.shrink()
                          : _CategoryEntries(categories: list),
                      loading: () => const SizedBox(height: 90),
                      error: (error, stack) => const SizedBox.shrink(),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: flash.when(
                      data: (list) => list.isEmpty
                          ? const SizedBox.shrink()
                          : _FlashSaleSection(products: list),
                      loading: () => const SizedBox(height: 180),
                      error: (error, stack) => const SizedBox.shrink(),
                    ),
                  ),
                  const SliverToBoxAdapter(
                    child: SectionHeader(title: '推荐商品', subtitle: '为你优选'),
                  ),
                  recommend.when(
                    data: (result) => result.items.isEmpty
                        ? const SliverToBoxAdapter(
                            child: EmptyState(
                              title: '暂无推荐商品',
                              subtitle: '换个时间再来看看吧',
                              icon: Icons.local_mall_outlined,
                            ),
                          )
                        : SliverPadding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                            sliver: SliverGrid(
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                mainAxisSpacing: 12,
                                crossAxisSpacing: 12,
                                childAspectRatio: 0.62,
                              ),
                              delegate: SliverChildBuilderDelegate(
                                (context, index) {
                                  final product = result.items[index];
                                  return ProductCard(
                                    product: product,
                                    onTap: () =>
                                        context.push('/product/${product.id}'),
                                    onAddToCart: () => _addToCart(product),
                                  );
                                },
                                childCount: result.items.length,
                              ),
                            ),
                          ),
                    loading: () => SliverPadding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.62,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => const ProductCardSkeleton(),
                          childCount: 4,
                        ),
                      ),
                    ),
                    error: (error, stack) => const SliverToBoxAdapter(
                      child: EmptyState(
                        title: '加载失败',
                        subtitle: '请下拉重试',
                        icon: Icons.wifi_off_rounded,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addToCart(Product product) async {
    final detail = await ref.read(productDetailProvider(product.id).future);
    if (!mounted) return;
    if (detail.skus.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('该商品暂无可选规格')),
      );
      return;
    }
    await ref.read(cartProvider.notifier).addToCart(
          productId: product.id,
          skuId: detail.skus.first.id,
          quantity: 1,
        );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('已将「${product.title}」加入购物车')),
    );
  }
}

/// 顶部搜索入口。
class _SearchEntry extends StatelessWidget {
  const _SearchEntry({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppTheme.bgMuted,
          borderRadius: BorderRadius.circular(AppTheme.radiusPill),
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, size: 18, color: AppTheme.textTertiary),
            const SizedBox(width: 6),
            Text(
              '搜索商品、品牌',
              style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
            ),
          ],
        ),
      ),
    );
  }
}

/// 轮播图。
class _BannerCarousel extends StatefulWidget {
  const _BannerCarousel({required this.banners});

  final List<Banner> banners;

  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  final PageController _controller = PageController(viewportFraction: 0.92);
  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || widget.banners.isEmpty) return;
      final next = (_index + 1) % widget.banners.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 164,
          child: PageView.builder(
            controller: _controller,
            itemCount: widget.banners.length,
            onPageChanged: (index) => setState(() => _index = index),
            itemBuilder: (context, index) {
              final banner = widget.banners[index];
              return Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 6, 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                  child: AppImage(
                    url: banner.image,
                    width: double.infinity,
                    height: double.infinity,
                    icon: Icons.campaign_outlined,
                  ),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.banners.length, (index) {
              final active = index == _index;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: active ? 16 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? AppTheme.brand : AppTheme.borderDefault,
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }
}

/// 分类快捷入口。
class _CategoryEntries extends StatelessWidget {
  const _CategoryEntries({required this.categories});

  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 96,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final category = categories[index];
          return GestureDetector(
            onTap: () => context.go(AppRoutes.category, extra: category.id),
            child: SizedBox(
              width: 58,
              child: Column(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppTheme.brand50,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      category.icon.isEmpty ? '🛍' : category.icon,
                      style: const TextStyle(fontSize: 22),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    category.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// 限时秒杀模块。
class _FlashSaleSection extends StatefulWidget {
  const _FlashSaleSection({required this.products});

  final List<Product> products;

  @override
  State<_FlashSaleSection> createState() => _FlashSaleSectionState();
}

class _FlashSaleSectionState extends State<_FlashSaleSection> {
  late Duration _remain = _untilMidnight();
  Timer? _timer;

  static Duration _untilMidnight() {
    final now = DateTime.now();
    final end = DateTime(now.year, now.month, now.day + 1);
    return end.difference(now);
  }

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _remain = _untilMidnight());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hours = _remain.inHours.toString().padLeft(2, '0');
    final minutes = (_remain.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (_remain.inSeconds % 60).toString().padLeft(2, '0');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
          child: Row(
            children: [
              Icon(Icons.bolt_rounded, size: 18, color: AppTheme.accent600),
              const SizedBox(width: 4),
              Text(
                '限时秒杀',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '距结束 $hours:$minutes:$seconds',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.accent600,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 196,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            scrollDirection: Axis.horizontal,
            itemCount: widget.products.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final product = widget.products[index];
              return GestureDetector(
                onTap: () => context.push('/product/${product.id}'),
                child: Container(
                  width: 116,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    boxShadow: AppTheme.shadowSm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusMd),
                        child: AppImage(
                          url: product.cover,
                          width: 100,
                          height: 100,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        product.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      PriceText(cents: product.minPriceCents, size: 15),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
