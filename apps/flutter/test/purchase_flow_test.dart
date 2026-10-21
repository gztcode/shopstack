import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/main.dart';
import 'package:shopstack_app/providers/core_providers.dart';

Future<Widget> buildApp(WidgetTester tester) async {
  SharedPreferences.setMockInitialValues(<String, Object>{
    'shopstack_access_token': 'test-token',
    'shopstack_refresh_token': 'test-refresh',
  });
  final prefs = await SharedPreferences.getInstance();
  final store = TokenStore(prefs);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(store)],
      child: const ShopStackApp(),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  await tester.pump(const Duration(seconds: 1));
  return const ShopStackApp();
}

void main() {
  testWidgets('浏览 -> 详情 -> 加购 -> 购物车 -> 结算 链路可走通', (tester) async {
    await buildApp(tester);

    // 首页：点击秒杀区商品进入详情页。
    await tester.ensureVisible(find.text('高端保温杯 500ml').first);
    await tester.pump();
    await tester.tap(find.text('高端保温杯 500ml').first);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('商品详情'), findsOneWidget);
    expect(find.text('加入购物车'), findsOneWidget);

    // 加入购物车。
    await tester.tap(find.text('加入购物车'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.textContaining('已加入购物车'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // 返回首页后，底部导航进入购物车。
    await tester.tap(find.byType(BackButton));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.tap(find.text('购物车'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('结算'), findsOneWidget);
    expect(find.text('高端保温杯 500ml'), findsOneWidget);

    // 进入结算页（等待浮动 SnackBar 消失，避免遮挡底部结算按钮）。
    await tester.pump(const Duration(seconds: 5));
    await tester.pump(const Duration(milliseconds: 600));
    final checkoutButton = find.widgetWithText(FilledButton, '结算');
    expect(checkoutButton, findsOneWidget);
    await tester.tap(checkoutButton);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('确认订单'), findsOneWidget);
    expect(find.text('提交订单'), findsOneWidget);
    expect(find.text('实付金额'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // 提交订单并进入支付页。
    await tester.tap(find.text('提交订单'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('订单支付'), findsOneWidget);
    expect(find.text('确认支付 微信支付'), findsOneWidget);

    // 支付并轮询状态。
    await tester.tap(find.text('确认支付 微信支付'));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(seconds: 1));
    }
    expect(find.text('支付成功'), findsOneWidget);
    expect(tester.takeException(), isNull);

    // 进入订单详情。
    await tester.tap(find.text('查看订单'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('订单详情'), findsOneWidget);
    expect(find.text('状态跟踪'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('金额明细'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('金额明细'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
