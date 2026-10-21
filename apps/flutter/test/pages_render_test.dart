import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/main.dart';
import 'package:shopstack_app/providers/core_providers.dart';

Future<void> boot(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues(<String, Object>{
    'shopstack_access_token': 'test-token',
    'shopstack_refresh_token': 'test-refresh',
  });
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(TokenStore(prefs))],
      child: const ShopStackApp(),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  await tester.pump(const Duration(seconds: 1));
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text).first;
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

Future<void> goBack(WidgetTester tester) async {
  await tester.tap(find.byType(BackButton));
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('分类页可渲染', (tester) async {
    await boot(tester);
    await tester.tap(find.text('分类'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('商品分类'), findsOneWidget);
    expect(find.text('综合'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('我的页与各功能列表页可渲染', (tester) async {
    await boot(tester);
    await tester.tap(find.text('我的'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('我的订单'), findsOneWidget);
    expect(find.text('收货地址'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tapText(tester, '全部订单');
    expect(find.text('我的订单'), findsOneWidget);
    expect(find.text('待付款'), findsWidgets);
    expect(tester.takeException(), isNull);
    await goBack(tester);

    await tapText(tester, '我的收藏');
    expect(find.text('我的收藏'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);

    await tapText(tester, '我的优惠券');
    expect(find.text('我的优惠券'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);

    await tapText(tester, '消息通知');
    expect(find.text('消息通知'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);

    await tapText(tester, '收货地址');
    expect(find.text('收货地址'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);

    await tapText(tester, '设置');
    expect(find.text('设置'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
