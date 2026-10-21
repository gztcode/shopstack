import '../utils/enums.dart';
import '../utils/json_util.dart';
import 'common.dart';

/// 订单条目，对应 shopstack.order.v1.OrderItem。
class OrderItem {
  const OrderItem({
    this.id = 0,
    this.orderId = 0,
    this.productId = 0,
    this.skuId = 0,
    this.productTitle = '',
    this.specText = '',
    this.image = '',
    this.priceCents = 0,
    this.quantity = 1,
    this.subtotalCents = 0,
    this.refundedCents = 0,
    this.reviewed = false,
  });

  final int id;
  final int orderId;
  final int productId;
  final int skuId;
  final String productTitle;
  final String specText;
  final String image;
  final int priceCents;
  final int quantity;
  final int subtotalCents;
  final int refundedCents;
  final bool reviewed;

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        id: JsonUtil.intOf(json, 'id'),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        skuId:
            JsonUtil.intOf(json, 'sku_id', JsonUtil.intOf(json, 'skuId')),
        productTitle: JsonUtil.stringOf(json, 'product_title',
            JsonUtil.stringOf(json, 'productTitle')),
        specText: JsonUtil.stringOf(json, 'spec_text',
            JsonUtil.stringOf(json, 'specText')),
        image: JsonUtil.stringOf(json, 'image'),
        priceCents: JsonUtil.intOf(json, 'price_cents',
            JsonUtil.intOf(json, 'priceCents')),
        quantity: JsonUtil.intOf(json, 'quantity', 1),
        subtotalCents: JsonUtil.intOf(json, 'subtotal_cents',
            JsonUtil.intOf(json, 'subtotalCents')),
        refundedCents: JsonUtil.intOf(json, 'refunded_cents',
            JsonUtil.intOf(json, 'refundedCents')),
        reviewed: JsonUtil.boolOf(json, 'reviewed'),
      );
}

/// 订单，对应 shopstack.order.v1.Order。
class Order {
  const Order({
    this.id = 0,
    this.orderNo = '',
    this.userId = 0,
    this.userNickname = '',
    this.status = OrderStatus.pendingPayment,
    this.totalAmountCents = 0,
    this.discountCents = 0,
    this.freightCents = 0,
    this.payableCents = 0,
    this.paidCents = 0,
    this.refundedCents = 0,
    this.itemCount = 0,
    this.totalQuantity = 0,
    this.address,
    this.remark = '',
    this.paymentMethod = '',
    this.paidAt = '',
    this.shippedAt = '',
    this.completedAt = '',
    this.cancelledAt = '',
    this.createdAt = '',
    this.updatedAt = '',
    this.adminRemark = '',
    this.shipmentId = 0,
  });

  final int id;
  final String orderNo;
  final int userId;
  final String userNickname;
  final OrderStatus status;
  final int totalAmountCents;
  final int discountCents;
  final int freightCents;
  final int payableCents;
  final int paidCents;
  final int refundedCents;
  final int itemCount;
  final int totalQuantity;
  final Address? address;
  final String remark;
  final String paymentMethod;
  final String paidAt;
  final String shippedAt;
  final String completedAt;
  final String cancelledAt;
  final String createdAt;
  final String updatedAt;
  final String adminRemark;
  final int shipmentId;

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: JsonUtil.intOf(json, 'id'),
        orderNo: JsonUtil.stringOf(json, 'order_no',
            JsonUtil.stringOf(json, 'orderNo')),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        userNickname: JsonUtil.stringOf(json, 'user_nickname',
            JsonUtil.stringOf(json, 'userNickname')),
        status: parseEnumValue<OrderStatus>(
          json['status'],
          OrderStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        totalAmountCents: JsonUtil.intOf(json, 'total_amount_cents',
            JsonUtil.intOf(json, 'totalAmountCents')),
        discountCents: JsonUtil.intOf(json, 'discount_cents',
            JsonUtil.intOf(json, 'discountCents')),
        freightCents: JsonUtil.intOf(json, 'freight_cents',
            JsonUtil.intOf(json, 'freightCents')),
        payableCents: JsonUtil.intOf(json, 'payable_cents',
            JsonUtil.intOf(json, 'payableCents')),
        paidCents: JsonUtil.intOf(json, 'paid_cents',
            JsonUtil.intOf(json, 'paidCents')),
        refundedCents: JsonUtil.intOf(json, 'refunded_cents',
            JsonUtil.intOf(json, 'refundedCents')),
        itemCount: JsonUtil.intOf(json, 'item_count',
            JsonUtil.intOf(json, 'itemCount')),
        totalQuantity: JsonUtil.intOf(json, 'total_quantity',
            JsonUtil.intOf(json, 'totalQuantity')),
        address: json['address'] == null
            ? null
            : Address.fromJson(JsonUtil.asMap(json['address'])),
        remark: JsonUtil.stringOf(json, 'remark'),
        paymentMethod: JsonUtil.stringOf(json, 'payment_method',
            JsonUtil.stringOf(json, 'paymentMethod')),
        paidAt:
            JsonUtil.stringOf(json, 'paid_at', JsonUtil.stringOf(json, 'paidAt')),
        shippedAt: JsonUtil.stringOf(json, 'shipped_at',
            JsonUtil.stringOf(json, 'shippedAt')),
        completedAt: JsonUtil.stringOf(json, 'completed_at',
            JsonUtil.stringOf(json, 'completedAt')),
        cancelledAt: JsonUtil.stringOf(json, 'cancelled_at',
            JsonUtil.stringOf(json, 'cancelledAt')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        updatedAt: JsonUtil.stringOf(json, 'updated_at',
            JsonUtil.stringOf(json, 'updatedAt')),
        adminRemark: JsonUtil.stringOf(json, 'admin_remark',
            JsonUtil.stringOf(json, 'adminRemark')),
        shipmentId: JsonUtil.intOf(json, 'shipment_id',
            JsonUtil.intOf(json, 'shipmentId')),
      );
}

/// 订单状态日志，对应 shopstack.order.v1.OrderStatusLog。
class OrderStatusLog {
  const OrderStatusLog({
    this.id = 0,
    this.orderId = 0,
    this.fromStatus = 0,
    this.toStatus = 0,
    this.action = '',
    this.operator = '',
    this.remark = '',
    this.createdAt = '',
  });

  final int id;
  final int orderId;
  final int fromStatus;
  final int toStatus;
  final String action;
  final String operator;
  final String remark;
  final String createdAt;

  factory OrderStatusLog.fromJson(Map<String, dynamic> json) => OrderStatusLog(
        id: JsonUtil.intOf(json, 'id'),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        fromStatus: JsonUtil.intOf(json, 'from_status',
            JsonUtil.intOf(json, 'fromStatus')),
        toStatus:
            JsonUtil.intOf(json, 'to_status', JsonUtil.intOf(json, 'toStatus')),
        action: JsonUtil.stringOf(json, 'action'),
        operator: JsonUtil.stringOf(json, 'operator'),
        remark: JsonUtil.stringOf(json, 'remark'),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
      );
}

/// 订单详情，对应 shopstack.order.v1.OrderDetail。
class OrderDetail {
  const OrderDetail({
    this.order = const Order(),
    this.items = const <OrderItem>[],
    this.logs = const <OrderStatusLog>[],
    this.couponId = 0,
    this.couponName = '',
    this.paymentId = 0,
    this.shipmentId = 0,
    this.trackingNo = '',
    this.logisticsCompany = '',
    this.logisticsTracks = const <String>[],
    this.canCancel = false,
    this.canPay = false,
    this.canConfirm = false,
    this.canRefund = false,
    this.canReview = false,
  });

  final Order order;
  final List<OrderItem> items;
  final List<OrderStatusLog> logs;
  final int couponId;
  final String couponName;
  final int paymentId;
  final int shipmentId;
  final String trackingNo;
  final String logisticsCompany;
  final List<String> logisticsTracks;
  final bool canCancel;
  final bool canPay;
  final bool canConfirm;
  final bool canRefund;
  final bool canReview;

  factory OrderDetail.fromJson(Map<String, dynamic> json) => OrderDetail(
        order: Order.fromJson(JsonUtil.asMap(json['order'])),
        items: JsonUtil.asMapList(json['items']).map(OrderItem.fromJson).toList(),
        logs: JsonUtil.asMapList(json['logs']).map(OrderStatusLog.fromJson).toList(),
        couponId: JsonUtil.intOf(json, 'coupon_id',
            JsonUtil.intOf(json, 'couponId')),
        couponName:
            JsonUtil.stringOf(json, 'coupon_name', JsonUtil.stringOf(json, 'couponName')),
        paymentId:
            JsonUtil.intOf(json, 'payment_id', JsonUtil.intOf(json, 'paymentId')),
        shipmentId: JsonUtil.intOf(json, 'shipment_id',
            JsonUtil.intOf(json, 'shipmentId')),
        trackingNo: JsonUtil.stringOf(json, 'tracking_no',
            JsonUtil.stringOf(json, 'trackingNo')),
        logisticsCompany: JsonUtil.stringOf(json, 'logistics_company',
            JsonUtil.stringOf(json, 'logisticsCompany')),
        logisticsTracks: JsonUtil.asStringList(json['logistics_tracks']),
        canCancel: JsonUtil.boolOf(json, 'can_cancel',
            JsonUtil.boolOf(json, 'canCancel')),
        canPay:
            JsonUtil.boolOf(json, 'can_pay', JsonUtil.boolOf(json, 'canPay')),
        canConfirm: JsonUtil.boolOf(json, 'can_confirm',
            JsonUtil.boolOf(json, 'canConfirm')),
        canRefund: JsonUtil.boolOf(json, 'can_refund',
            JsonUtil.boolOf(json, 'canRefund')),
        canReview: JsonUtil.boolOf(json, 'can_review',
            JsonUtil.boolOf(json, 'canReview')),
      );
}

/// 退款单，对应 shopstack.order.v1.Refund。
class Refund {
  const Refund({
    this.id = 0,
    this.refundNo = '',
    this.orderId = 0,
    this.orderNo = '',
    this.userId = 0,
    this.amountCents = 0,
    this.reason = '',
    this.description = '',
    this.itemIds = const <int>[],
    this.status = 0,
    this.adminRemark = '',
    this.createdAt = '',
    this.processedAt = '',
  });

  final int id;
  final String refundNo;
  final int orderId;
  final String orderNo;
  final int userId;
  final int amountCents;
  final String reason;
  final String description;
  final List<int> itemIds;
  final int status;
  final String adminRemark;
  final String createdAt;
  final String processedAt;

  String get statusLabel => const ['待审核', '已通过', '已驳回', '已退款'][status.clamp(0, 3)];

  factory Refund.fromJson(Map<String, dynamic> json) => Refund(
        id: JsonUtil.intOf(json, 'id'),
        refundNo: JsonUtil.stringOf(json, 'refund_no',
            JsonUtil.stringOf(json, 'refundNo')),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        orderNo: JsonUtil.stringOf(json, 'order_no',
            JsonUtil.stringOf(json, 'orderNo')),
        userId: JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        amountCents: JsonUtil.intOf(json, 'amount_cents',
            JsonUtil.intOf(json, 'amountCents')),
        reason: JsonUtil.stringOf(json, 'reason'),
        description: JsonUtil.stringOf(json, 'description'),
        itemIds: JsonUtil.asIntList(json['item_ids']),
        status: JsonUtil.intOf(json, 'status'),
        adminRemark: JsonUtil.stringOf(json, 'admin_remark',
            JsonUtil.stringOf(json, 'adminRemark')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        processedAt: JsonUtil.stringOf(json, 'processed_at',
            JsonUtil.stringOf(json, 'processedAt')),
      );
}

/// 订单数量统计，对应 shopstack.order.v1.OrderCountResponse。
class OrderCount {
  const OrderCount({
    this.pendingPayment = 0,
    this.pendingShipment = 0,
    this.pendingReceipt = 0,
    this.refunding = 0,
  });

  final int pendingPayment;
  final int pendingShipment;
  final int pendingReceipt;
  final int refunding;

  int get total =>
      pendingPayment + pendingShipment + pendingReceipt + refunding;

  factory OrderCount.fromJson(Map<String, dynamic> json) => OrderCount(
        pendingPayment: JsonUtil.intOf(json, 'pending_payment',
            JsonUtil.intOf(json, 'pendingPayment')),
        pendingShipment: JsonUtil.intOf(json, 'pending_shipment',
            JsonUtil.intOf(json, 'pendingShipment')),
        pendingReceipt: JsonUtil.intOf(json, 'pending_receipt',
            JsonUtil.intOf(json, 'pendingReceipt')),
        refunding:
            JsonUtil.intOf(json, 'refunding', JsonUtil.intOf(json, 'refunding')),
      );
}

/// 订单列表结果，对应 shopstack.order.v1.ListOrdersResponse。
class OrderListResult {
  const OrderListResult({
    this.orders = const <Order>[],
    this.meta = PageMeta.empty,
    this.pendingPaymentCount = 0,
    this.pendingShipmentCount = 0,
    this.pendingReceiptCount = 0,
    this.refundingCount = 0,
  });

  final List<Order> orders;
  final PageMeta meta;
  final int pendingPaymentCount;
  final int pendingShipmentCount;
  final int pendingReceiptCount;
  final int refundingCount;

  factory OrderListResult.fromJson(Map<String, dynamic> json) => OrderListResult(
        orders: JsonUtil.asMapList(json['orders']).map(Order.fromJson).toList(),
        meta: PageMeta.fromJson(JsonUtil.asMap(json['meta'])),
        pendingPaymentCount: JsonUtil.intOf(json, 'pending_payment_count',
            JsonUtil.intOf(json, 'pendingPaymentCount')),
        pendingShipmentCount: JsonUtil.intOf(json, 'pending_shipment_count',
            JsonUtil.intOf(json, 'pendingShipmentCount')),
        pendingReceiptCount: JsonUtil.intOf(json, 'pending_receipt_count',
            JsonUtil.intOf(json, 'pendingReceiptCount')),
        refundingCount: JsonUtil.intOf(json, 'refunding_count',
            JsonUtil.intOf(json, 'refundingCount')),
      );
}
