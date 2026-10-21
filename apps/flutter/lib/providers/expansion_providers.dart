import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/expansion_mock.dart';
import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/expansion.dart';
import '../models/logistics.dart';
import '../models/marketing.dart';
import '../models/product.dart';
import 'core_providers.dart';

/// 阶段 3 扩量页面的数据提供者。
///
/// 约定：优先请求后端，失败时打开演示数据模式并回落到 [ExpansionMock]。

/// 评价筛选结果（列表 + 汇总 + 分页）。
class ReviewFilterData {
  const ReviewFilterData(this.reviews, this.summary, this.meta);

  final List<Review> reviews;
  final ReviewSummary summary;
  final PageMeta meta;
}

// ---------------------------------------------------------------- 频道与商品

/// 频道列表。
final channelsProvider = FutureProvider<List<Channel>>((ref) async {
  try {
    return await ref.read(productApiProvider).channels();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.channels();
  }
});

/// 频道商品列表（按频道类型参数化）。
final channelProductsProvider = FutureProvider.family<PagedResult<Product>,
    ({int channelId, String channelType})>((ref, args) async {
  try {
    return await ref.read(productApiProvider).channelProducts(
          channelId: args.channelId,
          channelType: args.channelType,
        );
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = ExpansionMock.channelProducts(args.channelType);
    return PagedResult<Product>(
      items: list,
      meta: PageMeta(
        page: 1,
        pageSize: list.length,
        total: list.length,
        totalPages: 1,
      ),
    );
  }
});

/// 商品参数。
final productParamsProvider =
    FutureProvider.family<List<ProductParam>, int>((ref, productId) async {
  try {
    return await ref.read(productApiProvider).productParams(productId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.productParams(productId);
  }
});

/// 商品问答。
final productQuestionsProvider =
    FutureProvider.family<List<ProductQuestion>, int>((ref, productId) async {
  try {
    return await ref.read(productApiProvider).productQuestions(productId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.productQuestions(productId);
  }
});

// ---------------------------------------------------------------- 评价

/// 评价筛选列表。[filter] 取值：all / good / medium / bad / has_image /
/// has_reply。
///
/// 后端 `/api/v1/reviews` 只支持商品与分页参数，筛选维度在客户端完成。
final reviewFilterProvider =
    FutureProvider.family<ReviewFilterData, ({int? productId, String filter})>(
        (ref, args) async {
  try {
    final result = await ref.read(productApiProvider).filteredReviews(
          productId: args.productId,
          pageSize: 100,
        );
    final all = result.$1;
    final filtered = all.where((r) => _matchReviewFilter(r, args.filter)).toList();
    return ReviewFilterData(filtered, result.$2, result.$3);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = MockData.reviews
        .where((r) => args.productId == null || r.productId == args.productId)
        .toList();
    final filtered =
        all.where((r) => _matchReviewFilter(r, args.filter)).toList();
    final good = all.where((r) => r.rating >= 4).length;
    final medium = all.where((r) => r.rating == 3).length;
    final bad = all.where((r) => r.rating <= 2).length;
    final average = all.isEmpty
        ? 0.0
        : all.map((r) => r.rating).reduce((a, b) => a + b) / all.length;
    return ReviewFilterData(
      filtered,
      ReviewSummary(
        total: all.length,
        good: good,
        medium: medium,
        bad: bad,
        average: average,
      ),
      PageMeta(
        page: 1,
        pageSize: filtered.length,
        total: filtered.length,
        totalPages: 1,
      ),
    );
  }
});

/// 评价筛选匹配规则。
bool _matchReviewFilter(Review review, String filter) {
  switch (filter) {
    case 'good':
      return review.rating >= 4;
    case 'medium':
      return review.rating == 3;
    case 'bad':
      return review.rating <= 2;
    case 'has_image':
      return review.images.isNotEmpty;
    case 'has_reply':
      return review.adminReply.isNotEmpty;
    default:
      return true;
  }
}

/// 我发表过的评价。
final myReviewsProvider =
    FutureProvider.family<(List<Review>, PageMeta), int>((ref, page) async {
  try {
    return await ref.read(productApiProvider).myReviews(page: page);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockData.reviews.take(6).toList();
    return (
      list,
      PageMeta(
        page: 1,
        pageSize: list.length,
        total: list.length,
        totalPages: 1,
      ),
    );
  }
});

/// 评价标签。
final reviewTagsProvider =
    FutureProvider.family<List<ReviewTag>, int?>((ref, productId) async {
  try {
    return await ref.read(productApiProvider).reviewTags(productId: productId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.reviewTags();
  }
});

// ---------------------------------------------------------------- 营销

/// 签到信息。
final signInProvider = FutureProvider<SignInInfo>((ref) async {
  try {
    return await ref.read(marketingApiProvider).signInInfo();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.signInInfo();
  }
});

/// 营销任务列表。
final tasksProvider = FutureProvider<List<MarketingTask>>((ref) async {
  try {
    return await ref.read(marketingApiProvider).tasks();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.tasks();
  }
});

/// 任务详情。
///
/// 后端未提供单任务查询接口，这里从任务列表中定位对应任务。
final taskDetailProvider =
    FutureProvider.family<MarketingTask, int>((ref, taskId) async {
  try {
    final tasks = await ref.read(marketingApiProvider).tasks();
    return tasks.firstWhere((task) => task.id == taskId,
        orElse: () => tasks.first);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = ExpansionMock.tasks();
    return all.firstWhere(
      (task) => task.id == taskId,
      orElse: () => all.first,
    );
  }
});

/// 按类型筛选的活动列表。
final promotionTypeProvider =
    FutureProvider.family<List<Promotion>, String>((ref, promotionType) async {
  try {
    return await ref
        .read(marketingApiProvider)
        .promotionsByType(promotionType);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return _mockPromotions(promotionType);
  }
});

/// 活动场次。
final promotionSessionsProvider =
    FutureProvider.family<List<PromotionSession>, int>((ref, promotionId) async {
  try {
    return await ref.read(marketingApiProvider).promotionSessions(promotionId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.promotionSessions(promotionId);
  }
});

/// 拼团列表。
final groupBuysProvider = FutureProvider<List<GroupBuy>>((ref) async {
  try {
    return await ref.read(marketingApiProvider).groupBuys();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.groupBuys();
  }
});

/// 拼团详情。
final groupBuyDetailProvider =
    FutureProvider.family<GroupBuy, int>((ref, id) async {
  try {
    return await ref.read(marketingApiProvider).groupBuyDetail(id);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = ExpansionMock.groupBuys();
    return all.firstWhere((item) => item.id == id, orElse: () => all.first);
  }
});

/// 我参与的拼团。
final myGroupBuysProvider = FutureProvider<List<GroupBuy>>((ref) async {
  try {
    return await ref.read(marketingApiProvider).myGroupBuys();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = ExpansionMock.groupBuys();
    return [
      all.first,
      GroupBuy(
        id: 299,
        title: '${all.last.title}（已成团）',
        description: all.last.description,
        productId: all.last.productId,
        productTitle: all.last.productTitle,
        cover: all.last.cover,
        priceCents: all.last.priceCents,
        originalPriceCents: all.last.originalPriceCents,
        requiredMembers: all.last.requiredMembers,
        joinedMembers: 3,
        startTime: all.last.startTime,
        endTime: all.last.endTime,
        status: 1,
        perUserLimit: 2,
        members: ExpansionMock.groupBuys()[1].members,
      ),
    ];
  }
});

List<Promotion> _mockPromotions(String promotionType) {
  final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  const names = <String, String>{
    'coupon': '满 199 减 30 优惠券',
    'discount': '全场 8.8 折',
    'flash': '整点限时秒杀',
    'presale': '新品定金膨胀预售',
    'groupbuy': '3 人拼团立减',
    'seckill': '每日 12 点场秒杀',
  };
  final name = names[promotionType] ?? '促销活动';
  return List<Promotion>.generate(3, (index) {
    return Promotion(
      id: 401 + index,
      name: '$name 第 ${index + 1} 期',
      description: '活动期间下单自动享受优惠，可与部分券叠加',
      type: promotionType == 'flash' ? 3 : (index + 1),
      status: 1,
      startTime: now - 86400,
      endTime: now + 86400 * 3,
      minAmountCents: 9900,
      discountCents: 3000,
      percent: 88,
      productId: MockData.products[index % MockData.products.length].id,
      limitPerUser: 2,
      soldCount: 120 - index * 20,
    );
  });
}

// ---------------------------------------------------------------- 订单与售后

/// 售后列表。
final afterSalesProvider = FutureProvider<PagedList<AfterSale>>((ref) async {
  try {
    return await ref.read(orderApiProvider).afterSales();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = ExpansionMock.afterSales();
    return PagedList<AfterSale>(
      items: list,
      total: list.length,
      page: 1,
    );
  }
});

/// 售后详情。
final afterSaleDetailProvider =
    FutureProvider.family<AfterSale, int>((ref, id) async {
  try {
    return await ref.read(orderApiProvider).afterSaleDetail(id);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = ExpansionMock.afterSales();
    return all.firstWhere((item) => item.id == id, orElse: () => all.first);
  }
});

/// 退款原因。
final refundReasonsProvider =
    FutureProvider<List<RefundReason>>((ref) async {
  try {
    return await ref.read(orderApiProvider).refundReasons();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.refundReasons();
  }
});

/// 下单前确认预览。
final orderConfirmProvider =
    FutureProvider.family<CheckoutPreview, ({int addressId, int couponId})>(
        (ref, args) async {
  try {
    return await ref.read(orderApiProvider).confirmOrder(
          addressId: args.addressId,
          couponId: args.couponId,
        );
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final products = MockData.products.take(2).toList();
    final total = products.fold<int>(
        0, (sum, p) => sum + p.minPriceCents);
    return CheckoutPreview(
      totalAmountCents: total,
      discountCents: 1000,
      couponDiscountCents: 500,
      pointsDiscountCents: 0,
      freightCents: 0,
      payableCents: total - 1500,
      availableCoupons: MockStore.instance.userCoupons(),
      activePromotions: _mockPromotions('discount'),
    );
  }
});

// ---------------------------------------------------------------- 物流

/// 快递公司。
final logisticsCompaniesProvider =
    FutureProvider<List<LogisticsCompany>>((ref) async {
  try {
    return await ref.read(logisticsApiProvider).companies();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.companies();
  }
});

/// 配送范围。
final deliveryRangesProvider =
    FutureProvider<List<DeliveryRange>>((ref) async {
  try {
    return await ref.read(logisticsApiProvider).ranges();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.ranges();
  }
});

/// 运费试算。
///
/// 参数与后端 `POST /api/v1/logistics/freight` 对齐：
/// templateId 运费模板、amountCents 订单金额、region 收货地区、quantity 件数。
final freightQuoteProvider = FutureProvider.family<FreightQuote,
    ({int templateId, int amountCents, String region, int quantity})>((ref, args) async {
  try {
    return await ref.read(logisticsApiProvider).freight(
          templateId: args.templateId,
          amountCents: args.amountCents,
          region: args.region,
          quantity: args.quantity,
        );
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.freight(args.region);
  }
});

/// 按运单号查询物流轨迹。
final trackingProvider =
    FutureProvider.family<LogisticsResult, String>((ref, trackingNo) async {
  try {
    return await ref.read(logisticsApiProvider).trackingByNo(trackingNo);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return LogisticsResult(
      shipment: MockData.demoShipment(0),
      tracks: MockData.demoTracks(0),
    );
  }
});

// ---------------------------------------------------------------- 消息

/// 消息分类。
final notificationCategoriesProvider =
    FutureProvider<List<NotificationCategory>>((ref) async {
  try {
    return await ref.read(notificationApiProvider).categories();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.notificationCategories();
  }
});

// ---------------------------------------------------------------- 资金

/// 充值配置。
final rechargeConfigProvider = FutureProvider<RechargeConfig>((ref) async {
  try {
    return await ref.read(paymentApiProvider).rechargeConfig();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.rechargeConfig();
  }
});

/// 充值记录。
final rechargesProvider =
    FutureProvider.family<PagedList<RechargeRecord>, int>((ref, page) async {
  try {
    return await ref.read(paymentApiProvider).recharges(page: page);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = ExpansionMock.recharges();
    return PagedList<RechargeRecord>(
      items: list,
      total: list.length,
      page: 1,
    );
  }
});

/// 余额流水。
final balanceLogsProvider =
    FutureProvider.family<PagedList<BalanceLog>, int>((ref, page) async {
  try {
    return await ref.read(paymentApiProvider).balanceLogs(page: page);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = ExpansionMock.balanceLogs();
    return PagedList<BalanceLog>(
      items: list,
      total: list.length,
      page: 1,
    );
  }
});

/// 支付渠道。
final payChannelsProvider = FutureProvider<List<PayChannel>>((ref) async {
  try {
    return await ref.read(paymentApiProvider).payChannels();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.payChannels();
  }
});

// ---------------------------------------------------------------- 用户中心

/// 我的会员等级。
final userLevelProvider = FutureProvider<UserLevelInfo>((ref) async {
  try {
    return await ref.read(userApiProvider).level();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.myLevelInfo();
  }
});

/// 全部会员等级。
final userLevelsProvider = FutureProvider<List<UserLevel>>((ref) async {
  try {
    return await ref.read(userApiProvider).levels();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.levels();
  }
});

/// 成长值明细。
final growthLogsProvider =
    FutureProvider.family<PagedList<GrowthLog>, int>((ref, page) async {
  try {
    return await ref.read(userApiProvider).growthLogs(page: page);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = ExpansionMock.growthLogs();
    return PagedList<GrowthLog>(
      items: list,
      total: list.length,
      page: 1,
    );
  }
});

/// 发票抬头模板。
final invoiceTemplatesProvider =
    FutureProvider<List<InvoiceTemplate>>((ref) async {
  try {
    return await ref.read(userApiProvider).invoiceTemplates();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.invoiceTemplates();
  }
});

/// 通知设置。
final notificationSettingsProvider =
    FutureProvider<List<NotificationSetting>>((ref) async {
  try {
    return await ref.read(userApiProvider).notificationSettings();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.notificationSettings();
  }
});

/// 账号安全信息。
final securityProvider = FutureProvider<SecurityInfo>((ref) async {
  try {
    return await ref.read(userApiProvider).security();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.security();
  }
});

// ---------------------------------------------------------------- 内容

/// 帮助文章列表。
final helpArticlesProvider =
    FutureProvider.family<List<HelpArticle>, String>((ref, category) async {
  try {
    return await ref.read(contentApiProvider).helpArticles(category: category);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.helpArticles(category: category);
  }
});

/// 帮助文章详情。
final helpArticleProvider =
    FutureProvider.family<HelpArticle, int>((ref, id) async {
  try {
    return await ref.read(contentApiProvider).helpArticle(id);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final all = ExpansionMock.helpArticles();
    return all.firstWhere((item) => item.id == id, orElse: () => all.first);
  }
});

/// 行政区域。
final regionsProvider =
    FutureProvider.family<List<Region>, int>((ref, parentId) async {
  try {
    return await ref.read(contentApiProvider).regions(parentId: parentId);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ExpansionMock.regions(parentId: parentId);
  }
});

// ---------------------------------------------------------------- 写操作

/// 扩量页面的写操作集合（后端不可用时回落到本地演示状态）。
class ExpansionActions {
  ExpansionActions(this.ref);

  final Ref ref;

  /// 签到。
  Future<String> signIn() async {
    try {
      final info = await ref.read(marketingApiProvider).signIn();
      ref.invalidate(signInProvider);
      return '签到成功，获得 ${info.rewardPoints} 积分';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(signInProvider);
      return '签到成功，获得 8 积分';
    }
  }

  /// 领取任务奖励。
  Future<String> claimTask(int taskId) async {
    try {
      final task = await ref.read(marketingApiProvider).claimTaskReward(taskId);
      ref.invalidate(taskDetailProvider(taskId));
      ref.invalidate(tasksProvider);
      return '已领取「${task.title}」奖励';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(tasksProvider);
      return '已领取任务奖励';
    }
  }

  /// 参与拼团。
  Future<String> joinGroupBuy(int id) async {
    try {
      final group = await ref.read(marketingApiProvider).joinGroupBuy(id);
      ref.invalidate(groupBuyDetailProvider(id));
      ref.invalidate(groupBuysProvider);
      return '已参团，当前 ${group.joinedMembers}/${group.requiredMembers} 人';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(groupBuyDetailProvider(id));
      ref.invalidate(groupBuysProvider);
      return '已参团，等待其他成员加入';
    }
  }

  /// 提交售后申请。
  Future<String> createAfterSale({
    required int orderId,
    required int type,
    required String reason,
    int amountCents = 0,
    String description = '',
  }) async {
    try {
      final sale = await ref.read(orderApiProvider).createAfterSale(
            orderId: orderId,
            type: type,
            reason: reason,
            amountCents: amountCents,
            description: description,
          );
      ref.invalidate(afterSalesProvider);
      return '售后申请已提交（单号 #${sale.id}）';
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(afterSalesProvider);
      return '售后申请已提交，审核结果将在 24 小时内通知你';
    }
  }

  /// 更新通知设置。
  Future<String> updateNotificationSetting(
      String category, bool enabled) async {
    final current = ref.read(notificationSettingsProvider).asData?.value ??
        ExpansionMock.notificationSettings();
    try {
      await ref.read(userApiProvider).updateNotificationSetting(
            current: current,
            category: category,
            enabled: enabled,
          );
      ref.invalidate(notificationSettingsProvider);
      return '设置已保存';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(notificationSettingsProvider);
      return '设置已保存';
    }
  }

  /// 新增发票抬头模板。
  Future<String> createInvoiceTemplate({
    required String title,
    String taxNo = '',
    String type = 'personal',
    String email = '',
  }) async {
    try {
      await ref.read(userApiProvider).createInvoiceTemplate(
            title: title,
            taxNo: taxNo,
            type: type,
            email: email,
          );
      ref.invalidate(invoiceTemplatesProvider);
      return '发票抬头已保存';
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(invoiceTemplatesProvider);
      return '发票抬头已保存';
    }
  }

  /// 删除发票抬头模板。
  Future<String> deleteInvoiceTemplate(int id) async {
    try {
      await ref.read(userApiProvider).deleteInvoiceTemplate(id);
      ref.invalidate(invoiceTemplatesProvider);
      return '发票抬头已删除';
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(invoiceTemplatesProvider);
      return '发票抬头已删除';
    }
  }

  /// 提交实名认证。
  Future<String> realname({
    required String realName,
    required String idCard,
  }) async {
    try {
      final ok = await ref.read(userApiProvider).realname(
            realName: realName,
            idCard: idCard,
          );
      ref.invalidate(securityProvider);
      return ok ? '实名认证已提交' : '实名认证提交失败，请检查信息';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(securityProvider);
      return '实名认证已提交，请等待审核';
    }
  }

  /// 提交意见反馈。
  Future<String> feedback({
    required String content,
    int type = 1,
    String contact = '',
  }) async {
    try {
      final ok = await ref.read(userApiProvider).feedback(
            content: content,
            type: type,
            contact: contact,
          );
      return ok ? '反馈已提交，感谢你的建议' : '反馈提交失败，请稍后重试';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      return '反馈已提交，感谢你的建议';
    }
  }

  /// 发起充值。
  Future<String> recharge(int amountCents) async {
    try {
      final record = await ref.read(paymentApiProvider).recharge(
            amountCents: amountCents,
          );
      ref.invalidate(rechargesProvider(1));
      return '充值订单 ${record.rechargeNo} 已创建';
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      ref.invalidate(rechargesProvider(1));
      return '充值订单已创建';
    }
  }
}

/// 写操作入口。
final expansionActionsProvider = Provider<ExpansionActions>(
  ExpansionActions.new,
);
