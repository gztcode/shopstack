import 'package:flutter_test/flutter_test.dart';

import 'package:shopstack_app/api/json_key_converter.dart';

void main() {
  test('响应方向：snake_case -> camelCase（递归）', () {
    final result = JsonKeyConverter.snakeToCamel(<String, dynamic>{
      'min_price_cents': 429900,
      'id': 7,
      'order_no': 'SS202610180001',
      'created_at': '2026-10-18T09:00:00Z',
      'user': {
        'nickname': '张三',
        'balance_cents': 888800,
        'wechat_openid': 'wx-1',
      },
      'products': <Map<String, dynamic>>[
        <String, dynamic>{'product_id': 1, 'sales_count': 10},
      ],
      'meta': <String, dynamic>{'page': 1, 'page_size': 20, 'total': 100},
    }) as Map<String, dynamic>;

    expect(result['minPriceCents'], 429900);
    expect(result['id'], 7);
    expect(result['orderNo'], 'SS202610180001');
    expect(result['createdAt'], '2026-10-18T09:00:00Z');
    expect((result['user'] as Map<String, dynamic>)['balanceCents'], 888800);
    expect(
        (result['user'] as Map<String, dynamic>)['wechatOpenid'], 'wx-1');
    final products = result['products'] as List<dynamic>;
    expect((products.first as Map<String, dynamic>)['productId'], 1);
    expect((products.first as Map<String, dynamic>)['salesCount'], 10);
    expect((result['meta'] as Map<String, dynamic>)['pageSize'], 20);
  });

  test('响应方向：已经是 camelCase 或非蛇形键保持不变', () {
    final result = JsonKeyConverter.snakeToCamel(<String, dynamic>{
      'minPriceCents': 1,
      '颜色': '银色',
      'pay_params': {'appId': 'wx1'},
    }) as Map<String, dynamic>;
    expect(result['minPriceCents'], 1);
    expect(result['颜色'], '银色');
    expect((result['payParams'] as Map<String, dynamic>)['appId'], 'wx1');
  });

  test('请求方向：camelCase -> snake_case（已是蛇形则不变）', () {
    final result = JsonKeyConverter.camelToSnake(<String, dynamic>{
      'productId': 1,
      'skuId': 2,
      'orderNo': 'SS1',
      'user_id': 3,
      'items': <Map<String, dynamic>>[
        <String, dynamic>{'product_id': 1, 'quantity': 2},
      ],
    }) as Map<String, dynamic>;
    expect(result['product_id'], 1);
    expect(result['sku_id'], 2);
    expect(result['order_no'], 'SS1');
    expect(result['user_id'], 3);
    final items = result['items'] as List<dynamic>;
    expect((items.first as Map<String, dynamic>)['product_id'], 1);
    expect((items.first as Map<String, dynamic>)['quantity'], 2);
  });
}
