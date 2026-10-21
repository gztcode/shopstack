import '../utils/enums.dart';
import '../utils/json_util.dart';

/// 支付单，对应 shopstack.payment.v1.Payment。
class Payment {
  const Payment({
    this.id = 0,
    this.paymentNo = '',
    this.orderId = 0,
    this.orderNo = '',
    this.userId = 0,
    this.amountCents = 0,
    this.refundedCents = 0,
    this.status = PaymentStatus.pending,
    this.channel = PaymentChannel.unspecified,
    this.transactionId = '',
    this.prepayId = '',
    this.payParams = const <String, String>{},
    this.failReason = '',
    this.paidAt = '',
    this.createdAt = '',
    this.updatedAt = '',
  });

  final int id;
  final String paymentNo;
  final int orderId;
  final String orderNo;
  final int userId;
  final int amountCents;
  final int refundedCents;
  final PaymentStatus status;
  final PaymentChannel channel;
  final String transactionId;
  final String prepayId;
  final Map<String, String> payParams;
  final String failReason;
  final String paidAt;
  final String createdAt;
  final String updatedAt;

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: JsonUtil.intOf(json, 'id'),
        paymentNo: JsonUtil.stringOf(json, 'payment_no',
            JsonUtil.stringOf(json, 'paymentNo')),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        orderNo: JsonUtil.stringOf(json, 'order_no',
            JsonUtil.stringOf(json, 'orderNo')),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        amountCents: JsonUtil.intOf(json, 'amount_cents',
            JsonUtil.intOf(json, 'amountCents')),
        refundedCents: JsonUtil.intOf(json, 'refunded_cents',
            JsonUtil.intOf(json, 'refundedCents')),
        status: parseEnumValue<PaymentStatus>(
          json['status'],
          PaymentStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        channel: parseEnumValue<PaymentChannel>(
          json['channel'],
          PaymentChannel.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        transactionId: JsonUtil.stringOf(json, 'transaction_id',
            JsonUtil.stringOf(json, 'transactionId')),
        prepayId:
            JsonUtil.stringOf(json, 'prepay_id', JsonUtil.stringOf(json, 'prepayId')),
        payParams: JsonUtil.asStringMap(json['pay_params']),
        failReason: JsonUtil.stringOf(json, 'fail_reason',
            JsonUtil.stringOf(json, 'failReason')),
        paidAt:
            JsonUtil.stringOf(json, 'paid_at', JsonUtil.stringOf(json, 'paidAt')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        updatedAt: JsonUtil.stringOf(json, 'updated_at',
            JsonUtil.stringOf(json, 'updatedAt')),
      );
}
