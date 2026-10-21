import '../utils/enums.dart';
import '../utils/json_util.dart';
import 'common.dart';

/// 商品分类，对应 shopstack.product.v1.Category。
class Category {
  const Category({
    this.id = 0,
    this.name = '',
    this.parentId = 0,
    this.icon = '',
    this.description = '',
    this.sort = 0,
    this.visible = true,
    this.productCount = 0,
    this.children = const <Category>[],
  });

  final int id;
  final String name;
  final int parentId;
  final String icon;
  final String description;
  final int sort;
  final bool visible;
  final int productCount;
  final List<Category> children;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: JsonUtil.intOf(json, 'id'),
        name: JsonUtil.stringOf(json, 'name'),
        parentId: JsonUtil.intOf(json, 'parent_id',
            JsonUtil.intOf(json, 'parentId')),
        icon: JsonUtil.stringOf(json, 'icon'),
        description: JsonUtil.stringOf(json, 'description'),
        sort: JsonUtil.intOf(json, 'sort'),
        visible: JsonUtil.boolOf(json, 'visible', true),
        productCount: JsonUtil.intOf(json, 'product_count',
            JsonUtil.intOf(json, 'productCount')),
        children: JsonUtil.asMapList(json['children'])
            .map(Category.fromJson)
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'parent_id': parentId,
        'icon': icon,
        'description': description,
        'sort': sort,
        'visible': visible,
        'product_count': productCount,
        'children': children.map((c) => c.toJson()).toList(),
      };
}

/// 商品，对应 shopstack.product.v1.Product。
class Product {
  const Product({
    this.id = 0,
    this.title = '',
    this.subtitle = '',
    this.cover = '',
    this.categoryId = 0,
    this.categoryName = '',
    this.minPriceCents = 0,
    this.maxPriceCents = 0,
    this.salesCount = 0,
    this.stockTotal = 0,
    this.status = ProductStatus.onShelf,
    this.description = '',
    this.tags = const <String>[],
    this.createdAt = '',
    this.updatedAt = '',
  });

  final int id;
  final String title;
  final String subtitle;
  final String cover;
  final int categoryId;
  final String categoryName;
  final int minPriceCents;
  final int maxPriceCents;
  final int salesCount;
  final int stockTotal;
  final ProductStatus status;
  final String description;
  final List<String> tags;
  final String createdAt;
  final String updatedAt;

  bool get onShelf => status == ProductStatus.onShelf;
  bool get hasDiscount => maxPriceCents > minPriceCents && maxPriceCents > 0;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: JsonUtil.intOf(json, 'id'),
        title: JsonUtil.stringOf(json, 'title'),
        subtitle: JsonUtil.stringOf(json, 'subtitle'),
        cover: JsonUtil.stringOf(json, 'cover'),
        categoryId: JsonUtil.intOf(json, 'category_id',
            JsonUtil.intOf(json, 'categoryId')),
        categoryName: JsonUtil.stringOf(json, 'category_name',
            JsonUtil.stringOf(json, 'categoryName')),
        minPriceCents: JsonUtil.intOf(json, 'min_price_cents',
            JsonUtil.intOf(json, 'minPriceCents')),
        maxPriceCents: JsonUtil.intOf(json, 'max_price_cents',
            JsonUtil.intOf(json, 'maxPriceCents')),
        salesCount: JsonUtil.intOf(json, 'sales_count',
            JsonUtil.intOf(json, 'salesCount')),
        stockTotal: JsonUtil.intOf(json, 'stock_total',
            JsonUtil.intOf(json, 'stockTotal')),
        status: parseEnumValue<ProductStatus>(
          json['status'],
          ProductStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        description: JsonUtil.stringOf(json, 'description'),
        tags: JsonUtil.asStringList(json['tags']),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        updatedAt: JsonUtil.stringOf(json, 'updated_at',
            JsonUtil.stringOf(json, 'updatedAt')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'subtitle': subtitle,
        'cover': cover,
        'category_id': categoryId,
        'category_name': categoryName,
        'min_price_cents': minPriceCents,
        'max_price_cents': maxPriceCents,
        'sales_count': salesCount,
        'stock_total': stockTotal,
        'status': status.wire,
        'description': description,
        'tags': tags,
        'created_at': createdAt,
        'updated_at': updatedAt,
      };
}

/// 商品规格，对应 shopstack.product.v1.ProductSku。
class ProductSku {
  const ProductSku({
    this.id = 0,
    this.productId = 0,
    this.skuCode = '',
    this.specText = '',
    this.specs = const <String, String>{},
    this.priceCents = 0,
    this.originalPriceCents = 0,
    this.stock = 0,
    this.lockedStock = 0,
    this.image = '',
    this.sort = 0,
    this.salesCount = 0,
    this.enabled = true,
    this.weightGrams = 0,
  });

  final int id;
  final int productId;
  final String skuCode;
  final String specText;
  final Map<String, String> specs;
  final int priceCents;
  final int originalPriceCents;
  final int stock;
  final int lockedStock;
  final String image;
  final int sort;
  final int salesCount;
  final bool enabled;
  final int weightGrams;

  bool get inStock => stock > 0;
  bool get hasDiscount => originalPriceCents > priceCents && originalPriceCents > 0;

  factory ProductSku.fromJson(Map<String, dynamic> json) => ProductSku(
        id: JsonUtil.intOf(json, 'id'),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        skuCode: JsonUtil.stringOf(json, 'sku_code',
            JsonUtil.stringOf(json, 'skuCode')),
        specText: JsonUtil.stringOf(json, 'spec_text',
            JsonUtil.stringOf(json, 'specText')),
        specs: JsonUtil.asStringMap(json['specs']),
        priceCents: JsonUtil.intOf(json, 'price_cents',
            JsonUtil.intOf(json, 'priceCents')),
        originalPriceCents: JsonUtil.intOf(json, 'original_price_cents',
            JsonUtil.intOf(json, 'originalPriceCents')),
        stock: JsonUtil.intOf(json, 'stock'),
        lockedStock: JsonUtil.intOf(json, 'locked_stock',
            JsonUtil.intOf(json, 'lockedStock')),
        image: JsonUtil.stringOf(json, 'image'),
        sort: JsonUtil.intOf(json, 'sort'),
        salesCount: JsonUtil.intOf(json, 'sales_count',
            JsonUtil.intOf(json, 'salesCount')),
        enabled: JsonUtil.boolOf(json, 'enabled', true),
        weightGrams: JsonUtil.intOf(json, 'weight_grams',
            JsonUtil.intOf(json, 'weightGrams')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'product_id': productId,
        'sku_code': skuCode,
        'spec_text': specText,
        'specs': specs,
        'price_cents': priceCents,
        'original_price_cents': originalPriceCents,
        'stock': stock,
        'locked_stock': lockedStock,
        'image': image,
        'sort': sort,
        'sales_count': salesCount,
        'enabled': enabled,
        'weight_grams': weightGrams,
      };
}

/// 商品参数，对应 shopstack.product.v1.ProductAttribute。
class ProductAttribute {
  const ProductAttribute({
    this.id = 0,
    this.productId = 0,
    this.name = '',
    this.value = '',
    this.sort = 0,
  });

  final int id;
  final int productId;
  final String name;
  final String value;
  final int sort;

  factory ProductAttribute.fromJson(Map<String, dynamic> json) => ProductAttribute(
        id: JsonUtil.intOf(json, 'id'),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        name: JsonUtil.stringOf(json, 'name'),
        value: JsonUtil.stringOf(json, 'value'),
        sort: JsonUtil.intOf(json, 'sort'),
      );
}

/// 评价汇总，对应 shopstack.product.v1.ReviewSummary。
class ReviewSummary {
  const ReviewSummary({
    this.total = 0,
    this.good = 0,
    this.medium = 0,
    this.bad = 0,
    this.average = 0,
  });

  final int total;
  final int good;
  final int medium;
  final int bad;
  final double average;

  factory ReviewSummary.fromJson(Map<String, dynamic> json) => ReviewSummary(
        total: JsonUtil.intOf(json, 'total'),
        good: JsonUtil.intOf(json, 'good'),
        medium: JsonUtil.intOf(json, 'medium'),
        bad: JsonUtil.intOf(json, 'bad'),
        average: JsonUtil.doubleOf(json, 'average'),
      );
}

/// 商品详情，对应 shopstack.product.v1.ProductDetail。
class ProductDetail {
  const ProductDetail({
    this.product = const Product(),
    this.skus = const <ProductSku>[],
    this.images = const <ImageItem>[],
    this.attributes = const <ProductAttribute>[],
    this.reviews = const ReviewSummary(),
    this.reviewCount = 0,
    this.reviewRating = 0,
    this.related = const <Product>[],
  });

  final Product product;
  final List<ProductSku> skus;
  final List<ImageItem> images;
  final List<ProductAttribute> attributes;
  final ReviewSummary reviews;
  final int reviewCount;
  final double reviewRating;
  final List<Product> related;

  /// 展示用的图片列表（商品图集为空时回退到封面）。
  List<String> get gallery => images.isNotEmpty
      ? images.map((e) => e.url).where((url) => url.isNotEmpty).toList()
      : <String>[if (product.cover.isNotEmpty) product.cover];

  /// SKU 中可选的规格维度（键），保持出现顺序。
  List<String> get specKeys {
    final keys = <String>[];
    for (final sku in skus) {
      for (final key in sku.specs.keys) {
        if (!keys.contains(key)) keys.add(key);
      }
    }
    return keys;
  }

  factory ProductDetail.fromJson(Map<String, dynamic> json) => ProductDetail(
        product: Product.fromJson(JsonUtil.asMap(json['product'])),
        skus: JsonUtil.asMapList(json['skus']).map(ProductSku.fromJson).toList(),
        images:
            JsonUtil.asMapList(json['images']).map(ImageItem.fromJson).toList(),
        attributes: JsonUtil.asMapList(json['attributes'])
            .map(ProductAttribute.fromJson)
            .toList(),
        reviews: ReviewSummary.fromJson(JsonUtil.asMap(json['reviews'])),
        reviewCount: JsonUtil.intOf(json, 'review_count',
            JsonUtil.intOf(json, 'reviewCount')),
        reviewRating: JsonUtil.doubleOf(json, 'review_rating',
            JsonUtil.doubleOf(json, 'reviewRating')),
        related:
            JsonUtil.asMapList(json['related']).map(Product.fromJson).toList(),
      );
}

/// 轮播图，对应 shopstack.product.v1.Banner。
class Banner {
  const Banner({
    this.id = 0,
    this.title = '',
    this.image = '',
    this.link = '',
    this.sort = 0,
    this.position = 'home_banner',
    this.visible = true,
  });

  final int id;
  final String title;
  final String image;
  final String link;
  final int sort;
  final String position;
  final bool visible;

  factory Banner.fromJson(Map<String, dynamic> json) => Banner(
        id: JsonUtil.intOf(json, 'id'),
        title: JsonUtil.stringOf(json, 'title'),
        image: JsonUtil.stringOf(json, 'image'),
        link: JsonUtil.stringOf(json, 'link'),
        sort: JsonUtil.intOf(json, 'sort'),
        position: JsonUtil.stringOf(json, 'position'),
        visible: JsonUtil.boolOf(json, 'visible', true),
      );
}

/// 评价，对应 shopstack.product.v1.Review。
class Review {
  const Review({
    this.id = 0,
    this.productId = 0,
    this.productTitle = '',
    this.userId = 0,
    this.userNickname = '',
    this.userAvatar = '',
    this.rating = 5,
    this.content = '',
    this.images = const <String>[],
    this.skuId = 0,
    this.skuText = '',
    this.status = ReviewStatus.approved,
    this.adminReply = '',
    this.likeCount = 0,
    this.createdAt = '',
  });

  final int id;
  final int productId;
  final String productTitle;
  final int userId;
  final String userNickname;
  final String userAvatar;
  final int rating;
  final String content;
  final List<String> images;
  final int skuId;
  final String skuText;
  final ReviewStatus status;
  final String adminReply;
  final int likeCount;
  final String createdAt;

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: JsonUtil.intOf(json, 'id'),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        productTitle: JsonUtil.stringOf(json, 'product_title',
            JsonUtil.stringOf(json, 'productTitle')),
        userId: JsonUtil.intOf(json, 'user_id',
            JsonUtil.intOf(json, 'userId')),
        userNickname: JsonUtil.stringOf(json, 'user_nickname',
            JsonUtil.stringOf(json, 'userNickname')),
        userAvatar: JsonUtil.stringOf(json, 'user_avatar',
            JsonUtil.stringOf(json, 'userAvatar')),
        rating: JsonUtil.intOf(json, 'rating', 5),
        content: JsonUtil.stringOf(json, 'content'),
        images: JsonUtil.asStringList(json['images']),
        skuId: JsonUtil.intOf(json, 'sku_id', JsonUtil.intOf(json, 'skuId')),
        skuText: JsonUtil.stringOf(json, 'sku_text',
            JsonUtil.stringOf(json, 'skuText')),
        status: parseEnumValue<ReviewStatus>(
          json['status'],
          ReviewStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        adminReply: JsonUtil.stringOf(json, 'admin_reply',
            JsonUtil.stringOf(json, 'adminReply')),
        likeCount: JsonUtil.intOf(json, 'like_count',
            JsonUtil.intOf(json, 'likeCount')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
      );
}
