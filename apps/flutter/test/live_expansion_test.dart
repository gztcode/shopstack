// 联调测试（扩量页面对应的接口）：仅在提供 LIVE_API_BASE 时运行。
// flutter test test/live_expansion_test.dart --dart-define=LIVE_API_BASE=http://127.0.0.1:8090
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:shopstack_app/api/api_client.dart';
import 'package:shopstack_app/api/auth_api.dart';
import 'package:shopstack_app/api/content_api.dart';
import 'package:shopstack_app/api/logistics_api.dart';
import 'package:shopstack_app/api/marketing_api.dart';
import 'package:shopstack_app/api/notification_api.dart';
import 'package:shopstack_app/api/order_api.dart';
import 'package:shopstack_app/api/product_api.dart';
import 'package:shopstack_app/api/token_store.dart';
import 'package:shopstack_app/api/user_api.dart';

const String liveBase = String.fromEnvironment('LIVE_API_BASE');

void main() {
  if (liveBase.isEmpty) {
    test('未配置 LIVE_API_BASE，跳过联调测试', () {
      expect(liveBase, isEmpty);
    });
    return;
  }

  late ApiClient client;
  late ProductApi products;
  late MarketingApi marketing;
  late OrderApi orders;
  late UserApi users;
  late ContentApi contents;
  late LogisticsApi logistics;
  late NotificationApi notifications;

  setUp(() async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final prefs = await SharedPreferences.getInstance();
    client = ApiClient(
      tokens: TokenStore(prefs),
      baseUrl: '$liveBase/api/v1',
    );
    products = ProductApi(client);
    marketing = MarketingApi(client);
    orders = OrderApi(client);
    users = UserApi(client);
    contents = ContentApi(client);
    logistics = LogisticsApi(client);
    notifications = NotificationApi(client);

    final auth = AuthApi(client);
    final session = await auth.login('demo', 'demo123456');
    await client.tokens.saveSession(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    );
  });

  test('真实后端：频道与商品浏览', () async {
    final channels = await products.channels();
    expect(channels, isNotEmpty);
    for (final channel in channels) {
      expect(channel.id, greaterThan(0));
      expect(channel.name, isNotEmpty);
      expect(channel.code, isNotEmpty);
    }
    expect(channels.map((c) => c.code), contains('recommend'));
    expect(channels.map((c) => c.code), contains('presale'));

    final recommend = channels.firstWhere((c) => c.code == 'recommend');
    final result = await products.channelProducts(
      channelId: recommend.id,
      channelType: 'recommend',
    );
    expect(result.items, isNotEmpty);
    expect(result.items.first.minPriceCents, greaterThan(0));

    final params = await products.productParams(recommend.id);
    expect(params, isNotEmpty);
    expect(params.first.name, isNotEmpty);

    final questions = await products.productQuestions(recommend.id);
    expect(questions, isNotEmpty);
    expect(questions.first.question, isNotEmpty);
  });

  test('真实后端：评价体系', () async {
    final result = await products.filteredReviews(pageSize: 50);
    expect(result.$1, isNotEmpty);
    expect(result.$1.first.content, isNotEmpty);
    expect(result.$2.total, greaterThanOrEqualTo(0));

    final tags = await products.reviewTags();
    expect(tags, isNotEmpty);
    expect(tags.first.name, isNotEmpty);
  });

  test('真实后端：营销与活动', () async {
    final signIn = await marketing.signInInfo();
    expect(signIn.continuousDays, greaterThanOrEqualTo(0));
    expect(signIn.totalDays, greaterThanOrEqualTo(0));
    expect(signIn.calendar, isNotEmpty);
    expect(signIn.calendar.first.date, isNotNull);

    final tasks = await marketing.tasks();
    expect(tasks, isNotEmpty);
    expect(tasks.first.title, isNotEmpty);
    expect(tasks.first.target, greaterThanOrEqualTo(0));

    final promotions = await marketing.promotionsByType('flash');
    expect(promotions, isNotEmpty);
    expect(promotions.first.name, isNotEmpty);
    expect(promotions.first.type, 3);

    final sessions = await marketing.promotionSessions(promotions.first.id);
    expect(sessions, isNotEmpty);
    expect(sessions.first.name, isNotEmpty);
    expect(sessions.first.startTime, greaterThan(0));

    final groups = await marketing.groupBuys();
    expect(groups, isNotEmpty);
    expect(groups.first.title, isNotEmpty);
    expect(groups.first.priceCents, greaterThan(0));
    expect(groups.first.requiredMembers, greaterThan(0));

    final detail = await marketing.groupBuyDetail(groups.first.id);
    expect(detail.id, groups.first.id);
  });

  test('真实后端：订单与售后', () async {
    final sales = await orders.afterSales();
    expect(sales.items, isNotEmpty);
    expect(sales.items.first.afterSaleNo, isNotEmpty);
    expect(sales.items.first.typeLabel, isNotEmpty);
    expect(sales.items.first.statusLabel, isNotEmpty);
    expect(sales.items.first.amountCents, greaterThanOrEqualTo(0));

    final reasons = await orders.refundReasons();
    expect(reasons, isNotEmpty);
    expect(reasons.first.name, isNotEmpty);
  });

  test('真实后端：用户中心与账户', () async {
    final level = await users.level();
    expect(level.level, greaterThan(0));
    expect(level.levelName, isNotEmpty);
    expect(level.levels, isNotEmpty);
    expect(level.levels.first.name, isNotEmpty);

    final levels = await users.levels();
    expect(levels, isNotEmpty);

    // 成长值流水可能为空（演示账号尚无成长值记录），此处只校验契约可解析。
    final growth = await users.growthLogs();
    expect(growth.page, greaterThan(0));

    final templates = await users.invoiceTemplates();
    expect(templates, isNotEmpty);
    expect(templates.first.title, isNotEmpty);

    final settings = await users.notificationSettings();
    expect(settings, isNotEmpty);
    expect(settings.first.category, isNotEmpty);

    final security = await users.security();
    expect(security.phoneBound, isTrue);
    expect(security.riskLabel, isNotEmpty);
  });

  test('真实后端：内容、消息与物流', () async {
    final articles = await contents.helpArticles();
    expect(articles, isNotEmpty);
    expect(articles.first.title, isNotEmpty);
    expect(articles.first.category, isNotEmpty);

    final article = await contents.helpArticle(articles.first.id);
    expect(article.id, articles.first.id);

    final regions = await contents.regions();
    expect(regions, isNotEmpty);
    expect(regions.first.name, isNotEmpty);
    expect(regions.first.code, isNotEmpty);

    final categories = await notifications.categories();
    expect(categories, isNotEmpty);
    expect(categories.first.name, isNotEmpty);

    final companies = await logistics.companies();
    expect(companies, isNotEmpty);
    expect(companies.first.name, isNotEmpty);

    final ranges = await logistics.ranges();
    expect(ranges, isNotEmpty);
    expect(ranges.first.templateName, isNotEmpty);
    expect(ranges.first.regions, isNotEmpty);
  });
}
