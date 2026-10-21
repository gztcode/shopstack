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

Future<void> openProfileItem(WidgetTester tester, String label) async {
  await tester.tap(find.text('我的'));
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  final finder = find.text(label).first;
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
  testWidgets('积分明细页可渲染并展示当前积分', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '积分明细');
    expect(find.text('积分明细'), findsOneWidget);
    expect(find.text('当前可用积分'), findsOneWidget);
    // 标题与业务类型标签都会展示「签到奖励」。
    expect(find.text('签到奖励'), findsWidgets);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });

  testWidgets('发票管理页可渲染', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '发票管理');
    expect(find.text('发票管理'), findsOneWidget);
    expect(find.text('申请开票'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });

  testWidgets('物流跟踪页可渲染', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '物流跟踪');
    expect(find.text('物流跟踪'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });

  testWidgets('领券中心可领取优惠券且按钮变为已领取', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '领券中心');
    expect(find.text('领券中心'), findsOneWidget);
    expect(find.text('立即领取'), findsWidgets);

    await tester.tap(find.text('立即领取').first);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('已领取'), findsWidgets);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });

  testWidgets('发表评价页可渲染', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '发表评价');
    expect(find.text('发表评价'), findsWidgets);
    await tester.scrollUntilVisible(
      find.text('评分'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('评分'), findsOneWidget);
    expect(find.text('评价内容'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });

  testWidgets('售后申请页可渲染', (tester) async {
    await boot(tester);
    await openProfileItem(tester, '售后申请');
    expect(find.text('售后申请'), findsOneWidget);
    expect(find.text('退款原因'), findsOneWidget);
    expect(find.text('退款金额'), findsOneWidget);
    expect(find.text('提交退款申请'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await goBack(tester);
  });
}
