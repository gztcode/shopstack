import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/main.dart';
import 'package:shopstack_app/providers/core_providers.dart';

Future<TokenStore> buildStore(Map<String, Object> values) async {
  SharedPreferences.setMockInitialValues(values);
  final prefs = await SharedPreferences.getInstance();
  return TokenStore(prefs);
}

void main() {
  testWidgets('无本地令牌时进入登录页', (tester) async {
    final store = await buildStore(<String, Object>{});
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStoreProvider.overrideWithValue(store)],
        child: const ShopStackApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 2));
    expect(find.text('欢迎回来'), findsOneWidget);
    expect(find.text('微信一键登录'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('存在本地令牌时进入首页并渲染推荐模块', (tester) async {
    final store = await buildStore(<String, Object>{
      'shopstack_access_token': 'test-token',
      'shopstack_refresh_token': 'test-refresh',
    });
    await tester.pumpWidget(
      ProviderScope(
        overrides: [tokenStoreProvider.overrideWithValue(store)],
        child: const ShopStackApp(),
      ),
    );
    // 后端不可用时进入演示数据模式。
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('搜索商品、品牌'), findsOneWidget);
    expect(find.text('限时秒杀'), findsOneWidget);
    expect(find.text('首页'), findsOneWidget);
    expect(find.textContaining('演示数据模式'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
