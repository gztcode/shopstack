import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/checkout_args.dart';
import '../../models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';
import '../../providers/user_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';
import '../../widgets/product_card.dart';
import '../../widgets/quantity_stepper.dart';
import '../../widgets/skeleton.dart';

/// 商品详情页。
class ProductDetailPage extends ConsumerStatefulWidget {
  const ProductDetailPage({super.key, required this.productId});

  final int productId;

  @override
  ConsumerState<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends ConsumerState<ProductDetailPage> {
  final Map<String, String> _selection = <String, String>{};
  int _quantity = 1;
  int _galleryIndex = 0;
  bool _favorited = false;

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(productDetailProvider(widget.productId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('商品详情'),
        actions: [
          IconButton(
            tooltip: '首页',
            onPressed: () => context.go('/home'),
            icon: const Icon(Icons.home_outlined),
          ),
        ],
      ),
      body: detailAsync.when(
        data: (detail) => Column(
          children: [
            const DemoBanner(),
            Expanded(
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: _Gallery(
                      images: detail.gallery,
                      index: _galleryIndex,
                      onChanged: (value) =>
                          setState(() => _galleryIndex = value),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: _PriceBlock(detail: detail),
                  ),
                  SliverToBoxAdapter(
                    child: _SkuSection(
                      detail: detail,
                      selection: _selection,
                      quantity: _quantity,
                      onSelect: _selectSpec,
                      onQuantityChanged: (value) =>
                          setState(() => _quantity = value),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: _AttributeSection(attributes: detail.attributes),
                  ),
                  SliverToBoxAdapter(
                    child: _ReviewSection(productId: widget.productId),
                  ),
                  SliverToBoxAdapter(
                    child: _RelatedSection(products: detail.related),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 16)),
                ],
              ),
            ),
          ],
        ),
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(height: 260, radius: 14),
              SizedBox(height: 16),
              SkeletonBox(height: 22, width: 180),
              SizedBox(height: 12),
              SkeletonBox(height: 16, width: 240),
              SizedBox(height: 16),
              SkeletonBox(height: 90, radius: 14),
            ],
          ),
        ),
        error: (error, stack) => EmptyState(
          title: '商品加载失败',
          subtitle: '请检查网络后重试',
          icon: Icons.wifi_off_rounded,
          actionText: '重新加载',
          onAction: () => ref.invalidate(productDetailProvider(widget.productId)),
        ),
      ),
      bottomNavigationBar: detailAsync.maybeWhen(
        data: (detail) => _BottomBar(
          detail: detail,
          quantity: _quantity,
          favorited: _favorited,
          onToggleFavorite: _toggleFavorite,
          onAddToCart: () => _addToCart(detail),
          onBuyNow: () => _buyNow(detail),
        ),
        orElse: () => null,
      ),
    );
  }

  void _selectSpec(String key, String value) {
    setState(() {
      if (_selection[key] == value) {
        _selection.remove(key);
      } else {
        _selection[key] = value;
      }
    });
  }

  Future<void> _toggleFavorite() async {
    final favorited = await ref
        .read(userActionsProvider)
        .toggleFavorite(widget.productId);
    if (!mounted) return;
    setState(() => _favorited = favorited);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(favorited ? '已加入收藏' : '已取消收藏')),
    );
  }

  Future<void> _addToCart(ProductDetail detail) async {
    final sku = _currentSku(detail);
    if (sku == null) {
      _showMessage('请选择商品规格');
      return;
    }
    if (sku.stock < _quantity) {
      _showMessage('库存不足，仅剩 ${sku.stock} 件');
      return;
    }
    await ref.read(cartProvider.notifier).addToCart(
          productId: detail.product.id,
          skuId: sku.id,
          quantity: _quantity,
        );
    if (!mounted) return;
    _showMessage('已加入购物车');
  }

  void _buyNow(ProductDetail detail) {
    final sku = _currentSku(detail);
    if (sku == null) {
      _showMessage('请选择商品规格');
      return;
    }
    if (sku.stock < _quantity) {
      _showMessage('库存不足，仅剩 ${sku.stock} 件');
      return;
    }
    context.push('/checkout', extra: CheckoutArgs.single(
          productId: detail.product.id,
          skuId: sku.id,
          quantity: _quantity,
        ));
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  /// 根据已选规格定位 SKU。
  ProductSku? _currentSku(ProductDetail detail) {
    if (detail.skus.isEmpty) return null;
    if (_selection.isEmpty) return detail.skus.first;
    for (final sku in detail.skus) {
      var matched = true;
      for (final entry in _selection.entries) {
        if (sku.specs[entry.key] != entry.value) {
          matched = false;
          break;
        }
      }
      if (matched) return sku;
    }
    return null;
  }
}

/// 图片轮播。
class _Gallery extends StatelessWidget {
  const _Gallery({
    required this.images,
    required this.index,
    required this.onChanged,
  });

  final List<String> images;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) {
      return const SizedBox(
        height: 260,
        child: Center(child: Icon(Icons.image_not_supported_outlined)),
      );
    }
    return Column(
      children: [
        SizedBox(
          height: 280,
          child: PageView.builder(
            itemCount: images.length,
            onPageChanged: onChanged,
            itemBuilder: (context, i) => AppImage(
              url: images[i],
              width: double.infinity,
              height: double.infinity,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(images.length, (i) {
              final active = i == index;
              return Container(
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

/// 价格与标题区。
class _PriceBlock extends StatelessWidget {
  const _PriceBlock({required this.detail});

  final ProductDetail detail;

  @override
  Widget build(BuildContext context) {
    final product = detail.product;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              PriceText(cents: product.minPriceCents, size: 26),
              if (product.hasDiscount) ...[
                const SizedBox(width: 8),
                OriginalPriceText(cents: product.maxPriceCents, size: 13),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Text(
            product.title,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
              height: 1.4,
            ),
          ),
          if (product.subtitle.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              product.subtitle,
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Text(
                '已售 ${SalesFormatter.format(product.salesCount)}',
                style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
              ),
              const SizedBox(width: 14),
              Text(
                '库存 ${product.stockTotal}',
                style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
              ),
              if (product.categoryName.isNotEmpty) ...[
                const SizedBox(width: 14),
                Text(
                  product.categoryName,
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                ),
              ],
            ],
          ),
          if (product.tags.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: product.tags
                  .map((tag) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.brand50,
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusSm),
                        ),
                        child: Text(
                          tag,
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.brand600),
                        ),
                      ))
                  .toList(),
            ),
          ],
        ],
      ),
    );
  }
}

/// 规格选择区。
class _SkuSection extends StatelessWidget {
  const _SkuSection({
    required this.detail,
    required this.selection,
    required this.quantity,
    required this.onSelect,
    required this.onQuantityChanged,
  });

  final ProductDetail detail;
  final Map<String, String> selection;
  final int quantity;
  final void Function(String key, String value) onSelect;
  final ValueChanged<int> onQuantityChanged;

  @override
  Widget build(BuildContext context) {
    final keys = detail.specKeys;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final key in keys) ...[
            Text(
              key,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _valuesOf(detail, key)
                  .map((value) {
                final active = selection[key] == value;
                return GestureDetector(
                  onTap: () => onSelect(key, value),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: active ? AppTheme.brand50 : AppTheme.bgMuted,
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusSm),
                      border: Border.all(
                        color: active ? AppTheme.brand : Colors.transparent,
                        width: 1.2,
                      ),
                    ),
                    child: Text(
                      value,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            active ? FontWeight.w600 : FontWeight.w400,
                        color: active ? AppTheme.brand : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                );
              })
              .toList(),
            ),
            const SizedBox(height: 14),
          ],
          Row(
            children: [
              Text(
                '数量',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(width: 16),
              QuantityStepper(
                value: quantity,
                max: _maxStock(detail),
                onChanged: onQuantityChanged,
              ),
              const Spacer(),
              Text(
                '库存 ${_stockOf(detail)}',
                style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
              ),
            ],
          ),
          if (detail.product.description.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              detail.product.description,
              style: TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary,
                height: 1.6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  List<String> _valuesOf(ProductDetail detail, String key) {
    final values = <String>[];
    for (final sku in detail.skus) {
      final value = sku.specs[key];
      if (value != null && !values.contains(value)) values.add(value);
    }
    return values;
  }

  int _maxStock(ProductDetail detail) {
    final stock = _stockOf(detail);
    return stock <= 0 ? 1 : stock;
  }

  int _stockOf(ProductDetail detail) {
    if (selection.isEmpty) {
      return detail.skus.isEmpty ? 0 : detail.skus.first.stock;
    }
    for (final sku in detail.skus) {
      var matched = true;
      for (final entry in selection.entries) {
        if (sku.specs[entry.key] != entry.value) {
          matched = false;
          break;
        }
      }
      if (matched) return sku.stock;
    }
    return 0;
  }
}

/// 商品参数。
class _AttributeSection extends StatelessWidget {
  const _AttributeSection({required this.attributes});

  final List<ProductAttribute> attributes;

  @override
  Widget build(BuildContext context) {
    if (attributes.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '商品参数',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          for (final attribute in attributes)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 74,
                    child: Text(
                      attribute.name,
                      style: TextStyle(
                          fontSize: 13, color: AppTheme.textTertiary),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      attribute.value,
                      style: TextStyle(
                          fontSize: 13, color: AppTheme.textPrimary),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 评价区。
class _ReviewSection extends ConsumerWidget {
  const _ReviewSection({required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviews = ref.watch(productReviewsProvider(productId));
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: reviews.when(
        data: (data) {
          final summary = data.summary;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '用户评价',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${summary.total} 条评价',
                    style: TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Column(
                    children: [
                      Text(
                        summary.average.toStringAsFixed(1),
                        style: TextStyle(
                          fontSize: 30,
                          height: 1.1,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.accent600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      _Stars(rating: summary.average.round()),
                    ],
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      children: [
                        _RatingBar(
                            label: '好评', count: summary.good, total: summary.total),
                        const SizedBox(height: 6),
                        _RatingBar(
                            label: '中评',
                            count: summary.medium,
                            total: summary.total),
                        const SizedBox(height: 6),
                        _RatingBar(
                            label: '差评', count: summary.bad, total: summary.total),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (data.reviews.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    '暂无评价，快来抢首评吧',
                    style: TextStyle(
                        fontSize: 13, color: AppTheme.textTertiary),
                  ),
                )
              else
                for (final review in data.reviews) _ReviewTile(review: review),
            ],
          );
        },
        loading: () => const SkeletonBox(height: 120, radius: 10),
        error: (error, stack) => Text(
          '评价加载失败',
          style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
        ),
      ),
    );
  }
}

class _RatingBar extends StatelessWidget {
  const _RatingBar({
    required this.label,
    required this.count,
    required this.total,
  });

  final String label;
  final int count;
  final int total;

  @override
  Widget build(BuildContext context) {
    final ratio = total == 0 ? 0.0 : count / total;
    return Row(
      children: [
        SizedBox(
          width: 30,
          child: Text(
            label,
            style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 6,
              backgroundColor: AppTheme.bgMuted,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accent500),
            ),
          ),
        ),
        SizedBox(
          width: 34,
          child: Text(
            '$count',
            textAlign: TextAlign.right,
            style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
          ),
        ),
      ],
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});

  final Review review;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.borderSubtle, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppTheme.brand50,
                child: Text(
                  review.userNickname.isEmpty
                      ? '匿'
                      : review.userNickname.characters.first,
                  style: TextStyle(
                      fontSize: 12, color: AppTheme.brand600),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                review.userNickname.isEmpty ? '匿名用户' : review.userNickname,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary),
              ),
              const SizedBox(width: 8),
              _Stars(rating: review.rating),
              const Spacer(),
              Text(
                DateFormatter.relative(review.createdAt),
                style: TextStyle(fontSize: 11, color: AppTheme.textTertiary),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            review.content,
            style: TextStyle(
                fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
          ),
          if (review.skuText.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '规格：${review.skuText}',
              style: TextStyle(fontSize: 11, color: AppTheme.textTertiary),
            ),
          ],
        ],
      ),
    );
  }
}

/// 星级展示。
class _Stars extends StatelessWidget {
  const _Stars({required this.rating});

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        return Icon(
          index < rating ? Icons.star_rounded : Icons.star_outline_rounded,
          size: 14,
          color: AppTheme.accent500,
        );
      }),
    );
  }
}

/// 相关推荐。
class _RelatedSection extends StatelessWidget {
  const _RelatedSection({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '相关推荐',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.62,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) {
              final product = products[index];
              return ProductCard(
                product: product,
                onTap: () => context.push('/product/${product.id}'),
              );
            },
          ),
        ],
      ),
    );
  }
}

/// 底部操作栏。
class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.detail,
    required this.quantity,
    required this.favorited,
    required this.onToggleFavorite,
    required this.onAddToCart,
    required this.onBuyNow,
  });

  final ProductDetail detail;
  final int quantity;
  final bool favorited;
  final VoidCallback onToggleFavorite;
  final VoidCallback onAddToCart;
  final VoidCallback onBuyNow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        10 + MediaQuery.of(context).padding.bottom * 0.2,
      ),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            _iconButton(
              icon: Icons.support_agent_rounded,
              label: '客服',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('客服工作时间 9:00 - 21:00')),
              ),
            ),
            _iconButton(
              icon: favorited
                  ? Icons.favorite_rounded
                  : Icons.favorite_border_rounded,
              label: '收藏',
              color: favorited ? AppTheme.danger : null,
              onTap: onToggleFavorite,
            ),
            Expanded(
              child: OutlinedButton(
                onPressed: onAddToCart,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.brand,
                  side: const BorderSide(color: AppTheme.brand),
                  minimumSize: const Size.fromHeight(42),
                ),
                child: const Text('加入购物车'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton(
                onPressed: onBuyNow,
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.accent500,
                  minimumSize: const Size.fromHeight(42),
                ),
                child: const Text('立即购买'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 46,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: color ?? AppTheme.textSecondary),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color ?? AppTheme.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
