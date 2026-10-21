import '../utils/enums.dart';
import '../utils/json_util.dart';

/// 优惠券，对应 shopstack.marketing.v1.Coupon。
class Coupon {
  const Coupon({
    this.id = 0,
    this.name = '',
    this.code = '',
    this.type = CouponType.fixed,
    this.faceValueCents = 0,
    this.percent = 100,
    this.minAmountCents = 0,
    this.maxDiscountCents = 0,
    this.totalQuantity = 0,
    this.receivedQuantity = 0,
    this.usedQuantity = 0,
    this.perUserLimit = 1,
    this.startTime = 0,
    this.endTime = 0,
    this.categoryId = 0,
    this.enabled = true,
  });

  final int id;
  final String name;
  final String code;
  final CouponType type;
  final int faceValueCents;
  final int percent;
  final int minAmountCents;
  final int maxDiscountCents;
  final int totalQuantity;
  final int receivedQuantity;
  final int usedQuantity;
  final int perUserLimit;
  final int startTime;
  final int endTime;
  final int categoryId;
  final bool enabled;

  factory Coupon.fromJson(Map<String, dynamic> json) => Coupon(
        id: JsonUtil.intOf(json, 'id'),
        name: JsonUtil.stringOf(json, 'name'),
        code: JsonUtil.stringOf(json, 'code'),
        type: parseEnumValue<CouponType>(
          json['type'],
          CouponType.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        faceValueCents: JsonUtil.intOf(json, 'face_value_cents',
            JsonUtil.intOf(json, 'faceValueCents')),
        percent: JsonUtil.intOf(json, 'percent', 100),
        minAmountCents: JsonUtil.intOf(json, 'min_amount_cents',
            JsonUtil.intOf(json, 'minAmountCents')),
        maxDiscountCents: JsonUtil.intOf(json, 'max_discount_cents',
            JsonUtil.intOf(json, 'maxDiscountCents')),
        totalQuantity: JsonUtil.intOf(json, 'total_quantity',
            JsonUtil.intOf(json, 'totalQuantity')),
        receivedQuantity: JsonUtil.intOf(json, 'received_quantity',
            JsonUtil.intOf(json, 'receivedQuantity')),
        usedQuantity: JsonUtil.intOf(json, 'used_quantity',
            JsonUtil.intOf(json, 'usedQuantity')),
        perUserLimit: JsonUtil.intOf(json, 'per_user_limit',
            JsonUtil.intOf(json, 'perUserLimit')),
        startTime: JsonUtil.intOf(json, 'start_time',
            JsonUtil.intOf(json, 'startTime')),
        endTime:
            JsonUtil.intOf(json, 'end_time', JsonUtil.intOf(json, 'endTime')),
        categoryId: JsonUtil.intOf(json, 'category_id',
            JsonUtil.intOf(json, 'categoryId')),
        enabled: JsonUtil.boolOf(json, 'enabled', true),
      );
}

/// 用户优惠券，对应 shopstack.marketing.v1.UserCoupon。
class UserCoupon {
  const UserCoupon({
    this.id = 0,
    this.userId = 0,
    this.couponId = 0,
    this.coupon,
    this.status = UserCouponStatus.unused,
    this.orderId = 0,
    this.receivedAt = '',
    this.usedAt = '',
  });

  final int id;
  final int userId;
  final int couponId;
  final Coupon? coupon;
  final UserCouponStatus status;
  final int orderId;
  final String receivedAt;
  final String usedAt;

  String get name => coupon?.name ?? '';
  CouponType get type => coupon?.type ?? CouponType.unspecified;
  int get faceValueCents => coupon?.faceValueCents ?? 0;
  int get percent => coupon?.percent ?? 100;
  int get minAmountCents => coupon?.minAmountCents ?? 0;
  int get maxDiscountCents => coupon?.maxDiscountCents ?? 0;
  String get code => coupon?.code ?? '';

  /// 优惠金额说明文案。
  String get discountText {
    switch (type) {
      case CouponType.fixed:
        return '减 ${(faceValueCents / 100).toStringAsFixed(0)} 元';
      case CouponType.percent:
        return '${(percent / 10).toStringAsFixed(1)} 折';
      case CouponType.shipping:
        return '免运费';
      case CouponType.unspecified:
        return '优惠券';
    }
  }

  factory UserCoupon.fromJson(Map<String, dynamic> json) => UserCoupon(
        id: JsonUtil.intOf(json, 'id'),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        couponId: JsonUtil.intOf(json, 'coupon_id',
            JsonUtil.intOf(json, 'couponId')),
        coupon: json['coupon'] == null
            ? null
            : Coupon.fromJson(JsonUtil.asMap(json['coupon'])),
        status: parseEnumValue<UserCouponStatus>(
          json['status'],
          UserCouponStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        receivedAt: JsonUtil.stringOf(json, 'received_at',
            JsonUtil.stringOf(json, 'receivedAt')),
        usedAt:
            JsonUtil.stringOf(json, 'used_at', JsonUtil.stringOf(json, 'usedAt')),
      );
}

/// 促销活动，对应 shopstack.marketing.v1.Promotion。
class Promotion {
  const Promotion({
    this.id = 0,
    this.name = '',
    this.description = '',
    this.type = 1,
    this.status = 1,
    this.startTime = 0,
    this.endTime = 0,
    this.minAmountCents = 0,
    this.discountCents = 0,
    this.percent = 100,
    this.productId = 0,
    this.limitPerUser = 0,
    this.soldCount = 0,
    this.bannerImage = '',
  });

  final int id;
  final String name;
  final String description;
  final int type;
  final int status;
  final int startTime;
  final int endTime;
  final int minAmountCents;
  final int discountCents;
  final int percent;
  final int productId;
  final int limitPerUser;
  final int soldCount;
  final String bannerImage;

  String get typeLabel =>
      const ['未知', '满减', '折扣', '秒杀', '拼团'][type.clamp(0, 4)];

  factory Promotion.fromJson(Map<String, dynamic> json) => Promotion(
        id: JsonUtil.intOf(json, 'id'),
        name: JsonUtil.stringOf(json, 'name'),
        description: JsonUtil.stringOf(json, 'description'),
        type: JsonUtil.intOf(json, 'type', 1),
        status: JsonUtil.intOf(json, 'status', 1),
        startTime:
            JsonUtil.intOf(json, 'start_time', JsonUtil.intOf(json, 'startTime')),
        endTime: JsonUtil.intOf(json, 'end_time', JsonUtil.intOf(json, 'endTime')),
        minAmountCents: JsonUtil.intOf(json, 'min_amount_cents',
            JsonUtil.intOf(json, 'minAmountCents')),
        discountCents: JsonUtil.intOf(json, 'discount_cents',
            JsonUtil.intOf(json, 'discountCents')),
        percent: JsonUtil.intOf(json, 'percent', 100),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        limitPerUser: JsonUtil.intOf(json, 'limit_per_user',
            JsonUtil.intOf(json, 'limitPerUser')),
        soldCount: JsonUtil.intOf(json, 'sold_count',
            JsonUtil.intOf(json, 'soldCount')),
        bannerImage: JsonUtil.stringOf(json, 'banner_image',
            JsonUtil.stringOf(json, 'bannerImage')),
      );
}

/// 结算预览，对应 shopstack.marketing.v1.PreviewCheckoutResponse。
class CheckoutPreview {
  const CheckoutPreview({
    this.totalAmountCents = 0,
    this.discountCents = 0,
    this.couponDiscountCents = 0,
    this.pointsDiscountCents = 0,
    this.freightCents = 0,
    this.payableCents = 0,
    this.availableCoupons = const <UserCoupon>[],
    this.activePromotions = const <Promotion>[],
  });

  final int totalAmountCents;
  final int discountCents;
  final int couponDiscountCents;
  final int pointsDiscountCents;
  final int freightCents;
  final int payableCents;
  final List<UserCoupon> availableCoupons;
  final List<Promotion> activePromotions;

  factory CheckoutPreview.fromJson(Map<String, dynamic> json) => CheckoutPreview(
        totalAmountCents: JsonUtil.intOf(json, 'total_amount_cents',
            JsonUtil.intOf(json, 'totalAmountCents')),
        discountCents: JsonUtil.intOf(json, 'discount_cents',
            JsonUtil.intOf(json, 'discountCents')),
        couponDiscountCents: JsonUtil.intOf(json, 'coupon_discount_cents',
            JsonUtil.intOf(json, 'couponDiscountCents')),
        pointsDiscountCents: JsonUtil.intOf(json, 'points_discount_cents',
            JsonUtil.intOf(json, 'pointsDiscountCents')),
        freightCents: JsonUtil.intOf(json, 'freight_cents',
            JsonUtil.intOf(json, 'freightCents')),
        payableCents: JsonUtil.intOf(json, 'payable_cents',
            JsonUtil.intOf(json, 'payableCents')),
        availableCoupons: JsonUtil.asMapList(json['available_coupons'])
            .map(UserCoupon.fromJson)
            .toList(),
        activePromotions: JsonUtil.asMapList(json['active_promotions'])
            .map(Promotion.fromJson)
            .toList(),
      );
}
