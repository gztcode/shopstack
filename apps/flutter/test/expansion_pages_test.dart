import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/pages/after_sale_list/after_sale_list_page.dart';
import 'package:shopstack_app/pages/channel_list/channel_list_page.dart';
import 'package:shopstack_app/pages/channel_recommend/channel_recommend_page.dart';
import 'package:shopstack_app/pages/group_buy_list/group_buy_list_page.dart';
import 'package:shopstack_app/pages/help_center/help_center_page.dart';
import 'package:shopstack_app/pages/order_all/order_all_page.dart';
import 'package:shopstack_app/pages/promotion_list/promotion_list_page.dart';
import 'package:shopstack_app/pages/region/region_page.dart';
import 'package:shopstack_app/pages/review_all/review_all_page.dart';
import 'package:shopstack_app/pages/sign_in/sign_in_page.dart';
import 'package:shopstack_app/pages/task_center/task_center_page.dart';
import 'package:shopstack_app/pages/user_level/user_level_page.dart';
import 'package:shopstack_app/providers/core_providers.dart';

/// 渲染单个页面并等待异步数据加载完成。
Future<void> pumpPage(WidgetTester tester, Widget page) async {
  SharedPreferences.setMockInitialValues(<String, Object>{
    'shopstack_access_token': 'test-token',
    'shopstack_refresh_token': 'test-refresh',
  });
  final prefs = await SharedPreferences.getInstance();
  await tester.pumpWidget(
    ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(TokenStore(prefs))],
      child: MaterialApp(home: page),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  await tester.pump(const Duration(seconds: 1));
}

void main() {
  testWidgets('频道列表页可渲染', (tester) async {
    await pumpPage(tester, const ChannelListPage());
    expect(find.text('全部频道'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('频道详情页可渲染', (tester) async {
    await pumpPage(tester, const ChannelRecommendPage());
    expect(find.text('推荐'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('全部评价页可渲染', (tester) async {
    await pumpPage(tester, const ReviewAllPage());
    expect(find.text('全部评价'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('全部订单页可渲染', (tester) async {
    await pumpPage(tester, const OrderAllPage());
    expect(find.text('全部订单'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('签到中心页可渲染', (tester) async {
    await pumpPage(tester, const SignInPage());
    expect(find.text('签到中心'), findsOneWidget);
    expect(find.text('连续签到'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('任务中心页可渲染', (tester) async {
    await pumpPage(tester, const TaskCenterPage());
    expect(find.text('任务中心'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('活动列表页可渲染', (tester) async {
    await pumpPage(tester, const PromotionListPage());
    expect(find.text('活动列表'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('拼团列表页可渲染', (tester) async {
    await pumpPage(tester, const GroupBuyListPage());
    expect(find.text('拼团列表'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('售后列表页可渲染', (tester) async {
    await pumpPage(tester, const AfterSaleListPage());
    expect(find.text('售后列表'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('会员等级页可渲染', (tester) async {
    await pumpPage(tester, const UserLevelPage());
    expect(find.text('会员等级'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('帮助中心页可渲染', (tester) async {
    await pumpPage(tester, const HelpCenterPage());
    expect(find.text('帮助中心'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('收货地区页可渲染', (tester) async {
    await pumpPage(tester, const RegionPage());
    expect(find.text('收货地区'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
