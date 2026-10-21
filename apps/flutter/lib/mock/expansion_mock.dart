import '../models/expansion.dart';
import '../models/product.dart';
import 'mock_data.dart';

/// 阶段 3 扩量页面的内置演示数据。
///
/// 结构与真实接口保持一致（camelCase），后端未就绪时由 provider 回落到这里。
class ExpansionMock {
  ExpansionMock._();

  static String _daysAgo(int days) =>
      DateTime.now().subtract(Duration(days: days)).toIso8601String();

  // ---------------------------------------------------------------- 频道

  /// 频道列表。
  static List<Channel> channels() {
    const specs = <({int id, String name, String code, String desc})>[
      (
        id: 101,
        name: '推荐频道',
        code: 'recommend',
        desc: '根据你的浏览与收藏智能推荐'
      ),
      (
        id: 102,
        name: '新品首发',
        code: 'newest',
        desc: '最近 7 天上架的新品'
      ),
      (id: 103, name: '热销爆款', code: 'hot', desc: '近 30 天销量领先'),
      (id: 104, name: '限时秒杀', code: 'flash', desc: '每日整点开抢'),
      (id: 105, name: '预售专区', code: 'presale', desc: '定金膨胀预售'),
      (id: 106, name: '清仓特卖', code: 'clearance', desc: '断码清仓，一件不留'),
      (id: 107, name: '包邮专区', code: 'freeship', desc: '全场包邮，无需凑单'),
      (id: 108, name: '跨境直邮', code: 'cross', desc: '保税仓发货，正品保障'),
      (id: 109, name: '生鲜速达', code: 'fresh', desc: '当日达，冷链配送'),
    ];
    return specs
        .map(
          (spec) => Channel(
            id: spec.id,
            name: spec.name,
            code: spec.code,
            description: spec.desc,
            sort: spec.id,
            type: spec.id - 100,
            status: 1,
            productCount: MockData.products.length,
          ),
        )
        .toList();
  }

  /// 按频道类型挑选商品。
  static List<Product> channelProducts(String channelType) {
    final all = MockData.products;
    switch (channelType) {
      case 'newest':
        return all.reversed.take(6).toList();
      case 'hot':
        return (all.toList()
              ..sort((a, b) => b.salesCount.compareTo(a.salesCount)))
            .take(6)
            .toList();
      case 'flash':
        return all.take(4).toList();
      case 'presale':
        return all.where((p) => p.tags.contains('预售')).toList().isEmpty
            ? all.take(5).toList()
            : all.where((p) => p.tags.contains('预售')).toList();
      case 'clearance':
        return all.where((p) => p.hasDiscount).toList().isEmpty
            ? all.skip(2).take(5).toList()
            : all.where((p) => p.hasDiscount).toList();
      case 'freeship':
        return all.where((p) => p.minPriceCents >= 9900).toList().isEmpty
            ? all.take(6).toList()
            : all.where((p) => p.minPriceCents >= 9900).toList();
      case 'cross':
        return all.where((p) => p.tags.contains('跨境')).toList().isEmpty
            ? all.skip(1).take(5).toList()
            : all.where((p) => p.tags.contains('跨境')).toList();
      case 'fresh':
        return all.where((p) => p.categoryName.contains('生鲜')).toList().isEmpty
            ? all.take(5).toList()
            : all.where((p) => p.categoryName.contains('生鲜')).toList();
      case 'recommend':
      default:
        return all.take(8).toList();
    }
  }

  /// 商品参数。
  static List<ProductParam> productParams(int productId) {
    const specs = <({String name, String value})>[
      (name: '品牌', value: 'ShopStack 严选'),
      (name: '产地', value: '中国 · 浙江 杭州'),
      (name: '保质期', value: '常温 24 个月'),
      (name: '规格', value: '标准装 500g'),
      (name: '存储方式', value: '阴凉干燥处密封保存'),
      (name: '许可证', value: 'SC101XXXXXXXXXXX'),
    ];
    return specs
        .asMap()
        .entries
        .map(
          (entry) => ProductParam(
            id: productId * 100 + entry.key,
            productId: productId,
            name: entry.value.name,
            value: entry.value.value,
            sort: entry.key,
          ),
        )
        .toList();
  }

  /// 商品问答。
  static List<ProductQuestion> productQuestions(int productId) {
    const items = <({String q, String a, int days})>[
      (
        q: '这款商品的发货地在哪里？',
        a: '默认从浙江杭州仓发出，下单后 48 小时内出库，偏远地区会顺延 1-2 天。',
        days: 3
      ),
      (
        q: '支持七天无理由退换吗？',
        a: '支持。签收后 7 天内，商品未使用、不影响二次销售即可申请无理由退换。',
        days: 6
      ),
      (
        q: '开票需要提供什么信息？',
        a: '下单时选择「申请开票」，填写抬头与税号，电子发票会在发货后 24 小时内发送到邮箱。',
        days: 9
      ),
    ];
    return items
        .asMap()
        .entries
        .map(
          (entry) => ProductQuestion(
            id: productId * 10 + entry.key,
            productId: productId,
            userNickname: '买家 ${entry.key + 1} 号',
            question: entry.value.q,
            answer: entry.value.a,
            createdAt: _daysAgo(entry.value.days),
            answeredAt: _daysAgo(entry.value.days - 1),
          ),
        )
        .toList();
  }

  /// 评价标签。
  static List<ReviewTag> reviewTags() {
    const specs = <({int id, String name, int count})>[
      (id: 1, name: '包装完好', count: 128),
      (id: 2, name: '物流快', count: 96),
      (id: 3, name: '性价比高', count: 88),
      (id: 4, name: '与描述一致', count: 75),
      (id: 5, name: '客服耐心', count: 42),
      (id: 6, name: '复购意愿强', count: 33),
    ];
    return specs
        .map((spec) => ReviewTag(
              id: spec.id,
              name: spec.name,
              count: spec.count,
              sort: spec.id,
            ))
        .toList();
  }

  // ---------------------------------------------------------------- 签到与任务

  /// 签到信息。
  static SignInInfo signInInfo({bool justSigned = false}) {
    final today = DateTime.now();
    final calendar = <SignInDay>[];
    for (var i = 0; i < 30; i++) {
      final date = today.subtract(Duration(days: 29 - i));
      final signed = justSigned ? i == 29 : i < 29 && i % 3 != 0;
      calendar.add(SignInDay(
        date: date,
        signed: signed,
        rewardPoints: signed ? 5 + (i % 5) : 0,
      ));
    }
    return SignInInfo(
      signedToday: justSigned,
      continuousDays: justSigned ? 4 : 3,
      totalDays: 26,
      rewardPoints: justSigned ? 8 : 0,
      nextPoints: 9,
      calendar: calendar,
    );
  }

  /// 营销任务。
  static List<MarketingTask> tasks() {
    const specs = <({int id, String title, String desc, int type, int target, int progress, bool done, int points, int cents, String action})>[
      (
        id: 1,
        title: '每日签到',
        desc: '每天登录即可领取积分',
        type: 5,
        target: 1,
        progress: 1,
        done: true,
        points: 10,
        cents: 0,
        action: '去签到'
      ),
      (
        id: 2,
        title: '浏览商品 3 件',
        desc: '当日浏览满 3 件商品即可领奖',
        type: 1,
        target: 3,
        progress: 1,
        done: false,
        points: 30,
        cents: 0,
        action: '去逛逛'
      ),
      (
        id: 3,
        title: '下单 1 笔',
        desc: '完成一笔订单并支付成功',
        type: 2,
        target: 1,
        progress: 0,
        done: false,
        points: 100,
        cents: 0,
        action: '去下单'
      ),
      (
        id: 4,
        title: '邀请好友 1 人',
        desc: '好友通过你的邀请码注册成功',
        type: 6,
        target: 1,
        progress: 0,
        done: false,
        points: 0,
        cents: 500,
        action: '去邀请'
      ),
      (
        id: 5,
        title: '评价晒图',
        desc: '发布一条带图评价',
        type: 4,
        target: 1,
        progress: 0,
        done: false,
        points: 50,
        cents: 0,
        action: '去评价'
      ),
    ];
    return specs
        .map(
          (spec) => MarketingTask(
            id: spec.id,
            title: spec.title,
            description: spec.desc,
            type: spec.type,
            target: spec.target,
            progress: spec.progress,
            completed: spec.done,
            claimed: spec.done,
            rewardPoints: spec.points,
            rewardCents: spec.cents,
            actionText: spec.action,
          ),
        )
        .toList();
  }

  /// 活动场次。
  static List<PromotionSession> promotionSessions(int promotionId) {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return List<PromotionSession>.generate(4, (index) {
      final start = now - 86400 * (index + 1);
      return PromotionSession(
        id: promotionId * 100 + index,
        promotionId: promotionId,
        name: '第 ${index + 1} 场',
        startTime: start,
        endTime: start + 86400,
        status: index == 0 ? 1 : 2,
        stock: 200 - index * 20,
        soldCount: 180 - index * 18,
      );
    });
  }

  // ---------------------------------------------------------------- 拼团

  /// 拼团列表。
  static List<GroupBuy> groupBuys({List<GroupBuy>? mine}) {
    if (mine != null) return mine;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final products = MockData.products;
    return List<GroupBuy>.generate(3, (index) {
      final product = products[index % products.length];
      return GroupBuy(
        id: 201 + index,
        title: '${product.title} 拼团立减',
        description: '3 人成团，开团后 24 小时内有效',
        productId: product.id,
        productTitle: product.title,
        cover: product.cover,
        priceCents: product.minPriceCents,
        originalPriceCents: product.maxPriceCents,
        requiredMembers: 3,
        joinedMembers: 1 + index,
        startTime: now - 3600 * (index + 1),
        endTime: now + 3600 * (48 - index),
        status: 1,
        perUserLimit: 2,
        members: _members(201 + index, 1 + index),
      );
    });
  }

  static List<GroupBuyMember> _members(int groupBuyId, int count) {
    const names = ['团长小王', '买家阿琳', '买家小陈', '用户 8892', '用户 3021'];
    return List<GroupBuyMember>.generate(count, (index) {
      return GroupBuyMember(
        id: groupBuyId * 100 + index,
        groupBuyId: groupBuyId,
        nickname: names[index % names.length],
        avatar: '',
        joinedAt: _daysAgo(index + 1),
        isLeader: index == 0,
      );
    });
  }

  // ---------------------------------------------------------------- 售后

  /// 售后列表。
  static List<AfterSale> afterSales() {
    const specs = <({int id, int orderId, int type, int status, int cents, String reason, String desc})>[
      (
        id: 301,
        orderId: 1,
        type: 1,
        status: 0,
        cents: 9900,
        reason: '商品与描述不符',
        desc: '实际收到的规格与下单不一致'
      ),
      (
        id: 302,
        orderId: 2,
        type: 2,
        status: 1,
        cents: 12900,
        reason: '质量问题',
        desc: '外包装破损，内部有渗漏'
      ),
      (
        id: 303,
        orderId: 3,
        type: 1,
        status: 4,
        cents: 4999,
        reason: '不想要了',
        desc: '拍错型号'
      ),
      (
        id: 304,
        orderId: 4,
        type: 3,
        status: 2,
        cents: 25900,
        reason: '发错货',
        desc: '需要换成同款其他颜色'
      ),
    ];
    return specs
        .map(
          (spec) => AfterSale(
            id: spec.id,
            orderId: spec.orderId,
            orderNo: 'SS${spec.orderId}2026100${spec.id}',
            afterSaleNo: 'AS2026100${spec.id}',
            type: spec.type,
            status: spec.status,
            amountCents: spec.cents,
            reason: spec.reason,
            description: spec.desc,
            createdAt: _daysAgo(spec.id - 300 + 1),
            processedAt: _daysAgo(spec.id - 300),
          ),
        )
        .toList();
  }

  /// 退款原因。
  static List<RefundReason> refundReasons() {
    const specs = <({int id, String name, String desc, int type})>[
      (id: 1, name: '不想要了', desc: '拍错型号或多拍', type: 1),
      (id: 2, name: '商品质量问题', desc: '破损、变质、漏液等', type: 2),
      (id: 3, name: '与描述不符', desc: '规格、颜色与页面不符', type: 2),
      (id: 4, name: '发错货 / 少发货', desc: '物流异常导致缺件错发', type: 2),
      (id: 5, name: '不喜欢 / 不需要了', desc: '主观原因退货', type: 1),
    ];
    return specs
        .map((spec) => RefundReason(
              id: spec.id,
              name: spec.name,
              description: spec.desc,
              type: spec.type,
              sort: spec.id,
            ))
        .toList();
  }

  // ---------------------------------------------------------------- 物流

  /// 快递公司。
  static List<LogisticsCompany> companies() {
    const specs = <({int id, String name, String code, String phone})>[
      (id: 1, name: '顺丰速运', code: 'SF', phone: '95338'),
      (id: 2, name: '中通快递', code: 'ZTO', phone: '95311'),
      (id: 3, name: '圆通速递', code: 'YTO', phone: '95554'),
      (id: 4, name: '韵达快递', code: 'YD', phone: '95546'),
      (id: 5, name: '京东物流', code: 'JD', phone: '950616'),
      (id: 6, name: '邮政EMS', code: 'EMS', phone: '11183'),
    ];
    return specs
        .map((spec) => LogisticsCompany(
              id: spec.id,
              name: spec.name,
              code: spec.code,
              phone: spec.phone,
              enabled: true,
              supportsCod: spec.id <= 3,
              sort: spec.id,
            ))
        .toList();
  }

  /// 配送范围。
  static List<DeliveryRange> ranges() {
    const specs =
        <({int id, String name, String regions, bool free, int cents, int freeCents})>[
      (
        id: 1,
        name: '华东包邮区',
        regions: '上海市 / 江苏省 / 浙江省 / 安徽省',
        free: true,
        cents: 0,
        freeCents: 9900
      ),
      (
        id: 2,
        name: '华北标准区',
        regions: '北京市 / 天津市 / 河北省 / 山东省',
        free: false,
        cents: 800,
        freeCents: 19900
      ),
      (
        id: 3,
        name: '华南标准区',
        regions: '广东省 / 福建省 / 湖南省',
        free: false,
        cents: 1000,
        freeCents: 19900
      ),
      (
        id: 4,
        name: '偏远地区',
        regions: '新疆维吾尔自治区 / 西藏自治区 / 青海省',
        free: false,
        cents: 2500,
        freeCents: 29900
      ),
    ];
    return specs
        .map((spec) => DeliveryRange(
              id: spec.id,
              templateId: spec.id,
              templateName: spec.name,
              regions: spec.regions,
              freightCents: spec.cents,
              freeFreightAmountCents: spec.freeCents,
              enabled: true,
            ))
        .toList();
  }

  /// 运费试算。
  static FreightQuote freight(String region) {
    if (region.contains('沪') ||
        region.contains('苏') ||
        region.contains('浙') ||
        region.contains('皖')) {
      return const FreightQuote(
        freightCents: 0,
        freeFreightAmountCents: 99000,
        free: true,
        templateName: '华东包邮模板',
        remark: '华东地区包邮',
      );
    }
    if (region.contains('新') ||
        region.contains('藏') ||
        region.contains('青')) {
      return const FreightQuote(
        freightCents: 2500,
        freeFreightAmountCents: 99000,
        free: false,
        templateName: '偏远地区模板',
        remark: '偏远地区，运费到付改为预付',
      );
    }
    return const FreightQuote(
      freightCents: 800,
      freeFreightAmountCents: 99000,
      free: false,
      templateName: '标准运费模板',
      remark: '标准地区运费',
    );
  }

  // ---------------------------------------------------------------- 消息

  /// 消息分类。
  static List<NotificationCategory> notificationCategories() {
    const specs = <({int id, String name, String code, int count, int unread})>[
      (id: 1, name: '订单通知', code: 'order', count: 3, unread: 3),
      (id: 2, name: '物流通知', code: 'logistics', count: 1, unread: 1),
      (id: 3, name: '优惠活动', code: 'promotion', count: 5, unread: 5),
      (id: 4, name: '系统公告', code: 'system', count: 0, unread: 0),
    ];
    return specs
        .map((spec) => NotificationCategory(
              id: spec.id,
              name: spec.name,
              code: spec.code,
              count: spec.count,
              unreadCount: spec.unread,
            ))
        .toList();
  }

  // ---------------------------------------------------------------- 资金

  /// 充值配置。
  static RechargeConfig rechargeConfig() {
    return const RechargeConfig(
      minAmountCents: 1000,
      maxAmountCents: 500000,
      bonusRules: [
        RechargeBonus(
          id: 1,
          thresholdCents: 10000,
          bonusCents: 500,
          description: '充 100 元送 5 元',
        ),
        RechargeBonus(
          id: 2,
          thresholdCents: 30000,
          bonusCents: 2000,
          description: '充 300 元送 20 元',
        ),
        RechargeBonus(
          id: 3,
          thresholdCents: 100000,
          bonusCents: 8000,
          description: '充 1000 元送 80 元',
        ),
      ],
    );
  }

  /// 充值记录。
  static List<RechargeRecord> recharges() {
    const specs = <({int id, int cents, int bonus, String channel, String status, int days})>[
      (id: 401, cents: 10000, bonus: 500, channel: 'wechat', status: 'success', days: 2),
      (id: 402, cents: 30000, bonus: 2000, channel: 'alipay', status: 'success', days: 9),
      (id: 403, cents: 5000, bonus: 0, channel: 'balance', status: 'pending', days: 1),
      (id: 404, cents: 100000, bonus: 8000, channel: 'wechat', status: 'success', days: 21),
    ];
    return specs
        .map(
          (spec) => RechargeRecord(
            id: spec.id,
            rechargeNo: 'RC${spec.id}20261001',
            amountCents: spec.cents,
            bonusCents: spec.bonus,
            channel: spec.channel,
            status: spec.status,
            createdAt: _daysAgo(spec.days),
            paidAt: spec.status == 'success' ? _daysAgo(spec.days) : '',
          ),
        )
        .toList();
  }

  /// 余额流水。
  static List<BalanceLog> balanceLogs() {
    const specs = <({int id, String type, int cents, int balance, String remark, int days})>[
      (id: 501, type: 'recharge', cents: 10000, balance: 23500, remark: '账户充值', days: 2),
      (id: 502, type: 'consume', cents: -4999, balance: 13500, remark: '订单支付 SS12026101', days: 3),
      (id: 503, type: 'refund', cents: 9900, balance: 18499, remark: '售后退款到账', days: 8),
      (id: 504, type: 'consume', cents: -12900, balance: 8599, remark: '订单支付 SS12026102', days: 12),
      (id: 505, type: 'bonus', cents: 500, balance: 21499, remark: '充值赠送', days: 15),
    ];
    return specs
        .map(
          (spec) => BalanceLog(
            id: spec.id,
            type: spec.type,
            amountCents: spec.cents,
            balanceCents: spec.balance,
            remark: spec.remark,
            createdAt: _daysAgo(spec.days),
          ),
        )
        .toList();
  }

  /// 支付渠道。
  static List<PayChannel> payChannels() {
    const specs = <({int id, String name, String code, String desc})>[
      (id: 1, name: '微信支付', code: 'wechat', desc: '推荐使用，安全便捷'),
      (id: 2, name: '支付宝', code: 'alipay', desc: '支持花呗分期'),
      (id: 3, name: '余额支付', code: 'balance', desc: '使用账户余额快捷支付'),
      (id: 4, name: '银行卡', code: 'bank_card', desc: '支持主流储蓄卡与信用卡'),
    ];
    return specs
        .map(
          (spec) => PayChannel(
            id: spec.id,
            name: spec.name,
            code: spec.code,
            icon: spec.code,
            description: spec.desc,
            enabled: true,
          ),
        )
        .toList();
  }

  // ---------------------------------------------------------------- 会员

  /// 全部会员等级。
  static List<UserLevel> levels() {
    const specs = <({int id, int level, String name, int growth, int min, int max, int discount, List<String> benefits})>[
      (
        id: 1,
        level: 1,
        name: '普通会员',
        growth: 0,
        min: 0,
        max: 999,
        discount: 100,
        benefits: ['生日券', '每月签到加成']
      ),
      (
        id: 2,
        level: 2,
        name: '银卡会员',
        growth: 1000,
        min: 1000,
        max: 4999,
        discount: 98,
        benefits: ['生日券', '每月签到加成', '专属客服']
      ),
      (
        id: 3,
        level: 3,
        name: '金卡会员',
        growth: 5000,
        min: 5000,
        max: 19999,
        discount: 95,
        benefits: ['生日券', '每月签到加成', '专属客服', '包邮特权']
      ),
      (
        id: 4,
        level: 4,
        name: '钻石会员',
        growth: 20000,
        min: 20000,
        max: 99999,
        discount: 90,
        benefits: ['生日券', '每月签到加成', '专属客服', '包邮特权', '优先发货']
      ),
    ];
    return specs
        .map(
          (spec) => UserLevel(
            id: spec.id,
            level: spec.level,
            name: spec.name,
            growthValue: spec.growth,
            minGrowth: spec.min,
            maxGrowth: spec.max,
            discountPercent: spec.discount,
            benefits: spec.benefits,
          ),
        )
        .toList();
  }

  /// 我的会员等级信息。
  static UserLevelInfo myLevelInfo() {
    final all = levels();
    return UserLevelInfo(
      level: 3,
      levelName: all[2].name,
      growth: 6320,
      currentMinGrowth: all[2].minGrowth,
      nextMinGrowth: all[3].minGrowth,
      growthToNext: all[3].minGrowth - 6320,
      discountPercent: all[2].discountPercent,
      nextLevelName: all[3].name,
      levels: all,
    );
  }

  /// 成长值明细。
  static List<GrowthLog> growthLogs() {
    const specs = <({int id, String source, int amount, int balance, String remark, int days})>[
      (id: 601, source: 'order', amount: 120, balance: 6320, remark: '订单 SS12026101 消费获得', days: 2),
      (id: 602, source: 'review', amount: 50, balance: 6200, remark: '发布带图评价', days: 5),
      (id: 603, source: 'sign_in', amount: 10, balance: 6150, remark: '每日签到', days: 7),
      (id: 604, source: 'invite', amount: 200, balance: 6140, remark: '邀请好友注册', days: 11),
      (id: 605, source: 'order', amount: -80, balance: 5940, remark: '订单退款扣减', days: 16),
    ];
    return specs
        .map(
          (spec) => GrowthLog(
            id: spec.id,
            source: spec.source,
            amount: spec.amount,
            balance: spec.balance,
            remark: spec.remark,
            createdAt: _daysAgo(spec.days),
          ),
        )
        .toList();
  }

  /// 发票抬头模板。
  static List<InvoiceTemplate> invoiceTemplates() {
    return [
      InvoiceTemplate(
        id: 701,
        title: '个人抬头',
        taxNo: '',
        type: 'personal',
        email: 'me@example.com',
        isDefault: true,
        createdAt: _daysAgo(30),
      ),
      InvoiceTemplate(
        id: 702,
        title: '杭州示例科技有限公司',
        taxNo: '91330100MA2XXXXX1B',
        type: 'company',
        email: 'finance@example.com',
        address: '浙江省杭州市余杭区文一西路 969 号',
        phone: '0571-8888 6666',
        bankName: '招商银行杭州分行',
        bankAccount: '5719 **** **** 1234',
        isDefault: false,
        createdAt: _daysAgo(12),
      ),
    ];
  }

  /// 通知设置。
  static List<NotificationSetting> notificationSettings() {
    const specs = <({int id, String category, String name, String desc, bool enabled})>[
      (id: 1, category: 'order', name: '订单状态通知', desc: '下单、支付、发货、签收提醒', enabled: true),
      (id: 2, category: 'logistics', name: '物流轨迹通知', desc: '包裹派送与异常提醒', enabled: true),
      (id: 3, category: 'marketing', name: '优惠活动通知', desc: '大促与优惠券发放提醒', enabled: false),
      (id: 4, category: 'system', name: '系统公告通知', desc: '账号安全与规则变更公告', enabled: true),
      (id: 5, category: 'sms', name: '短信通知', desc: '重要变更通过短信提醒', enabled: false),
      (id: 6, category: 'email', name: '邮件通知', desc: '订单与发票发送到邮箱', enabled: false),
      (id: 7, category: 'wechat', name: '微信通知', desc: '微信服务号模板消息提醒', enabled: false),
    ];
    return specs
        .map((spec) => NotificationSetting(
              id: spec.id,
              category: spec.category,
              name: spec.name,
              description: spec.desc,
              enabled: spec.enabled,
            ))
        .toList();
  }

  /// 账号安全信息。
  static SecurityInfo security() {
    return SecurityInfo(
      phoneBound: true,
      emailBound: false,
      wechatBound: true,
      realnameVerified: false,
      riskLevel: 0,
      passwordChangedAt: _daysAgo(30),
      warnings: const ['当前密码已使用超过 90 天，建议更换', '暂未绑定邮箱，账号找回方式较少'],
    );
  }

  // ---------------------------------------------------------------- 内容

  /// 帮助文章。
  static List<HelpArticle> helpArticles({String? category}) {
    final all = <HelpArticle>[
      HelpArticle(
        id: 801,
        title: '如何修改收货地址？',
        category: '订单与配送',
        summary: '在「我的 - 收货地址」中可直接编辑、设为默认或删除。',
        content: '进入「我的」页面，点击「收货地址」，选择需要修改的地址后点击编辑按钮，'
            '修改收货人、手机号与详细地址后保存即可。每个账号可设置一个默认地址，'
            '下单时会自动带入默认地址。',
        updatedAt: _daysAgo(20),
      ),
      HelpArticle(
        id: 802,
        title: '支持哪些支付方式？',
        category: '支付与优惠',
        summary: '支持微信支付、支付宝、余额支付与银行卡支付。',
        content: 'ShopStack 支持微信支付、支付宝、账户余额以及主流银行卡四种支付方式。'
            '余额支付不产生第三方手续费，使用余额支付还可享受部分活动的余额专属优惠。',
        updatedAt: _daysAgo(18),
      ),
      HelpArticle(
        id: 803,
        title: '优惠券怎么使用？',
        category: '支付与优惠',
        summary: '结算页选择可用优惠券即可抵扣。',
        content: '在提交订单页面点击「优惠券」，系统会列出当前订单可使用的优惠券，'
            '选择一张即可抵扣金额。每笔订单仅可使用一张优惠券，优惠券使用后不可退还。',
        updatedAt: _daysAgo(15),
      ),
      HelpArticle(
        id: 804,
        title: '七天无理由退换货规则',
        category: '售后服务',
        summary: '签收后 7 天内可申请无理由退换。',
        content: '商品签收后 7 天内，在不影响二次销售的前提下可申请无理由退换。'
            '定制类、贴身衣物、拆封食品等特殊商品不支持无理由退换。'
            '质量问题退换货运费由平台承担。',
        updatedAt: _daysAgo(10),
      ),
      HelpArticle(
        id: 805,
        title: '发票如何申请？',
        category: '售后服务',
        summary: '在订单详情或发票管理页申请电子发票。',
        content: '订单完成后进入「发票管理」，填写发票抬头与税号提交申请，'
            '电子发票将在 24 小时内发送至预留邮箱。企业用户需填写完整开户行与账号信息。',
        updatedAt: _daysAgo(6),
      ),
    ];
    if (category == null || category.isEmpty) return all;
    return all.where((a) => a.category == category).toList();
  }

  /// 行政区域。
  static List<Region> regions({int parentId = 0}) {
    const provinces = <({int id, String name, String code})>[
      (id: 1, name: '北京市', code: '110000'),
      (id: 2, name: '上海市', code: '310000'),
      (id: 3, name: '广东省', code: '440000'),
      (id: 4, name: '浙江省', code: '330000'),
      (id: 5, name: '江苏省', code: '320000'),
      (id: 6, name: '四川省', code: '510000'),
      (id: 7, name: '湖北省', code: '420000'),
      (id: 8, name: '福建省', code: '350000'),
      (id: 9, name: '山东省', code: '370000'),
      (id: 10, name: '新疆维吾尔自治区', code: '650000'),
    ];
    if (parentId == 0) {
      return provinces
          .map((p) => Region(
                id: p.id,
                name: p.name,
                code: p.code,
                parentId: 0,
                level: 1,
              ))
          .toList();
    }
    const cities = <({String name, String code})>[
      (name: '市辖区', code: '01'),
      (name: '县级市', code: '02'),
      (name: '新区', code: '03'),
    ];
    return cities
        .asMap()
        .entries
        .map((entry) => Region(
              id: parentId * 100 + entry.key,
              name: entry.value.name,
              code: '${provinces.firstWhere((p) => p.id == parentId, orElse: () => provinces.first).code}${entry.value.code}',
              parentId: parentId,
              level: 2,
            ))
        .toList();
  }
}
