import '../models/expansion.dart';
import '../models/marketing.dart';
import 'api_client.dart';
import '../utils/json_util.dart';

/// 营销（优惠券、活动）接口。
class MarketingApi {
  MarketingApi(this.client);

  final ApiClient client;

  /// 我的优惠券。
  ///
  /// 后端 ListUserCoupons 不会从令牌推导用户，需要显式传入 user_id。
  Future<List<UserCoupon>> userCoupons({int userId = 0, int? status}) async {
    final data = await client.get('/users/coupons', query: {
      'user_id': userId,
      'status': ?status,
      'page.page': 1,
      'page.page_size': 100,
    });
    return JsonUtil.asMapList(data['coupons']).map(UserCoupon.fromJson).toList();
  }

  /// 领取优惠券。
  ///
  /// 后端 ReceiveCoupon 同样需要显式传入 user_id。
  Future<UserCoupon> receiveCoupon({
    required int couponId,
    required int userId,
  }) async {
    final data = await client.post('/coupons/$couponId/receive', body: {
      'user_id': userId,
    });
    return UserCoupon.fromJson(data);
  }

  /// 可领取的优惠券。
  Future<List<Coupon>> availableCoupons() async {
    final data = await client.get('/coupons', query: {
      'available': true,
      'page.page': 1,
      'page.page_size': 100,
    });
    return JsonUtil.asMapList(data['coupons']).map(Coupon.fromJson).toList();
  }

  /// 促销活动。
  Future<List<Promotion>> promotions({int? status}) async {
    final data = await client.get('/promotions', query: {
      'status': ?status,
      'page.page': 1,
      'page.page_size': 100,
    });
    return JsonUtil.asMapList(data['promotions']).map(Promotion.fromJson).toList();
  }

  /// 结算预览。
  Future<CheckoutPreview> previewCheckout({
    List<Map<String, dynamic>> items = const <Map<String, dynamic>>[],
    int addressId = 0,
    int couponId = 0,
    int pointsUsed = 0,
  }) async {
    final data = await client.post('/marketing/preview', body: {
      'items': items,
      'address_id': addressId,
      'coupon_id': couponId,
      'points_used': pointsUsed,
    });
    return CheckoutPreview.fromJson(data);
  }

  /// 签到信息（连续天数、奖励与当月日历）。
  Future<SignInInfo> signInInfo() async {
    final data = await client.get('/marketing/sign-in');
    return SignInInfo.fromJson(data);
  }

  /// 执行签到。
  Future<SignInInfo> signIn() async {
    final data = await client.post('/marketing/sign-in');
    return SignInInfo.fromJson(data);
  }

  /// 营销任务列表。
  Future<List<MarketingTask>> tasks() async {
    final data = await client.get('/marketing/tasks');
    return JsonUtil.asMapList(data['tasks']).map(MarketingTask.fromJson).toList();
  }

  /// 任务详情。
  Future<MarketingTask> taskDetail(int taskId) async {
    final data = await client.get('/marketing/tasks/$taskId');
    return MarketingTask.fromJson(data);
  }

  /// 领取任务奖励。
  Future<MarketingTask> claimTaskReward(int taskId) async {
    final data = await client.post('/marketing/tasks/$taskId/claim');
    return MarketingTask.fromJson(data);
  }

  /// 活动场次。
  Future<List<PromotionSession>> promotionSessions(int promotionId) async {
    final data = await client.get('/promotions/$promotionId/sessions');
    return JsonUtil.asMapList(data['sessions'])
        .map(PromotionSession.fromJson)
        .toList();
  }

  /// 按类型筛选促销活动。
  ///
  /// 后端 `Promotion.type` 取值：1 满减 2 折扣 3 秒杀 4 拼团。
  /// [promotionType] 取值：all / coupon / discount / flash / presale /
  /// groupbuy / seckill；无对应后端类型时（预售）不传 type，由客户端过滤。
  Future<List<Promotion>> promotionsByType(String promotionType) async {
    final type = _promotionTypeCode(promotionType);
    final data = await client.get('/promotions', query: {
      'type': ?type,
      'page.page': 1,
      'page.page_size': 100,
    });
    final list = JsonUtil.asMapList(data['promotions'])
        .map(Promotion.fromJson)
        .toList();
    if (promotionType != 'presale') return list;
    return list
        .where((p) =>
            p.name.contains('预售') || p.description.contains('预售'))
        .toList();
  }

  /// 活动维度到后端 `Promotion.type` 的映射。
  static int? _promotionTypeCode(String promotionType) {
    switch (promotionType) {
      case 'coupon':
      case 'discount':
        return 1;
      case 'flash':
      case 'seckill':
        return 3;
      case 'groupbuy':
        return 4;
      case 'presale':
        return null;
      default:
        return null;
    }
  }

  /// 拼团列表。
  Future<List<GroupBuy>> groupBuys({int? status}) async {
    final data = await client.get('/group-buys', query: {
      'status': ?status,
      'page.page': 1,
      'page.page_size': 50,
    });
    return JsonUtil.asMapList(data['groupBuys']).map(GroupBuy.fromJson).toList();
  }

  /// 拼团详情。
  ///
  /// 后端返回 `{group_buy, members}`，这里合并成 [GroupBuy]。
  Future<GroupBuy> groupBuyDetail(int id) async {
    final data = await client.get('/group-buys/$id');
    final group = JsonUtil.asMap(data['groupBuy']);
    final members = JsonUtil.asMapList(data['members'])
        .map(GroupBuyMember.fromJson)
        .toList();
    return GroupBuy(
      id: JsonUtil.intOf(group, 'id'),
      title: JsonUtil.stringOf(group, 'name'),
      description: JsonUtil.stringOf(group, 'description'),
      promotionId: JsonUtil.intOf(group, 'promotionId'),
      productId: JsonUtil.intOf(group, 'productId'),
      productTitle: JsonUtil.stringOf(group, 'productTitle'),
      cover: JsonUtil.stringOf(group, 'productImage'),
      bannerImage: JsonUtil.stringOf(group, 'bannerImage'),
      priceCents: JsonUtil.intOf(group, 'priceCents'),
      originalPriceCents: JsonUtil.intOf(group, 'originalPriceCents'),
      requiredMembers: JsonUtil.intOf(group, 'requiredMembers', 3),
      joinedMembers: JsonUtil.intOf(group, 'joinedMembers'),
      groupSize: JsonUtil.intOf(group, 'groupSize'),
      startTime: JsonUtil.intOf(group, 'startTime'),
      endTime: JsonUtil.intOf(group, 'endTime'),
      status: JsonUtil.intOf(group, 'status'),
      members: members,
    );
  }

  /// 参与拼团。
  Future<GroupBuy> joinGroupBuy(int id, {int quantity = 1}) async {
    final data = await client.post('/group-buys/$id/join', body: {
      'id': id,
      'quantity': quantity,
    });
    return GroupBuy.fromJson(data);
  }

  /// 我参与的拼团。
  Future<List<GroupBuy>> myGroupBuys() async {
    final data = await client.get('/users/group-buys', query: {
      'page.page': 1,
      'page.page_size': 50,
    });
    return JsonUtil.asMapList(data['groupBuys']).map(GroupBuy.fromJson).toList();
  }
}
