import '../utils/json_util.dart';

/// 购物车条目，对应 shopstack.cart.v1.CartItem。
class CartItem {
  const CartItem({
    this.id = 0,
    this.userId = 0,
    this.productId = 0,
    this.skuId = 0,
    this.productTitle = '',
    this.specText = '',
    this.image = '',
    this.priceCents = 0,
    this.quantity = 1,
    this.stock = 0,
    this.selected = true,
    this.available = true,
    this.subtotalCents = 0,
    this.createdAt = '',
    this.updatedAt = '',
  });

  final int id;
  final int userId;
  final int productId;
  final int skuId;
  final String productTitle;
  final String specText;
  final String image;
  final int priceCents;
  final int quantity;
  final int stock;
  final bool selected;
  final bool available;
  final int subtotalCents;
  final String createdAt;
  final String updatedAt;

  bool get stockShort => available && stock > 0 && quantity > stock;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: JsonUtil.intOf(json, 'id'),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        skuId:
            JsonUtil.intOf(json, 'sku_id', JsonUtil.intOf(json, 'skuId')),
        productTitle: JsonUtil.stringOf(json, 'product_title',
            JsonUtil.stringOf(json, 'productTitle')),
        specText: JsonUtil.stringOf(json, 'spec_text',
            JsonUtil.stringOf(json, 'specText')),
        image: JsonUtil.stringOf(json, 'image'),
        priceCents: JsonUtil.intOf(json, 'price_cents',
            JsonUtil.intOf(json, 'priceCents')),
        quantity: JsonUtil.intOf(json, 'quantity', 1),
        stock: JsonUtil.intOf(json, 'stock'),
        selected: JsonUtil.boolOf(json, 'selected', true),
        available: JsonUtil.boolOf(json, 'available', true),
        subtotalCents: JsonUtil.intOf(json, 'subtotal_cents',
            JsonUtil.intOf(json, 'subtotalCents')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        updatedAt: JsonUtil.stringOf(json, 'updated_at',
            JsonUtil.stringOf(json, 'updatedAt')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'product_id': productId,
        'sku_id': skuId,
        'product_title': productTitle,
        'spec_text': specText,
        'image': image,
        'price_cents': priceCents,
        'quantity': quantity,
        'stock': stock,
        'selected': selected,
        'available': available,
        'subtotal_cents': subtotalCents,
        'created_at': createdAt,
        'updated_at': updatedAt,
      };

  CartItem copyWith({
    int? quantity,
    bool? selected,
    bool? available,
    int? stock,
    int? subtotalCents,
  }) =>
      CartItem(
        id: id,
        userId: userId,
        productId: productId,
        skuId: skuId,
        productTitle: productTitle,
        specText: specText,
        image: image,
        priceCents: priceCents,
        quantity: quantity ?? this.quantity,
        stock: stock ?? this.stock,
        selected: selected ?? this.selected,
        available: available ?? this.available,
        subtotalCents: subtotalCents ?? this.subtotalCents,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

/// 购物车，对应 shopstack.cart.v1.Cart。
class Cart {
  const Cart({
    this.userId = 0,
    this.items = const <CartItem>[],
    this.totalCount = 0,
    this.selectedCount = 0,
    this.selectedAmountCents = 0,
    this.selectedDiscountCents = 0,
    this.selectedPayableCents = 0,
  });

  final int userId;
  final List<CartItem> items;
  final int totalCount;
  final int selectedCount;
  final int selectedAmountCents;
  final int selectedDiscountCents;
  final int selectedPayableCents;

  static const Cart empty = Cart();

  List<CartItem> get selectedItems =>
      items.where((item) => item.selected && item.available).toList();

  bool get allSelected =>
      items.isNotEmpty && items.every((item) => item.selected);

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        items: JsonUtil.asMapList(json['items']).map(CartItem.fromJson).toList(),
        totalCount: JsonUtil.intOf(json, 'total_count',
            JsonUtil.intOf(json, 'totalCount')),
        selectedCount: JsonUtil.intOf(json, 'selected_count',
            JsonUtil.intOf(json, 'selectedCount')),
        selectedAmountCents: JsonUtil.intOf(json, 'selected_amount_cents',
            JsonUtil.intOf(json, 'selectedAmountCents')),
        selectedDiscountCents: JsonUtil.intOf(json, 'selected_discount_cents',
            JsonUtil.intOf(json, 'selectedDiscountCents')),
        selectedPayableCents: JsonUtil.intOf(json, 'selected_payable_cents',
            JsonUtil.intOf(json, 'selectedPayableCents')),
      );

  Map<String, dynamic> toJson() => {
        'user_id': userId,
        'items': items.map((e) => e.toJson()).toList(),
        'total_count': totalCount,
        'selected_count': selectedCount,
        'selected_amount_cents': selectedAmountCents,
        'selected_discount_cents': selectedDiscountCents,
        'selected_payable_cents': selectedPayableCents,
      };
}
