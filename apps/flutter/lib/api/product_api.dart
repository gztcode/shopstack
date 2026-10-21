import '../models/common.dart';
import '../models/expansion.dart';
import '../models/product.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 商品、分类、轮播、评价接口。
class ProductApi {
  ProductApi(this.client);

  final ApiClient client;

  /// 商品列表。
  Future<PagedResult<Product>> listProducts({
    int page = 1,
    int pageSize = 20,
    String? keyword,
    int? categoryId,
    int? status,
    int? minPriceCents,
    int? maxPriceCents,
    String? sort,
    bool? onlyInStock,
  }) async {
    final keywordParam =
        (keyword == null || keyword.isEmpty) ? null : keyword;
    final sortParam = (sort == null || sort.isEmpty) ? null : sort;
    final data = await client.get('/products', query: {
      'page.page': page,
      'page.page_size': pageSize,
      'keyword': ?keywordParam,
      'category_id': ?categoryId,
      'status': ?status,
      'min_price_cents': ?minPriceCents,
      'max_price_cents': ?maxPriceCents,
      'sort': ?sortParam,
      'only_in_stock': ?onlyInStock,
    });
    return PagedResult<Product>(
      items: JsonUtil.asMapList(data['products']).map(Product.fromJson).toList(),
      meta: PageMeta.fromJson(JsonUtil.asMap(data['meta'])),
    );
  }

  /// 商品详情。
  Future<ProductDetail> productDetail(int id) async {
    final data = await client.get('/products/$id');
    return ProductDetail.fromJson(data);
  }

  /// 分类列表。
  Future<List<Category>> categories({int parentId = 0, bool tree = true}) async {
    final data = await client.get('/categories', query: {
      'parent_id': parentId,
      'tree': tree,
    });
    return JsonUtil.asMapList(data['categories']).map(Category.fromJson).toList();
  }

  /// 轮播图列表。
  Future<List<Banner>> banners({String position = 'home_banner'}) async {
    final data = await client.get('/banners', query: {'position': position});
    return JsonUtil.asMapList(data['banners']).map(Banner.fromJson).toList();
  }

  /// 评价列表与汇总。
  Future<(List<Review>, ReviewSummary, PageMeta)> reviews({
    int? productId,
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/reviews', query: {
      'product_id': ?productId,
      'page.page': page,
      'page.page_size': pageSize,
    });
    final list = JsonUtil.asMapList(data['reviews']).map(Review.fromJson).toList();
    final summary = ReviewSummary.fromJson(JsonUtil.asMap(data['summary']));
    final meta = PageMeta.fromJson(JsonUtil.asMap(data['meta']));
    return (list, summary, meta);
  }

  /// 发表评价。
  Future<Review> createReview({
    required int productId,
    required int skuId,
    required int rating,
    required String content,
    List<String> images = const <String>[],
  }) async {
    final data = await client.post('/reviews', body: {
      'product_id': productId,
      'sku_id': skuId,
      'rating': rating,
      'content': content,
      'images': images,
    });
    return Review.fromJson(data);
  }

  /// 频道列表。
  Future<List<Channel>> channels() async {
    final data = await client.get('/channels');
    return JsonUtil.asMapList(data['channels']).map(Channel.fromJson).toList();
  }

  /// 频道商品列表。[channelType] 对应频道的筛选维度
  /// （recommend / newest / hot / flash / presale / clearance / freeship /
  /// cross / fresh）。
  Future<PagedResult<Product>> channelProducts({
    required int channelId,
    required String channelType,
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/channels/$channelId/products', query: {
      'channel_type': channelType,
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PagedResult<Product>(
      items: JsonUtil.asMapList(data['products']).map(Product.fromJson).toList(),
      meta: PageMeta.fromJson(JsonUtil.asMap(data['meta'])),
    );
  }

  /// 商品参数。
  Future<List<ProductParam>> productParams(int productId) async {
    final data = await client.get('/products/$productId/params');
    return JsonUtil.asMapList(data['params']).map(ProductParam.fromJson).toList();
  }

  /// 商品问答。
  Future<List<ProductQuestion>> productQuestions(int productId) async {
    final data = await client.get('/products/$productId/questions', query: {
      'page.page': 1,
      'page.page_size': 100,
    });
    return JsonUtil.asMapList(data['questions'])
        .map(ProductQuestion.fromJson)
        .toList();
  }

  /// 评价列表。
  ///
  /// 后端 `/api/v1/reviews` 只支持 `product_id` 与分页参数，
  /// 好评 / 中评 / 差评 / 有图 / 已回复等筛选维度在客户端完成。
  Future<(List<Review>, ReviewSummary, PageMeta)> filteredReviews({
    int? productId,
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/reviews', query: {
      'product_id': ?productId,
      'page.page': page,
      'page.page_size': pageSize,
    });
    final list = JsonUtil.asMapList(data['reviews']).map(Review.fromJson).toList();
    final summary = ReviewSummary.fromJson(JsonUtil.asMap(data['summary']));
    final meta = PageMeta.fromJson(JsonUtil.asMap(data['meta']));
    return (list, summary, meta);
  }

  /// 我发表过的评价。
  ///
  /// 后端「我的评价」复用评价列表接口：不传 product_id 时按登录态过滤，
  /// 路径是 `/api/v1/reviews`（不存在 `/users/reviews`）。
  Future<(List<Review>, PageMeta)> myReviews({
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/reviews', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    final list = JsonUtil.asMapList(data['reviews']).map(Review.fromJson).toList();
    return (list, PageMeta.fromJson(JsonUtil.asMap(data['meta'])));
  }

  /// 评价标签。
  Future<List<ReviewTag>> reviewTags({int? productId}) async {
    final data = await client.get('/reviews/tags', query: {'product_id': ?productId});
    return JsonUtil.asMapList(data['tags']).map(ReviewTag.fromJson).toList();
  }
}
