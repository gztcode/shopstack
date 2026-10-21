import '../utils/json_util.dart';

/// 阶段 3 扩量页面对应的数据模型。
///
/// 约定：后端返回 snake_case，拦截器已在网络层转成 camelCase；
/// 模型内部统一使用 camelCase 字段，解析时兼容两种写法。
/// 字段定义与 `proto/shopstack/**` 保持一致。

/// 取 snake 优先、camel 回退的整数字段。
int _int(Map<String, dynamic> json, String snake, String camel,
    [int fallback = 0]) =>
    JsonUtil.intOf(json, snake, JsonUtil.intOf(json, camel, fallback));

/// 取 snake 优先、camel 回退的字符串字段。
String _str(Map<String, dynamic> json, String snake, String camel,
    [String fallback = '']) =>
    JsonUtil.stringOf(json, snake, JsonUtil.stringOf(json, camel, fallback));

/// 取 snake 优先、camel 回退的布尔字段。
bool _bool(Map<String, dynamic> json, String snake, String camel,
    [bool fallback = false]) =>
    JsonUtil.boolOf(json, snake, JsonUtil.boolOf(json, camel, fallback));

/// 通用「列表 + 分页」响应包装。
class PagedList<T> {
  const PagedList({required this.items, this.total = 0, this.page = 1});

  final List<T> items;
  final int total;
  final int page;

  bool get isEmpty => items.isEmpty;
}

/// 频道，对应 `GET /api/v1/channels`。
class Channel {
  const Channel({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.icon = '',
    this.bannerUrl = '',
    this.description = '',
    this.sort = 0,
    this.type = 0,
    this.status = 1,
    this.productCount = 0,
    this.createdAt = '',
  });

  final int id;
  final String name;
  final String code;
  final String icon;
  final String bannerUrl;
  final String description;
  final int sort;

  /// 1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 楼层。
  final int type;

  /// 0 停用 1 启用。
  final int status;
  final int productCount;
  final String createdAt;

  bool get visible => status == 1;

  factory Channel.fromJson(Map<String, dynamic> json) => Channel(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        code: _str(json, 'code', 'code'),
        icon: _str(json, 'icon', 'icon'),
        bannerUrl: _str(json, 'banner_url', 'bannerUrl'),
        description: _str(json, 'description', 'description'),
        sort: _int(json, 'sort', 'sort'),
        type: _int(json, 'type', 'type'),
        status: _int(json, 'status', 'status', 1),
        productCount:
            _int(json, 'product_count', 'productCount'),
        createdAt: _str(json, 'created_at', 'createdAt'),
      );
}

/// 商品参数项，对应 `GET /api/v1/products/{id}/params`。
class ProductParam {
  const ProductParam({
    this.id = 0,
    this.productId = 0,
    this.name = '',
    this.value = '',
    this.sort = 0,
  });

  final int id;
  final int productId;
  final String name;
  final String value;
  final int sort;

  factory ProductParam.fromJson(Map<String, dynamic> json) => ProductParam(
        id: _int(json, 'id', 'id'),
        productId: _int(json, 'product_id', 'productId'),
        name: _str(json, 'name', 'name'),
        value: _str(json, 'value', 'value'),
        sort: _int(json, 'sort', 'sort'),
      );
}

/// 商品问答，对应 `GET /api/v1/products/{id}/questions`。
class ProductQuestion {
  const ProductQuestion({
    this.id = 0,
    this.productId = 0,
    this.productTitle = '',
    this.userId = 0,
    this.userNickname = '',
    this.question = '',
    this.images = const <String>[],
    this.answer = '',
    this.createdAt = '',
    this.answeredAt = '',
  });

  final int id;
  final int productId;
  final String productTitle;
  final int userId;
  final String userNickname;

  /// 提问正文（后端字段 `content`）。
  final String question;
  final List<String> images;

  /// 商家回复（后端字段 `reply`）。
  final String answer;
  final String createdAt;

  /// 回复时间（后端字段 `reply_at`）。
  final String answeredAt;

  bool get answered => answer.isNotEmpty;

  factory ProductQuestion.fromJson(Map<String, dynamic> json) =>
      ProductQuestion(
        id: _int(json, 'id', 'id'),
        productId: _int(json, 'product_id', 'productId'),
        productTitle: _str(json, 'product_title', 'productTitle'),
        userId: _int(json, 'user_id', 'userId'),
        userNickname: _str(json, 'user_nickname', 'userNickname'),
        question: _str(json, 'content', 'content'),
        images: JsonUtil.asStringList(json['images']),
        answer: _str(json, 'reply', 'reply'),
        createdAt: _str(json, 'created_at', 'createdAt'),
        answeredAt: _str(json, 'reply_at', 'replyAt'),
      );
}

/// 评价标签，对应 `GET /api/v1/reviews/tags`。
class ReviewTag {
  const ReviewTag({
    this.id = 0,
    this.name = '',
    this.count = 0,
    this.sort = 0,
    this.enabled = true,
  });

  final int id;
  final String name;

  /// 后端未返回计数时为 0。
  final int count;
  final int sort;
  final bool enabled;

  factory ReviewTag.fromJson(Map<String, dynamic> json) => ReviewTag(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        count: _int(json, 'count', 'count'),
        sort: _int(json, 'sort', 'sort'),
        enabled: _bool(json, 'enabled', 'enabled', true),
      );
}

/// 签到日历中的一天。
class SignInDay {
  const SignInDay({
    required this.date,
    this.signed = false,
    this.rewardPoints = 0,
  });

  final DateTime date;
  final bool signed;

  /// 当日获得的积分（后端字段 `points`）。
  final int rewardPoints;

  Map<String, dynamic> toJson() => {
        'date': date.toIso8601String(),
        'signed': signed,
        'reward_points': rewardPoints,
      };
}

/// 签到信息，对应 `GET/POST /api/v1/marketing/sign-in`。
class SignInInfo {
  const SignInInfo({
    this.signedToday = false,
    this.continuousDays = 0,
    this.totalDays = 0,
    this.rewardPoints = 0,
    this.nextPoints = 0,
    this.calendar = const <SignInDay>[],
  });

  final bool signedToday;
  final int continuousDays;
  final int totalDays;

  /// 本次签到获得的积分（后端字段 `points_awarded`）。
  final int rewardPoints;

  /// 下次签到可得积分（后端字段 `next_points`）。
  final int nextPoints;
  final List<SignInDay> calendar;

  factory SignInInfo.fromJson(Map<String, dynamic> json) => SignInInfo(
        signedToday: _bool(json, 'signed_today', 'signedToday'),
        continuousDays: _int(json, 'continuous_days', 'continuousDays'),
        totalDays: _int(json, 'total_days', 'totalDays'),
        rewardPoints:
            _int(json, 'points_awarded', 'pointsAwarded'),
        nextPoints: _int(json, 'next_points', 'nextPoints'),
        calendar: JsonUtil.asMapList(json['calendar'])
            .map((item) => SignInDay(
                  date: DateTime.tryParse(_str(item, 'date', 'date')) ??
                      DateTime.now(),
                  signed: _bool(item, 'signed', 'signed'),
                  rewardPoints: _int(item, 'points', 'points'),
                ))
            .toList(),
      );
}

/// 营销任务，对应 `GET /api/v1/marketing/tasks`（后端为 UserTask）。
class MarketingTask {
  const MarketingTask({
    this.id = 0,
    this.title = '',
    this.description = '',
    this.type = 0,
    this.target = 0,
    this.progress = 0,
    this.completed = false,
    this.claimed = false,
    this.rewardPoints = 0,
    this.rewardCents = 0,
    this.rewardCouponId = 0,
    this.icon = '',
    this.actionText = '',
  });

  final int id;
  final String title;
  final String description;

  /// 1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请。
  final int type;
  final int target;
  final int progress;
  final bool completed;

  /// 奖励是否已领取。
  final bool claimed;
  final int rewardPoints;
  final int rewardCents;
  final int rewardCouponId;
  final String icon;
  final String actionText;

  double get progressRatio =>
      target <= 0 ? 0 : (progress / target).clamp(0.0, 1.0).toDouble();

  /// 任务类型的可读名称。
  String get typeLabel => const [
        '任务',
        '浏览',
        '下单',
        '分享',
        '评价',
        '签到',
        '邀请',
      ][type.clamp(0, 6)];

  factory MarketingTask.fromJson(Map<String, dynamic> json) => MarketingTask(
        id: _int(json, 'task_id', 'taskId', _int(json, 'id', 'id')),
        title: _str(json, 'name', 'name'),
        description: _str(json, 'description', 'description'),
        type: _int(json, 'type', 'type'),
        target: _int(json, 'target_count', 'targetCount'),
        progress: _int(json, 'progress', 'progress'),
        completed: _bool(json, 'completed', 'completed'),
        claimed: _bool(json, 'claimed', 'claimed'),
        rewardPoints: _int(json, 'reward_points', 'rewardPoints'),
        rewardCents: _int(json, 'reward_cents', 'rewardCents'),
        rewardCouponId: _int(json, 'reward_coupon_id', 'rewardCouponId'),
        icon: _str(json, 'icon', 'icon'),
        actionText: _str(json, 'action_text', 'actionText'),
      );
}

/// 活动场次，对应 `GET /api/v1/promotions/{id}/sessions`。
class PromotionSession {
  const PromotionSession({
    this.id = 0,
    this.promotionId = 0,
    this.name = '',
    this.startTime = 0,
    this.endTime = 0,
    this.status = 0,
    this.stock = 0,
    this.soldCount = 0,
  });

  final int id;
  final int promotionId;
  final String name;
  final int startTime;
  final int endTime;

  /// 0 未开始 1 进行中 2 已结束。
  final int status;
  final int stock;
  final int soldCount;

  String get statusLabel =>
      const ['未开始', '进行中', '已结束'][status.clamp(0, 2)];

  factory PromotionSession.fromJson(Map<String, dynamic> json) =>
      PromotionSession(
        id: _int(json, 'id', 'id'),
        promotionId: _int(json, 'promotion_id', 'promotionId'),
        name: _str(json, 'name', 'name'),
        startTime: _int(json, 'start_time', 'startTime'),
        endTime: _int(json, 'end_time', 'endTime'),
        status: _int(json, 'status', 'status'),
        stock: _int(json, 'stock', 'stock'),
        soldCount: _int(json, 'sold_count', 'soldCount'),
      );
}

/// 拼团成员。
class GroupBuyMember {
  const GroupBuyMember({
    this.id = 0,
    this.groupBuyId = 0,
    this.userId = 0,
    this.nickname = '',
    this.avatar = '',
    this.joinedAt = '',
    this.isLeader = false,
  });

  final int id;
  final int groupBuyId;
  final int userId;
  final String nickname;
  final String avatar;
  final String joinedAt;
  final bool isLeader;

  factory GroupBuyMember.fromJson(Map<String, dynamic> json) =>
      GroupBuyMember(
        id: _int(json, 'id', 'id'),
        groupBuyId: _int(json, 'group_buy_id', 'groupBuyId'),
        userId: _int(json, 'user_id', 'userId'),
        nickname: _str(json, 'userNickname', 'userNickname',
            _str(json, 'nickname', 'nickname')),
        avatar: _str(json, 'avatar', 'avatar'),
        joinedAt: _str(json, 'joined_at', 'joinedAt'),
        isLeader: _bool(json, 'is_leader', 'isLeader'),
      );
}

/// 拼团活动，对应 `GET /api/v1/group-buys`。
class GroupBuy {
  const GroupBuy({
    this.id = 0,
    this.title = '',
    this.description = '',
    this.promotionId = 0,
    this.productId = 0,
    this.productTitle = '',
    this.cover = '',
    this.bannerImage = '',
    this.priceCents = 0,
    this.originalPriceCents = 0,
    this.requiredMembers = 3,
    this.joinedMembers = 0,
    this.groupSize = 0,
    this.startTime = 0,
    this.endTime = 0,
    this.status = 0,
    this.perUserLimit = 1,
    this.members = const <GroupBuyMember>[],
  });

  final int id;

  /// 拼团名称（后端字段 `name`）。
  final String title;
  final String description;
  final int promotionId;
  final int productId;
  final String productTitle;

  /// 商品主图（后端字段 `product_image`）。
  final String cover;

  /// 拼团横幅（后端字段 `banner_image`）。
  final String bannerImage;
  final int priceCents;
  final int originalPriceCents;
  final int requiredMembers;
  final int joinedMembers;

  /// 拼团库存上限（后端字段 `group_size`）。
  final int groupSize;
  final int startTime;
  final int endTime;

  /// 0 未开始 1 进行中 2 已结束 3 已下线。
  final int status;
  final int perUserLimit;
  final List<GroupBuyMember> members;

  String get statusLabel =>
      const ['未开始', '进行中', '已结束', '已下线'][status.clamp(0, 3)];

  bool get running => status == 1;

  factory GroupBuy.fromJson(Map<String, dynamic> json) => GroupBuy(
        id: _int(json, 'id', 'id'),
        title: _str(json, 'name', 'name'),
        description: _str(json, 'description', 'description'),
        promotionId: _int(json, 'promotion_id', 'promotionId'),
        productId: _int(json, 'product_id', 'productId'),
        productTitle: _str(json, 'product_title', 'productTitle'),
        cover: _str(json, 'product_image', 'productImage'),
        bannerImage: _str(json, 'banner_image', 'bannerImage'),
        priceCents: _int(json, 'price_cents', 'priceCents'),
        originalPriceCents:
            _int(json, 'original_price_cents', 'originalPriceCents'),
        requiredMembers: _int(json, 'required_members', 'requiredMembers', 3),
        joinedMembers: _int(json, 'joined_members', 'joinedMembers'),
        groupSize: _int(json, 'group_size', 'groupSize'),
        startTime: _int(json, 'start_time', 'startTime'),
        endTime: _int(json, 'end_time', 'endTime'),
        status: _int(json, 'status', 'status'),
        perUserLimit: _int(json, 'per_user_limit', 'perUserLimit', 1),
        members: JsonUtil.asMapList(json['members'])
            .map(GroupBuyMember.fromJson)
            .toList(),
      );
}

/// 售后单，对应 `GET /api/v1/after-sales`。
class AfterSale {
  const AfterSale({
    this.id = 0,
    this.afterSaleNo = '',
    this.orderId = 0,
    this.orderNo = '',
    this.userId = 0,
    this.userNickname = '',
    this.type = 0,
    this.status = 0,
    this.amountCents = 0,
    this.reason = '',
    this.description = '',
    this.itemIds = const <int>[],
    this.adminRemark = '',
    this.createdAt = '',
    this.processedAt = '',
  });

  final int id;
  final String afterSaleNo;
  final int orderId;
  final String orderNo;
  final int userId;
  final String userNickname;

  /// 1 仅退款 2 退货退款 3 换货。
  final int type;

  /// 0 待审核 1 审核通过 2 审核驳回 3 已退款 4 已完成。
  final int status;
  final int amountCents;
  final String reason;
  final String description;
  final List<int> itemIds;
  final String adminRemark;
  final String createdAt;
  final String processedAt;

  String get typeLabel =>
      const ['售后', '仅退款', '退货退款', '换货'][type.clamp(0, 3)];

  String get statusLabel =>
      const ['待审核', '审核通过', '审核驳回', '已退款', '已完成'][status.clamp(0, 4)];

  factory AfterSale.fromJson(Map<String, dynamic> json) => AfterSale(
        id: _int(json, 'id', 'id'),
        afterSaleNo: _str(json, 'after_sale_no', 'afterSaleNo'),
        orderId: _int(json, 'order_id', 'orderId'),
        orderNo: _str(json, 'order_no', 'orderNo'),
        userId: _int(json, 'user_id', 'userId'),
        userNickname: _str(json, 'user_nickname', 'userNickname'),
        type: _int(json, 'type', 'type'),
        status: _int(json, 'status', 'status'),
        amountCents: _int(json, 'amount_cents', 'amountCents'),
        reason: _str(json, 'reason', 'reason'),
        description: _str(json, 'description', 'description'),
        itemIds: JsonUtil.asIntList(json['itemIds'] ?? json['item_ids']),
        adminRemark: _str(json, 'admin_remark', 'adminRemark'),
        createdAt: _str(json, 'created_at', 'createdAt'),
        processedAt: _str(json, 'processed_at', 'processedAt'),
      );
}

/// 退款原因，对应 `GET /api/v1/refund-reasons`。
class RefundReason {
  const RefundReason({
    this.id = 0,
    this.name = '',
    this.description = '',
    this.type = 0,
    this.sort = 0,
    this.enabled = true,
  });

  final int id;
  final String name;
  final String description;

  /// 1 仅退款 2 退货退款 3 换货。
  final int type;
  final int sort;
  final bool enabled;

  factory RefundReason.fromJson(Map<String, dynamic> json) => RefundReason(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        description: _str(json, 'description', 'description'),
        type: _int(json, 'type', 'type'),
        sort: _int(json, 'sort', 'sort'),
        enabled: _bool(json, 'enabled', 'enabled', true),
      );
}

/// 快递公司，对应 `GET /api/v1/logistics/companies`。
class LogisticsCompany {
  const LogisticsCompany({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.phone = '',
    this.logo = '',
    this.enabled = true,
    this.supportsCod = false,
    this.sort = 0,
  });

  final int id;
  final String name;
  final String code;
  final String phone;
  final String logo;
  final bool enabled;

  /// 是否支持货到付款。
  final bool supportsCod;
  final int sort;

  factory LogisticsCompany.fromJson(Map<String, dynamic> json) =>
      LogisticsCompany(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        code: _str(json, 'code', 'code'),
        phone: _str(json, 'phone', 'phone'),
        logo: _str(json, 'logo', 'logo'),
        enabled: _bool(json, 'enabled', 'enabled', true),
        supportsCod: _bool(json, 'supports_cod', 'supportsCod'),
        sort: _int(json, 'sort', 'sort'),
      );
}

/// 配送范围，对应 `GET /api/v1/logistics/ranges`。
class DeliveryRange {
  const DeliveryRange({
    this.id = 0,
    this.templateId = 0,
    this.templateName = '',
    this.regions = '',
    this.freightCents = 0,
    this.freeFreightAmountCents = 0,
    this.enabled = true,
  });

  final int id;
  final int templateId;

  /// 运费模板名称（后端字段 `template_name`）。
  final String templateName;

  /// 覆盖地区（后端字段 `regions`）。
  final String regions;
  final int freightCents;

  /// 免运费门槛金额（后端字段 `free_freight_amount_cents`）。
  final int freeFreightAmountCents;
  final bool enabled;

  /// 是否满额包邮（无门槛视为包邮）。
  bool get freeShipping => freeFreightAmountCents <= 0;

  factory DeliveryRange.fromJson(Map<String, dynamic> json) => DeliveryRange(
        id: _int(json, 'id', 'id'),
        templateId: _int(json, 'template_id', 'templateId'),
        templateName: _str(json, 'template_name', 'templateName'),
        regions: _str(json, 'regions', 'regions'),
        freightCents: _int(json, 'freight_cents', 'freightCents'),
        freeFreightAmountCents:
            _int(json, 'free_freight_amount_cents', 'freeFreightAmountCents'),
        enabled: _bool(json, 'enabled', 'enabled', true),
      );
}

/// 运费试算结果，对应 `POST /api/v1/logistics/freight`。
class FreightQuote {
  const FreightQuote({
    this.freightCents = 0,
    this.freeFreightAmountCents = 0,
    this.free = false,
    this.templateName = '',
    this.remark = '',
  });

  /// 运费（分）
  final int freightCents;

  /// 免运费门槛（分）
  final int freeFreightAmountCents;

  /// 是否免运费
  final bool free;

  /// 命中的运费模板名称
  final String templateName;

  /// 计价说明
  final String remark;

  factory FreightQuote.fromJson(Map<String, dynamic> json) => FreightQuote(
        freightCents: _int(json, 'freight_cents', 'freightCents'),
        freeFreightAmountCents:
            _int(json, 'free_freight_amount_cents', 'freeFreightAmountCents'),
        free: _bool(json, 'free', 'free'),
        templateName: _str(json, 'template_name', 'templateName'),
        remark: _str(json, 'remark', 'remark'),
      );
}

/// 会员等级，对应 `GET /api/v1/marketing/levels`。
class UserLevel {
  const UserLevel({
    this.id = 0,
    this.level = 1,
    this.name = '',
    this.growthValue = 0,
    this.minGrowth = 0,
    this.maxGrowth = 0,
    this.discountPercent = 100,
    this.icon = '',
    this.description = '',
    this.benefits = const <String>[],
    this.sort = 0,
  });

  final int id;
  final int level;
  final String name;
  final int growthValue;
  final int minGrowth;
  final int maxGrowth;
  final int discountPercent;
  final String icon;
  final String description;
  final List<String> benefits;
  final int sort;

  factory UserLevel.fromJson(Map<String, dynamic> json) => UserLevel(
        id: _int(json, 'id', 'id'),
        level: _int(json, 'level', 'level', 1),
        name: _str(json, 'name', 'name'),
        growthValue: _int(json, 'growth_value', 'growthValue'),
        minGrowth: _int(json, 'min_growth', 'minGrowth'),
        maxGrowth: _int(json, 'max_growth', 'maxGrowth'),
        discountPercent:
            _int(json, 'discount_percent', 'discountPercent', 100),
        icon: _str(json, 'icon', 'icon'),
        description: _str(json, 'description', 'description'),
        benefits: JsonUtil.asStringList(json['benefits']),
        sort: _int(json, 'sort', 'sort'),
      );
}

/// 我的会员等级信息，对应 `GET /api/v1/users/level`。
class UserLevelInfo {
  const UserLevelInfo({
    this.level = 1,
    this.levelName = '',
    this.growth = 0,
    this.currentMinGrowth = 0,
    this.nextMinGrowth = 0,
    this.growthToNext = 0,
    this.discountPercent = 100,
    this.nextLevelName = '',
    this.levels = const <UserLevel>[],
  });

  final int level;
  final String levelName;
  final int growth;
  final int currentMinGrowth;
  final int nextMinGrowth;
  final int growthToNext;
  final int discountPercent;
  final String nextLevelName;
  final List<UserLevel> levels;

  factory UserLevelInfo.fromJson(Map<String, dynamic> json) => UserLevelInfo(
        level: _int(json, 'level', 'level', 1),
        levelName: _str(json, 'level_name', 'levelName'),
        growth: _int(json, 'growth', 'growth'),
        currentMinGrowth: _int(json, 'current_min_growth', 'currentMinGrowth'),
        nextMinGrowth: _int(json, 'next_min_growth', 'nextMinGrowth'),
        growthToNext: _int(json, 'growth_to_next', 'growthToNext'),
        discountPercent:
            _int(json, 'discount_percent', 'discountPercent', 100),
        nextLevelName: _str(json, 'next_level_name', 'nextLevelName'),
        levels: JsonUtil.asMapList(json['levels']).map(UserLevel.fromJson).toList(),
      );
}

/// 成长值明细，对应 `GET /api/v1/users/growth-logs`。
class GrowthLog {
  const GrowthLog({
    this.id = 0,
    this.userId = 0,
    this.source = '',
    this.amount = 0,
    this.balance = 0,
    this.remark = '',
    this.createdAt = '',
  });

  final int id;
  final int userId;

  /// 业务类型（后端字段 `biz_type`）。
  final String source;

  /// 变动值（后端字段 `change`）。
  final int amount;
  final int balance;

  /// 标题（后端字段 `title`）。
  final String remark;
  final String createdAt;

  factory GrowthLog.fromJson(Map<String, dynamic> json) => GrowthLog(
        id: _int(json, 'id', 'id'),
        userId: _int(json, 'user_id', 'userId'),
        source: _str(json, 'biz_type', 'bizType'),
        amount: _int(json, 'change', 'change'),
        balance: _int(json, 'balance', 'balance'),
        remark: _str(json, 'title', 'title'),
        createdAt: _str(json, 'created_at', 'createdAt'),
      );
}

/// 发票抬头模板，对应 `GET/POST/DELETE /api/v1/users/invoice-templates`。
class InvoiceTemplate {
  const InvoiceTemplate({
    this.id = 0,
    this.userId = 0,
    this.title = '',
    this.taxNo = '',
    this.type = 'personal',
    this.email = '',
    this.address = '',
    this.phone = '',
    this.bankName = '',
    this.bankAccount = '',
    this.isDefault = false,
    this.createdAt = '',
  });

  final int id;
  final int userId;
  final String title;
  final String taxNo;

  /// personal | company。
  final String type;
  final String email;

  /// 企业地址（后端字段 `address`）。
  final String address;
  final String phone;
  final String bankName;
  final String bankAccount;
  final bool isDefault;
  final String createdAt;

  factory InvoiceTemplate.fromJson(Map<String, dynamic> json) => InvoiceTemplate(
        id: _int(json, 'id', 'id'),
        userId: _int(json, 'user_id', 'userId'),
        title: _str(json, 'title', 'title'),
        taxNo: _str(json, 'tax_no', 'taxNo'),
        type: _str(json, 'type', 'type', 'personal'),
        email: _str(json, 'email', 'email'),
        address: _str(json, 'address', 'address'),
        phone: _str(json, 'phone', 'phone'),
        bankName: _str(json, 'bank_name', 'bankName'),
        bankAccount: _str(json, 'bank_account', 'bankAccount'),
        isDefault: _bool(json, 'is_default', 'isDefault'),
        createdAt: _str(json, 'created_at', 'createdAt'),
      );
}

/// 通知分类设置项。
///
/// 后端 `UserNotificationSettings` 为扁平结构，这里拆成可逐项开关的列表。
class NotificationSetting {
  const NotificationSetting({
    this.id = 0,
    this.category = '',
    this.name = '',
    this.description = '',
    this.enabled = true,
  });

  final int id;
  final String category;
  final String name;
  final String description;
  final bool enabled;

  /// 全部通知分类的展示信息。
  static const List<({String key, String name, String description})>
      categories = <({String key, String name, String description})>[
    (
      key: 'order',
      name: '订单状态通知',
      description: '下单、支付、发货、签收提醒'
    ),
    (
      key: 'logistics',
      name: '物流轨迹通知',
      description: '包裹派送与异常提醒'
    ),
    (
      key: 'marketing',
      name: '优惠活动通知',
      description: '大促与优惠券发放提醒'
    ),
    (
      key: 'system',
      name: '系统公告通知',
      description: '账号安全与规则变更公告'
    ),
    (
      key: 'sms',
      name: '短信通知',
      description: '重要变更通过短信提醒'
    ),
    (
      key: 'email',
      name: '邮件通知',
      description: '订单与发票发送到邮箱'
    ),
    (
      key: 'wechat',
      name: '微信通知',
      description: '微信服务号模板消息提醒'
    ),
  ];

  /// 把后端扁平结构转换成设置项列表。
  static List<NotificationSetting> fromSettings(
      Map<String, dynamic> settings) {
    final result = <NotificationSetting>[];
    for (var i = 0; i < categories.length; i++) {
      final item = categories[i];
      final value = settings['${item.key}Notice'] ?? settings[item.key];
      result.add(NotificationSetting(
        id: i + 1,
        category: item.key,
        name: item.name,
        description: item.description,
        enabled: value is bool ? value : false,
      ));
    }
    return result;
  }

  /// 生成 PUT 请求体：后端为全量更新，需要把所有分类一起提交。
  static Map<String, dynamic> toRequestBody(
      List<NotificationSetting> settings, String category, bool enabled) {
    final body = <String, dynamic>{};
    for (final item in settings) {
      body['${item.category}Notice'] =
          item.category == category ? enabled : item.enabled;
    }
    return body;
  }
}

/// 消息分类，对应 `GET /api/v1/notifications/categories`。
class NotificationCategory {
  const NotificationCategory({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.icon = '',
    this.count = 0,
    this.unreadCount = 0,
  });

  final int id;
  final String name;

  /// 分类编码（后端字段 `type`）。
  final String code;
  final String icon;
  final int count;
  final int unreadCount;

  factory NotificationCategory.fromJson(Map<String, dynamic> json) =>
      NotificationCategory(
        id: _int(json, 'type', 'type', _int(json, 'id', 'id')),
        name: _str(json, 'name', 'name'),
        code: _str(json, 'type', 'type', _str(json, 'code', 'code')),
        icon: _str(json, 'icon', 'icon'),
        count: _int(json, 'count', 'count'),
        unreadCount: _int(json, 'unread_count', 'unreadCount'),
      );
}

/// 账号安全信息，对应 `GET /api/v1/users/security`。
class SecurityInfo {
  const SecurityInfo({
    this.phoneBound = false,
    this.emailBound = false,
    this.wechatBound = false,
    this.realnameVerified = false,
    this.riskLevel = 0,
    this.passwordChangedAt = '',
    this.warnings = const <String>[],
  });

  final bool phoneBound;
  final bool emailBound;
  final bool wechatBound;
  final bool realnameVerified;

  /// 0 安全 1 中 2 高。
  final int riskLevel;

  /// 最近一次修改密码的时间，非空即代表已设置密码。
  final String passwordChangedAt;
  final List<String> warnings;

  bool get passwordSet => passwordChangedAt.isNotEmpty;

  String get riskLabel => const ['安全', '中等风险', '高风险'][riskLevel.clamp(0, 2)];

  factory SecurityInfo.fromJson(Map<String, dynamic> json) => SecurityInfo(
        phoneBound: _bool(json, 'phone_bound', 'phoneBound'),
        emailBound: _bool(json, 'email_bound', 'emailBound'),
        wechatBound: _bool(json, 'wechat_bound', 'wechatBound'),
        realnameVerified: _bool(json, 'realname_verified', 'realnameVerified'),
        riskLevel: _int(json, 'risk_level', 'riskLevel'),
        passwordChangedAt:
            _str(json, 'password_changed_at', 'passwordChangedAt'),
        warnings: JsonUtil.asStringList(json['warnings']),
      );
}

/// 帮助文章，对应 `GET /api/v1/help/articles`。
class HelpArticle {
  const HelpArticle({
    this.id = 0,
    this.title = '',
    this.categoryId = 0,
    this.category = '',
    this.summary = '',
    this.content = '',
    this.viewCount = 0,
    this.enabled = true,
    this.updatedAt = '',
  });

  final int id;
  final String title;
  final int categoryId;

  /// 分类名称（后端字段 `category_name`）。
  final String category;

  /// 摘要：后端无该字段时取正文首句。
  final String summary;
  final String content;
  final int viewCount;
  final bool enabled;

  /// 更新时间（后端字段 `created_at`）。
  final String updatedAt;

  factory HelpArticle.fromJson(Map<String, dynamic> json) {
    final content = _str(json, 'content', 'content');
    final summary = _str(json, 'summary', 'summary');
    return HelpArticle(
      id: _int(json, 'id', 'id'),
      title: _str(json, 'title', 'title'),
      categoryId: _int(json, 'category_id', 'categoryId'),
      category: _str(json, 'category_name', 'categoryName'),
      summary: summary.isNotEmpty
          ? summary
          : (content.length > 40 ? '${content.substring(0, 40)}…' : content),
      content: content,
      viewCount: _int(json, 'view_count', 'viewCount'),
      enabled: _bool(json, 'enabled', 'enabled', true),
      updatedAt: _str(json, 'created_at', 'createdAt'),
    );
  }
}

/// 行政区域，对应 `GET /api/v1/regions`。
class Region {
  const Region({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.parentId = 0,
    this.level = 1,
    this.sort = 0,
  });

  final int id;
  final String name;
  final String code;
  final int parentId;
  final int level;
  final int sort;

  factory Region.fromJson(Map<String, dynamic> json) => Region(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        code: _str(json, 'code', 'code'),
        parentId: _int(json, 'parent_id', 'parentId'),
        level: _int(json, 'level', 'level', 1),
        sort: _int(json, 'sort', 'sort'),
      );
}

/// 充值配置，对应 `GET /api/v1/payments/recharge-config`。
class RechargeConfig {
  const RechargeConfig({
    this.minAmountCents = 0,
    this.maxAmountCents = 0,
    this.presetAmounts = const <int>[],
    this.bonusRules = const <RechargeBonus>[],
  });

  final int minAmountCents;
  final int maxAmountCents;

  /// 预设充值面额（单位：分）。
  final List<int> presetAmounts;
  final List<RechargeBonus> bonusRules;

  factory RechargeConfig.fromJson(Map<String, dynamic> json) => RechargeConfig(
        minAmountCents: _int(json, 'min_amount_cents', 'minAmountCents'),
        maxAmountCents: _int(json, 'max_amount_cents', 'maxAmountCents'),
        presetAmounts: JsonUtil.asIntList(json['presetAmounts']),
        bonusRules: JsonUtil.asMapList(json['bonusRules'])
            .map(RechargeBonus.fromJson)
            .toList(),
      );
}

/// 充值赠送规则。
class RechargeBonus {
  const RechargeBonus({
    this.id = 0,
    this.thresholdCents = 0,
    this.bonusCents = 0,
    this.description = '',
  });

  final int id;
  final int thresholdCents;
  final int bonusCents;
  final String description;

  factory RechargeBonus.fromJson(Map<String, dynamic> json) => RechargeBonus(
        id: _int(json, 'id', 'id'),
        thresholdCents: _int(json, 'threshold_cents', 'thresholdCents'),
        bonusCents: _int(json, 'bonus_cents', 'bonusCents'),
        description: _str(json, 'description', 'description'),
      );
}

/// 充值记录，对应 `GET /api/v1/payments/recharges`。
class RechargeRecord {
  const RechargeRecord({
    this.id = 0,
    this.rechargeNo = '',
    this.amountCents = 0,
    this.bonusCents = 0,
    this.channel = '',
    this.status = '',
    this.createdAt = '',
    this.paidAt = '',
  });

  final int id;
  final String rechargeNo;
  final int amountCents;
  final int bonusCents;
  final String channel;
  final String status;
  final String createdAt;
  final String paidAt;

  factory RechargeRecord.fromJson(Map<String, dynamic> json) => RechargeRecord(
        id: _int(json, 'id', 'id'),
        rechargeNo: _str(json, 'recharge_no', 'rechargeNo'),
        amountCents: _int(json, 'amount_cents', 'amountCents'),
        bonusCents: _int(json, 'bonus_cents', 'bonusCents'),
        channel: _str(json, 'channel', 'channel'),
        status: _str(json, 'status', 'status'),
        createdAt: _str(json, 'created_at', 'createdAt'),
        paidAt: _str(json, 'paid_at', 'paidAt'),
      );
}

/// 余额流水，对应 `GET /api/v1/payments/balance-logs`。
class BalanceLog {
  const BalanceLog({
    this.id = 0,
    this.type = '',
    this.amountCents = 0,
    this.balanceCents = 0,
    this.remark = '',
    this.createdAt = '',
  });

  final int id;
  final String type;
  final int amountCents;
  final int balanceCents;
  final String remark;
  final String createdAt;

  factory BalanceLog.fromJson(Map<String, dynamic> json) => BalanceLog(
        id: _int(json, 'id', 'id'),
        type: _str(json, 'type', 'type'),
        amountCents: _int(json, 'amount_cents', 'amountCents'),
        balanceCents: _int(json, 'balance_cents', 'balanceCents'),
        remark: _str(json, 'remark', 'remark'),
        createdAt: _str(json, 'created_at', 'createdAt'),
      );
}

/// 支付渠道，对应 `GET /api/v1/admin/pay-channels`（公开读部分）。
class PayChannel {
  const PayChannel({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.icon = '',
    this.description = '',
    this.enabled = true,
  });

  final int id;
  final String name;
  final String code;
  final String icon;
  final String description;
  final bool enabled;

  factory PayChannel.fromJson(Map<String, dynamic> json) => PayChannel(
        id: _int(json, 'id', 'id'),
        name: _str(json, 'name', 'name'),
        code: _str(json, 'code', 'code'),
        icon: _str(json, 'icon', 'icon'),
        description: _str(json, 'description', 'description'),
        enabled: _bool(json, 'enabled', 'enabled', true),
      );
}
