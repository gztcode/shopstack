/// 结算参数：从购物车结算或直接下单。
class CheckoutArgs {
  const CheckoutArgs({
    this.cartItemIds = const <int>[],
    this.items = const <CheckoutItem>[],
  });

  /// 购物车条目 id（from_cart = true）。
  final List<int> cartItemIds;

  /// 直接下单条目。
  final List<CheckoutItem> items;

  /// 直接下单的单个商品。
  factory CheckoutArgs.single({
    required int productId,
    required int skuId,
    required int quantity,
  }) =>
      CheckoutArgs(items: <CheckoutItem>[
        CheckoutItem(productId: productId, skuId: skuId, quantity: quantity),
      ]);

  bool get isFromCart => cartItemIds.isNotEmpty;

  bool get isEmpty => cartItemIds.isEmpty && items.isEmpty;
}

/// 结算条目。
class CheckoutItem {
  const CheckoutItem({
    required this.productId,
    required this.skuId,
    required this.quantity,
  });

  final int productId;
  final int skuId;
  final int quantity;

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'sku_id': skuId,
        'quantity': quantity,
      };
}
