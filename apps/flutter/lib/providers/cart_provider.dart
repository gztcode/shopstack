import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock/mock_store.dart';
import '../models/cart.dart';
import 'core_providers.dart';

/// 购物车状态。
class CartNotifier extends Notifier<Cart> {
  @override
  Cart build() => Cart.empty;

  /// 加载购物车。
  Future<void> load() async {
    try {
      state = await ref.read(cartApiProvider).cart();
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      state = MockStore.instance.cart();
    }
  }

  /// 加入购物车。
  Future<bool> addToCart({
    required int productId,
    required int skuId,
    int quantity = 1,
  }) async {
    try {
      state = await ref.read(cartApiProvider).addToCart(
            productId: productId,
            skuId: skuId,
            quantity: quantity,
          );
      return true;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      state = MockStore.instance.addToCart(
        productId: productId,
        skuId: skuId,
        quantity: quantity,
      );
      return true;
    }
  }

  /// 更新购物车条目。
  Future<void> updateItem({
    required int id,
    int? quantity,
    bool? selected,
  }) async {
    final previous = state;
    state = _applyLocal(previous, id: id, quantity: quantity, selected: selected);
    try {
      state = await ref.read(cartApiProvider).updateItem(
            id: id,
            quantity: quantity,
            selected: selected,
          );
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      state = MockStore.instance.updateItem(
        id: id,
        quantity: quantity,
        selected: selected,
      );
    }
  }

  /// 删除购物车条目。
  Future<void> removeItem(int id) async {
    try {
      await ref.read(cartApiProvider).removeItem(id);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.removeItem(id);
    }
    state = MockStore.instance.cart();
  }

  /// 全选 / 取消全选。
  Future<void> selectAll(bool selected) async {
    try {
      state = await ref.read(cartApiProvider).selectAll(selected);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      state = MockStore.instance.selectAll(selected);
    }
  }

  /// 清空购物车。
  Future<void> clear() async {
    try {
      await ref.read(cartApiProvider).clear();
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.clearCart();
    }
    state = Cart.empty;
  }

  /// 本地先行更新，保证交互即时反馈。
  Cart _applyLocal(Cart cart,
      {required int id, int? quantity, bool? selected}) {
    final items = cart.items.map((item) {
      if (item.id != id) return item;
      final newQuantity = quantity ?? item.quantity;
      return item.copyWith(
        quantity: newQuantity,
        selected: selected ?? item.selected,
        subtotalCents: item.priceCents * newQuantity,
      );
    }).toList();
    final selectedItems =
        items.where((item) => item.selected && item.available).toList();
    final amount =
        selectedItems.fold<int>(0, (sum, item) => sum + item.subtotalCents);
    return Cart(
      userId: cart.userId,
      items: items,
      totalCount: items.fold<int>(0, (sum, item) => sum + item.quantity),
      selectedCount:
          selectedItems.fold<int>(0, (sum, item) => sum + item.quantity),
      selectedAmountCents: amount,
      selectedDiscountCents: cart.selectedDiscountCents,
      selectedPayableCents: amount,
    );
  }
}

final cartProvider = NotifierProvider<CartNotifier, Cart>(CartNotifier.new);

/// 底部导航角标：购物车商品数量。
final cartCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.totalCount;
});
