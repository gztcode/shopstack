import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/product.dart';
import 'core_providers.dart';

/// 商品分类（含二级）。
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  try {
    return await ref.read(productApiProvider).categories();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return <Category>[...MockData.topCategories, ...MockData.subCategories];
  }
});

/// 一级分类。
final topCategoriesProvider = FutureProvider<List<Category>>((ref) async {
  final all = await ref.watch(categoriesProvider.future);
  return all.where((category) => category.parentId == 0).toList();
});

/// 轮播图。
final bannersProvider = FutureProvider<List<Banner>>((ref) async {
  try {
    return await ref.read(productApiProvider).banners();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockData.banners;
  }
});

/// 首页推荐商品。
final recommendProductsProvider = FutureProvider<PagedResult<Product>>(
    (ref) async {
  try {
    return await ref
        .read(productApiProvider)
        .listProducts(page: 1, pageSize: 10, sort: 'sales');
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockStore.instance.products(sort: 'sales');
    return PagedResult<Product>(
      items: list,
      meta: PageMeta(page: 1, pageSize: list.length, total: list.length, totalPages: 1),
    );
  }
});

/// 秒杀 / 促销商品。
final flashSaleProductsProvider = FutureProvider<List<Product>>((ref) async {
  try {
    final result = await ref
        .read(productApiProvider)
        .listProducts(page: 1, pageSize: 6, sort: 'newest');
    return result.items;
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.products(sort: 'newest').take(6).toList();
  }
});

/// 商品详情。
final productDetailProvider =
    FutureProvider.family<ProductDetail, int>((ref, id) async {
  try {
    return await ref.read(productApiProvider).productDetail(id);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.productDetail(id);
  }
});

/// 评价数据（列表 + 汇总）。
class ProductReviewsData {
  const ProductReviewsData(this.reviews, this.summary);

  final List<Review> reviews;
  final ReviewSummary summary;
}

final productReviewsProvider =
    FutureProvider.family<ProductReviewsData, int>((ref, productId) async {
  try {
    final result = await ref
        .read(productApiProvider)
        .reviews(productId: productId, pageSize: 20);
    return ProductReviewsData(result.$1, result.$2);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final reviews =
        MockData.reviews.where((r) => r.productId == productId).toList();
    final good = reviews.where((r) => r.rating >= 4).length;
    final medium = reviews.where((r) => r.rating == 3).length;
    final bad = reviews.where((r) => r.rating <= 2).length;
    final average = reviews.isEmpty
        ? 0.0
        : reviews.map((r) => r.rating).reduce((a, b) => a + b) /
            reviews.length;
    return ProductReviewsData(
      reviews,
      ReviewSummary(
        total: reviews.length,
        good: good,
        medium: medium,
        bad: bad,
        average: average,
      ),
    );
  }
});

/// 商品筛选条件（使用 record 作为 family key，结构化相等）。
typedef ProductFilter = ({
  int? categoryId,
  String sort,
  int? minPriceCents,
  int? maxPriceCents,
});

/// 按条件筛选商品列表。
final filteredProductsProvider =
    FutureProvider.family<PagedResult<Product>, ProductFilter>((ref, filter) async {
  try {
    return await ref.read(productApiProvider).listProducts(
          categoryId: filter.categoryId,
          sort: filter.sort,
          minPriceCents: filter.minPriceCents,
          maxPriceCents: filter.maxPriceCents,
          pageSize: 50,
        );
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockStore.instance.products(
      categoryId: filter.categoryId,
      sort: filter.sort,
      minPriceCents: filter.minPriceCents,
      maxPriceCents: filter.maxPriceCents,
    );
    return PagedResult<Product>(
      items: list,
      meta: PageMeta(page: 1, pageSize: list.length, total: list.length, totalPages: 1),
    );
  }
});

/// 搜索结果。
final searchProductsProvider =
    FutureProvider.family<PagedResult<Product>, String>((ref, keyword) async {
  try {
    return await ref
        .read(productApiProvider)
        .listProducts(keyword: keyword, pageSize: 30);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockStore.instance.products(keyword: keyword);
    return PagedResult<Product>(
      items: list,
      meta: PageMeta(page: 1, pageSize: list.length, total: list.length, totalPages: 1),
    );
  }
});
