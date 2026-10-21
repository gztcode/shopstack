import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/product.dart';
import '../../providers/catalog_provider.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/product_card.dart';
import '../../widgets/skeleton.dart';

/// 分类页：左侧一级分类导航，右侧商品网格。
class CategoryPage extends ConsumerStatefulWidget {
  const CategoryPage({super.key, this.initialCategoryId});

  final int? initialCategoryId;

  @override
  ConsumerState<CategoryPage> createState() => _CategoryPageState();
}

class _CategoryPageState extends ConsumerState<CategoryPage> {
  int? _categoryId;
  String _sort = 'default';
  int? _minPriceCents;
  int? _maxPriceCents;

  static const List<({String value, String label})> _sortOptions = [
    (value: 'default', label: '综合'),
    (value: 'sales', label: '销量'),
    (value: 'price_asc', label: '价格↑'),
    (value: 'price_desc', label: '价格↓'),
    (value: 'newest', label: '最新'),
  ];

  @override
  void initState() {
    super.initState();
    _categoryId = widget.initialCategoryId;
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    final filter = (
      categoryId: _categoryId,
      sort: _sort,
      minPriceCents: _minPriceCents,
      maxPriceCents: _maxPriceCents,
    );
    final products = ref.watch(filteredProductsProvider(filter));

    return Scaffold(
      appBar: AppBar(
        title: const Text('商品分类'),
        actions: [
          IconButton(
            tooltip: '重置筛选',
            onPressed: () => setState(() {
              _sort = 'default';
              _minPriceCents = null;
              _maxPriceCents = null;
            }),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: categories.when(
              data: (list) {
                final top = list.where((c) => c.parentId == 0).toList();
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _CategoryRail(
                      categories: top,
                      all: list,
                      selectedId: _categoryId,
                      onSelected: (id) => setState(() => _categoryId = id),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          _SortBar(
                            options: _sortOptions,
                            current: _sort,
                            onSelected: (value) => setState(() => _sort = value),
                            onFilter: _openPriceFilter,
                          ),
                          Expanded(
                            child: products.when(
                              data: (result) => result.items.isEmpty
                                  ? const EmptyState(
                                      title: '该分类暂无商品',
                                      subtitle: '试试切换其他分类或排序方式',
                                      icon: Icons.category_outlined,
                                    )
                                  : GridView.builder(
                                      padding: const EdgeInsets.fromLTRB(
                                          10, 10, 10, 16),
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
                                          onTap: () => _openProduct(product),
                                        );
                                      },
                                    ),
                              loading: () => GridView.builder(
                                padding: const EdgeInsets.all(10),
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  mainAxisSpacing: 10,
                                  crossAxisSpacing: 10,
                                  childAspectRatio: 0.62,
                                ),
                                itemCount: 4,
                                itemBuilder: (context, index) =>
                                    const ProductCardSkeleton(),
                              ),
                              error: (error, stack) => const EmptyState(
                                title: '加载失败',
                                subtitle: '请稍后重试',
                                icon: Icons.wifi_off_rounded,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const EmptyState(
                title: '分类加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openProduct(Product product) {
    context.push('/product/${product.id}');
  }

  Future<void> _openPriceFilter() async {
    final minController = TextEditingController(
      text: _minPriceCents == null ? '' : (_minPriceCents! / 100).toStringAsFixed(0),
    );
    final maxController = TextEditingController(
      text: _maxPriceCents == null ? '' : (_maxPriceCents! / 100).toStringAsFixed(0),
    );
    final result = await showModalBottomSheet<({int? min, int? max})>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('价格筛选', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: minController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: '最低价（元）'),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('~', style: TextStyle(color: AppTheme.textTertiary)),
                ),
                Expanded(
                  child: TextField(
                    controller: maxController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(hintText: '最高价（元）'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () {
                final min = int.tryParse(minController.text.trim());
                final max = int.tryParse(maxController.text.trim());
                Navigator.of(context).pop((
                  min: min == null ? null : min * 100,
                  max: max == null ? null : max * 100,
                ));
              },
              child: const Text('确定'),
            ),
          ],
        ),
      ),
    );
    minController.dispose();
    maxController.dispose();
    if (result == null) return;
    setState(() {
      _minPriceCents = result.min;
      _maxPriceCents = result.max;
    });
  }
}

/// 左侧分类导航。
class _CategoryRail extends StatelessWidget {
  const _CategoryRail({
    required this.categories,
    required this.all,
    required this.selectedId,
    required this.onSelected,
  });

  final List<Category> categories;
  final List<Category> all;
  final int? selectedId;
  final ValueChanged<int?> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 92,
      color: AppTheme.bgSubtle,
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _railItem('全部', null, selectedId == null),
          for (final category in categories) ...[
            _railItem(category.name, category.id, selectedId == category.id),
            for (final child
                in all.where((c) => c.parentId == category.id)) ...[
              _railItem(child.name, child.id, selectedId == child.id,
                  indent: true),
            ],
          ],
        ],
      ),
    );
  }

  Widget _railItem(String name, int? id, bool active, {bool indent = false}) {
    return GestureDetector(
      onTap: () => onSelected(id),
      child: Container(
        padding: EdgeInsets.only(
          left: indent ? 22 : 14,
          right: 8,
          top: 12,
          bottom: 12,
        ),
        decoration: BoxDecoration(
          color: active ? AppTheme.bgCard : Colors.transparent,
          borderRadius: const BorderRadius.horizontal(
            right: Radius.circular(AppTheme.radiusMd),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                color: active ? AppTheme.brand : AppTheme.textSecondary,
              ),
            ),
            if (active)
              Container(
                margin: const EdgeInsets.only(top: 6),
                width: 18,
                height: 3,
                decoration: BoxDecoration(
                  color: AppTheme.brand,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 排序栏。
class _SortBar extends StatelessWidget {
  const _SortBar({
    required this.options,
    required this.current,
    required this.onSelected,
    required this.onFilter,
  });

  final List<({String value, String label})> options;
  final String current;
  final ValueChanged<String> onSelected;
  final VoidCallback onFilter;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          bottom: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
        ),
      ),
      child: Row(
        children: [
          for (final option in options)
            Expanded(
              child: GestureDetector(
                onTap: () => onSelected(option.value),
                behavior: HitTestBehavior.opaque,
                child: Center(
                  child: Text(
                    option.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: current == option.value
                          ? FontWeight.w600
                          : FontWeight.w400,
                      color: current == option.value
                          ? AppTheme.brand
                          : AppTheme.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          GestureDetector(
            onTap: onFilter,
            child: Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Row(
                children: [
                  const Icon(Icons.filter_list_rounded,
                      size: 16, color: AppTheme.textSecondary),
                  const SizedBox(width: 2),
                  Text(
                    '筛选',
                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
