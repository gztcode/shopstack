import '../models/cart.dart';
import 'api_client.dart';

/// 购物车接口。
class CartApi {
  CartApi(this.client);

  final ApiClient client;

  /// 获取购物车。
  Future<Cart> cart() async {
    final data = await client.get('/cart');
    return Cart.fromJson(data);
  }

  /// 加入购物车。
  Future<Cart> addToCart({
    required int productId,
    required int skuId,
    int quantity = 1,
  }) async {
    final data = await client.post('/cart/items', body: {
      'product_id': productId,
      'sku_id': skuId,
      'quantity': quantity,
      'selected': true,
    });
    return Cart.fromJson(data);
  }

  /// 更新购物车条目（数量 / 选中状态）。
  Future<Cart> updateItem({
    required int id,
    int? quantity,
    bool? selected,
  }) async {
    final data = await client.put('/cart/items/$id', body: {
      'quantity': ?quantity,
      'selected': ?selected,
    });
    return Cart.fromJson(data);
  }

  /// 删除购物车条目。
  Future<void> removeItem(int id) async {
    await client.delete('/cart/items/$id');
  }

  /// 清空购物车。
  Future<void> clear() async {
    await client.post('/cart/clear');
  }

  /// 全选 / 取消全选。
  Future<Cart> selectAll(bool selected) async {
    final data = await client.put('/cart/select-all', body: {'selected': selected});
    return Cart.fromJson(data);
  }

  /// 购物车商品数量。
  Future<int> count() async {
    final data = await client.get('/cart/count');
    return data['count'] is int ? data['count'] as int : 0;
  }
}
