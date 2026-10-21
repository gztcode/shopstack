// 页面截图巡检：逐个访问 App 的全部路由，并通过标准输出报告当前路由。
//
// 这是测试代码，不属于产品代码。执行方式：
//   flutter drive --driver=test_driver/screenshot_driver.dart \
//     --target=test/screenshot_tour_test.dart -d <模拟器ID>
//
// 截图由宿主机侧完成：宿主监听本测试输出的 SHOT 信号行，
// 收到后用 `xcrun simctl io <device> screenshot` 抓取当前模拟器画面。
// 之所以不用 integration_test 自带的 takeScreenshot：
// iOS 上该接口在部分版本会静默无产出，而宿主机截图更直接可控。
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:shopstack_app/core/router/app_router.dart';
import 'package:shopstack_app/main.dart' as app;
import 'package:shopstack_app/providers/auth_provider.dart';

/// 需要真实 id 的路由，模板占位符在此替换为实测可用值。
const Map<String, String> _routeArgs = {
  ':id': '7',
  ':orderId': '1',
};

/// 全部页面路由。顺序即巡检顺序。
const List<String> _routes = <String>[
  '/splash',
  '/login',
  '/home',
  '/category',
  '/cart',
  '/profile',
  '/search',
  '/product/7',
  '/checkout',
  '/payment/1',
  '/orders',
  '/order/1',
  '/addresses',
  '/address/edit',
  '/favorites',
  '/coupons',
  '/notifications',
  '/settings',
  '/points',
  '/invoices',
  '/logistics',
  '/coupon-center',
  '/review',
  '/refund',
  '/channel/list',
  '/channel/recommend',
  '/channel/newest',
  '/channel/hot',
  '/channel/flash',
  '/channel/presale',
  '/channel/clearance',
  '/channel/freeship',
  '/channel/cross',
  '/channel/fresh',
  '/product/7/params',
  '/product/7/questions',
  '/review/all',
  '/review/good',
  '/review/medium',
  '/review/bad',
  '/review/image',
  '/review/reply',
  '/my-reviews',
  '/review/tags',
  '/sign-in',
  '/sign-in/calendar',
  '/task-center',
  '/task/1',
  '/promotion/list',
  '/promotion/flash',
  '/promotion/presale',
  '/promotion/1/sessions',
  '/group-buy/list',
  '/group-buy/1',
  '/group-buy/1/join',
  '/my-group-buy',
  '/order/all',
  '/order/pay',
  '/order/ship',
  '/order/receive',
  '/order/done',
  '/order/cancel',
  '/order/refunding',
  '/order/confirm',
  '/after-sale/list',
  '/after-sale/apply',
  '/after-sale/1',
  '/refund-reason',
  '/logistics/trace',
  '/logistics/track',
  '/user/level',
  '/user/growth-logs',
  '/user/invoice-templates',
  '/user/notification-settings',
  '/user/security',
  '/user/realname',
  '/user/feedback',
  '/help/center',
  '/help/article/1',
  '/region',
];

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('遍历全部页面', (WidgetTester tester) async {
    app.main();
    await _advance(tester, 20);

    final ctx = tester.element(find.byType(MaterialApp));
    final container = ProviderScope.containerOf(ctx);
    final router = container.read(routerProvider);
    final auth = container.read(authProvider.notifier);

    // 登录演示账号，保证需要登录态的页面能正常渲染。
    final ok = await auth.login('demo', 'demo123456');
    await _advance(tester, 20);
    debugPrint(ok ? 'AUTH-OK' : 'AUTH-WARN');

    for (var i = 0; i < _routes.length; i++) {
      final route = _routes[i];
      final path = _fillArgs(route);
      router.go(path);
      // 推进帧，让页面完成首帧布局与数据加载动画。
      await _advance(tester, 30);
      // 通知宿主：当前页面已就绪，可以截图。
      debugPrint('SHOT ${i + 1}/${_routes.length} ${_fileName(path)} $path');
      // 留出截图窗口，避免宿主抓到切页中间态。
      await _advance(tester, 14);
    }
    debugPrint('TOUR-DONE');
  });
}

/// 推进 n 帧。
Future<void> _advance(WidgetTester tester, int n) async {
  for (var i = 0; i < n; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// 把路由里的 :id 等占位符替换为实测值。
String _fillArgs(String route) {
  var out = route;
  _routeArgs.forEach((k, v) {
    out = out.replaceAll(k, v);
  });
  return out;
}

/// 把路由路径转成合法文件名。
String _fileName(String path) {
  final cleaned = path.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '-');
  return cleaned.replaceAll(RegExp(r'^-+|-+$'), '');
}
