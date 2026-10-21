/// 与 shopstack.common.v1 中 proto 枚举一一对应的 Dart 枚举。
///
/// JSON 中枚举既可能是字符串（`"ORDER_STATUS_PAID"`），也可能是 proto 序号（2），
/// 统一通过 [parseEnumValue] 解析。
library;

enum Gender {
  unspecified(0, 'GENDER_UNSPECIFIED', '未知'),
  male(1, 'GENDER_MALE', '男'),
  female(2, 'GENDER_FEMALE', '女'),
  unknown(3, 'GENDER_UNKNOWN', '未知');

  const Gender(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum UserStatus {
  unspecified(0, 'USER_STATUS_UNSPECIFIED', '未知'),
  active(1, 'USER_STATUS_ACTIVE', '正常'),
  disabled(2, 'USER_STATUS_DISABLED', '已禁用'),
  frozen(3, 'USER_STATUS_FROZEN', '已冻结');

  const UserStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum ProductStatus {
  unspecified(0, 'PRODUCT_STATUS_UNSPECIFIED', '未知'),
  draft(1, 'PRODUCT_STATUS_DRAFT', '草稿'),
  onShelf(2, 'PRODUCT_STATUS_ON_SHELF', '在售'),
  offShelf(3, 'PRODUCT_STATUS_OFF_SHELF', '已下架');

  const ProductStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum OrderStatus {
  unspecified(0, 'ORDER_STATUS_UNSPECIFIED', '未知'),
  pendingPayment(1, 'ORDER_STATUS_PENDING_PAYMENT', '待付款'),
  paid(2, 'ORDER_STATUS_PAID', '待发货'),
  shipped(3, 'ORDER_STATUS_SHIPPED', '待收货'),
  completed(4, 'ORDER_STATUS_COMPLETED', '已完成'),
  cancelled(5, 'ORDER_STATUS_CANCELLED', '已取消'),
  refunding(6, 'ORDER_STATUS_REFUNDING', '退款中'),
  refunded(7, 'ORDER_STATUS_REFUNDED', '已退款'),
  closed(8, 'ORDER_STATUS_CLOSED', '已关闭');

  const OrderStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum PaymentStatus {
  unspecified(0, 'PAYMENT_STATUS_UNSPECIFIED', '未知'),
  pending(1, 'PAYMENT_STATUS_PENDING', '待支付'),
  success(2, 'PAYMENT_STATUS_SUCCESS', '支付成功'),
  failed(3, 'PAYMENT_STATUS_FAILED', '支付失败'),
  closed(4, 'PAYMENT_STATUS_CLOSED', '已关闭');

  const PaymentStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum PaymentChannel {
  unspecified(0, 'PAYMENT_CHANNEL_UNSPECIFIED', '未选择'),
  wechat(1, 'PAYMENT_CHANNEL_WECHAT', '微信支付'),
  alipay(2, 'PAYMENT_CHANNEL_ALIPAY', '支付宝'),
  balance(3, 'PAYMENT_CHANNEL_BALANCE', '余额支付');

  const PaymentChannel(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum ReviewStatus {
  unspecified(0, 'REVIEW_STATUS_UNSPECIFIED', '未知'),
  pending(1, 'REVIEW_STATUS_PENDING', '待审核'),
  approved(2, 'REVIEW_STATUS_APPROVED', '已通过'),
  rejected(3, 'REVIEW_STATUS_REJECTED', '已驳回');

  const ReviewStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum CouponType {
  unspecified(0, 'COUPON_TYPE_UNSPECIFIED', '未知'),
  fixed(1, 'COUPON_TYPE_FIXED', '满减券'),
  percent(2, 'COUPON_TYPE_PERCENT', '折扣券'),
  shipping(3, 'COUPON_TYPE_SHIPPING', '免运费券');

  const CouponType(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum UserCouponStatus {
  unspecified(0, 'USER_COUPON_STATUS_UNSPECIFIED', '未知'),
  unused(1, 'USER_COUPON_STATUS_UNUSED', '未使用'),
  used(2, 'USER_COUPON_STATUS_USED', '已使用'),
  expired(3, 'USER_COUPON_STATUS_EXPIRED', '已过期');

  const UserCouponStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum ShipmentStatus {
  unspecified(0, 'SHIPMENT_STATUS_UNSPECIFIED', '未知'),
  pending(1, 'SHIPMENT_STATUS_PENDING', '待发货'),
  shipped(2, 'SHIPMENT_STATUS_SHIPPED', '已发货'),
  delivered(3, 'SHIPMENT_STATUS_DELIVERED', '已签收'),
  exception(4, 'SHIPMENT_STATUS_EXCEPTION', '运输异常');

  const ShipmentStatus(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

enum NotificationType {
  unspecified(0, 'NOTIFICATION_TYPE_UNSPECIFIED', '未知'),
  order(1, 'NOTIFICATION_TYPE_ORDER', '订单'),
  logistics(2, 'NOTIFICATION_TYPE_LOGISTICS', '物流'),
  promotion(3, 'NOTIFICATION_TYPE_PROMOTION', '活动'),
  system(4, 'NOTIFICATION_TYPE_SYSTEM', '系统');

  const NotificationType(this.code, this.wire, this.label);
  final int code;
  final String wire;
  final String label;
}

/// 将 Dart 枚举名转为 `pending_payment` 形式，便于与后端短名匹配。
String enumKey(String dartName) => dartName
    .replaceAllMapped(RegExp(r'([A-Z])'), (match) => '_${match[1]}')
    .toUpperCase()
    .replaceFirst('_', '');

/// 解析后端枚举值：支持字符串（`ORDER_STATUS_PAID` / `PAID`）与 proto 序号。
///
/// [raw] 为后端返回的原始值，[values] 为该枚举的全部取值。
T parseEnumValue<T>(
  dynamic raw,
  List<T> values,
  String Function(T) wireOf,
  String Function(T) keyOf,
) {
  if (raw == null) return values.first;
  if (raw is int) {
    if (raw >= 0 && raw < values.length) return values[raw];
    return values.first;
  }
  if (raw is num) {
    final index = raw.toInt();
    if (index >= 0 && index < values.length) return values[index];
    return values.first;
  }
  final text = raw.toString().trim();
  if (text.isEmpty) return values.first;
  for (final value in values) {
    if (wireOf(value).toUpperCase() == text.toUpperCase()) return value;
  }
  final normalized = text.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toLowerCase();
  for (final value in values) {
    final key = keyOf(value).toLowerCase();
    if (key == normalized || key.endsWith(normalized)) return value;
  }
  return values.first;
}

/// 订单状态到中文的扩展。
extension OrderStatusLabel on OrderStatus {
  String get text => label;
  bool get isPendingPayment => this == OrderStatus.pendingPayment;
  bool get isPaid => this == OrderStatus.paid;
  bool get isShipped => this == OrderStatus.shipped;
  bool get isFinished =>
      this == OrderStatus.completed || this == OrderStatus.cancelled ||
      this == OrderStatus.refunded || this == OrderStatus.closed;
  bool get isRefunding => this == OrderStatus.refunding;
}

/// 商品状态扩展。
extension ProductStatusLabel on ProductStatus {
  String get text => label;
}

/// 支付状态扩展。
extension PaymentStatusLabel on PaymentStatus {
  String get text => label;
  bool get isSuccess => this == PaymentStatus.success;
}

/// 支付渠道扩展。
extension PaymentChannelLabel on PaymentChannel {
  String get text => label;
}

/// 优惠券类型扩展。
extension CouponTypeLabel on CouponType {
  String get text => label;
}

/// 用户券状态扩展。
extension UserCouponStatusLabel on UserCouponStatus {
  String get text => label;
}

/// 物流状态扩展。
extension ShipmentStatusLabel on ShipmentStatus {
  String get text => label;
}

/// 通知类型扩展。
extension NotificationTypeLabel on NotificationType {
  String get text => label;
}

/// 用户状态扩展。
extension UserStatusLabel on UserStatus {
  String get text => label;
}

/// 性别扩展。
extension GenderLabel on Gender {
  String get text => label;
}

/// 评价状态扩展。
extension ReviewStatusLabel on ReviewStatus {
  String get text => label;
}
