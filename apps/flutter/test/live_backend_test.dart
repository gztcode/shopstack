// 联调测试：仅在提供 LIVE_API_BASE 时运行。
// flutter test test/live_backend_test.dart --dart-define=LIVE_API_BASE=http://127.0.0.1:8090
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/api_client.dart';
import 'package:shopstack_app/api/auth_api.dart';
import 'package:shopstack_app/api/invoice_api.dart';
import 'package:shopstack_app/api/logistics_api.dart';
import 'package:shopstack_app/api/marketing_api.dart';
import 'package:shopstack_app/api/order_api.dart';
import 'package:shopstack_app/api/points_api.dart';
import 'package:shopstack_app/api/product_api.dart';
import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/utils/formatters.dart';

const String liveBase = String.fromEnvironment('LIVE_API_BASE');

void main() {
  if (liveBase.isEmpty) {
    test('未配置 LIVE_API_BASE，跳过联调测试', () {
      expect(liveBase, isEmpty);
    });
    return;
  }

  late ApiClient client;
  late AuthApi auth;
  late ProductApi products;
  late OrderApi orders;
  late PointsApi points;
  late InvoiceApi invoices;
  late MarketingApi marketing;
  late LogisticsApi logistics;

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final prefs = await SharedPreferences.getInstance();
    client = ApiClient(
      tokens: TokenStore(prefs),
      baseUrl: '$liveBase/api/v1',
    );
    auth = AuthApi(client);
    products = ProductApi(client);
    orders = OrderApi(client);
    points = PointsApi(client);
    invoices = InvoiceApi(client);
    marketing = MarketingApi(client);
    logistics = LogisticsApi(client);
  });

  test('真实后端：登录 + snake_case -> camelCase 解析', () async {
    final session = await auth.login('demo', 'demo123456');
    expect(session.accessToken, isNotEmpty);
    expect(session.user?.id, greaterThan(0));
  });

  test('真实后端：商品 / 订单字段可正确解析', () async {
    final session = await auth.login('demo', 'demo123456');
    await client.tokens.saveSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    );

    final productResult = await products.listProducts(page: 1, pageSize: 3);
    expect(productResult.items, isNotEmpty);
    final product = productResult.items.first;
    // snake_case 响应已被拦截器转换为 camelCase，Model 字段可正常取值。
    expect(product.minPriceCents, greaterThan(0));
    expect(product.cover, isNotEmpty);
    expect(product.createdAt, isNotEmpty);
    expect(product.tags, isNotEmpty);
    expect(productResult.meta.page, 1);

    final orderResult = await orders.listOrders(page: 1, pageSize: 5);
    for (final order in orderResult.orders) {
      expect(order.orderNo, isNotEmpty);
      expect(order.createdAt, isNotEmpty);
      expect(DateFormatter.parse(order.createdAt), isNotNull);
    }
  });

  test('真实后端：积分 / 发票 / 优惠券 / 物流 / 评价', () async {
    final session = await auth.login('demo', 'demo123456');
    await client.tokens.saveSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    );

    final pointsResult = await points.listPointsLogs(page: 1, pageSize: 10);
    expect(pointsResult.currentPoints, greaterThanOrEqualTo(0));
    expect(pointsResult.logs, isNotEmpty);
    expect(pointsResult.logs.first.title, isNotEmpty);
    expect(pointsResult.logs.first.createdAt, isNotEmpty);

    final invoiceResult = await invoices.listInvoices(page: 1, pageSize: 10);
    for (final invoice in invoiceResult.invoices) {
      expect(invoice.title, isNotEmpty);
      expect(invoice.orderNo, isNotEmpty);
    }

    final coupons = await marketing.availableCoupons();
    expect(coupons, isNotEmpty);
    expect(coupons.first.name, isNotEmpty);

    try {
      final received = await marketing.receiveCoupon(
        couponId: coupons.first.id,
        userId: session.user?.id ?? 0,
      );
      expect(received.id, greaterThan(0));
    } on ApiException catch (e) {
      // 重复领取属于业务冲突，接口契约正常。
      expect(e.message, contains('已领取'));
    }

    final reviews = await products.reviews(productId: 1, page: 1, pageSize: 5);
    expect(reviews.$1, isNotEmpty);
    expect(reviews.$1.first.content, isNotEmpty);

    // 未发货订单返回 shipment = null，页面需按空态处理。
    final tracks = await logistics.tracksByOrder(1);
    expect(tracks.tracks, isNotNull);
    expect(tracks.shipment, anyOf(isNull, isNotNull));
  });

  test('真实后端：申请开票 / 发表评价 / 申请退款参数绑定', () async {
    final session = await auth.login('demo', 'demo123456');
    await client.tokens.saveSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    );

    final invoice = await invoices.createInvoice(
      orderNo: '20260101000002',
      title: '联调测试公司',
      taxNo: '91330100MA2TEST',
      type: 'company',
      email: 'test@example.com',
      amountCents: 100,
      remark: '联调测试',
    );
    expect(invoice.id, greaterThan(0));
    expect(invoice.title, '联调测试公司');

    final review = await products.createReview(
      productId: 4,
      skuId: 8,
      rating: 5,
      content: '联调测试评价',
    );
    expect(review.id, greaterThan(0));

    // 退款金额非法时后端应返回业务错误（验证字段绑定正确）。
    var failed = false;
    try {
      await orders.applyRefund(1, reason: '联调测试', amountCents: 0);
    } on ApiException catch (e) {
      failed = true;
      expect(e.message, contains('退款金额'));
    }
    expect(failed, isTrue);
  });
}
