import '../models/expansion.dart';
import '../models/marketing.dart';
import '../models/order.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 订单接口。
class OrderApi {
  OrderApi(this.client);

  final ApiClient client;

  /// 创建订单。
  ///
  /// [items] 为直接下单条目，[cartItemIds] 为从购物车结算的条目。
  Future<Order> createOrder({
    List<Map<String, dynamic>> items = const <Map<String, dynamic>>[],
    bool fromCart = false,
    List<int> cartItemIds = const <int>[],
    int addressId = 0,
    int couponId = 0,
    String remark = '',
    String paymentMethod = 'wechat',
    int pointsUsed = 0,
  }) async {
    final data = await client.post('/orders', body: {
      'items': items,
      'from_cart': fromCart,
      'cart_item_ids': cartItemIds,
      'address_id': addressId,
      'coupon_id': couponId,
      'remark': remark,
      'payment_method': paymentMethod,
      'points_used': pointsUsed,
    });
    return Order.fromJson(data);
  }

  /// 订单详情。
  Future<OrderDetail> orderDetail(int id) async {
    final data = await client.get('/orders/$id');
    return OrderDetail.fromJson(data);
  }

  /// 订单列表。
  Future<OrderListResult> listOrders({
    int? status,
    int page = 1,
    int pageSize = 20,
    String? keyword,
  }) async {
    final keywordParam =
        (keyword == null || keyword.isEmpty) ? null : keyword;
    final data = await client.get('/orders', query: {
      'status': ?status,
      'page.page': page,
      'page.page_size': pageSize,
      'keyword': ?keywordParam,
    });
    return OrderListResult.fromJson(data);
  }

  /// 取消订单。
  Future<Order> cancelOrder(int id, {String reason = ''}) async {
    final data = await client.post('/orders/$id/cancel', body: {'reason': reason});
    return Order.fromJson(data);
  }

  /// 确认收货。
  Future<Order> confirmReceipt(int id) async {
    final data = await client.post('/orders/$id/confirm');
    return Order.fromJson(data);
  }

  /// 申请退款。
  Future<dynamic> applyRefund(
    int id, {
    List<int> itemIds = const <int>[],
    int amountCents = 0,
    String reason = '',
    String description = '',
  }) async {
    final data = await client.post('/orders/$id/refund', body: {
      'item_ids': itemIds,
      'amount_cents': amountCents,
      'reason': reason,
      'description': description,
    });
    return data;
  }

  /// 退款原因选项（与前端表单一致）。

  /// 订单状态日志。
  Future<List<OrderStatusLog>> logs(int orderId) async {
    final data = await client.get('/orders/$orderId/logs');
    return JsonUtilLogs.fromJson(data);
  }

  /// 订单数量统计。
  Future<OrderCount> count() async {
    final data = await client.get('/orders/count');
    return OrderCount.fromJson(data);
  }
  /// 售后列表。
  Future<PagedList<AfterSale>> afterSales({
    int page = 1,
    int pageSize = 20,
    String? status,
  }) async {
    final data = await client.get('/after-sales', query: {
      'status': ?status,
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PagedList<AfterSale>(
      items: JsonUtil.asMapList(data['afterSales'])
          .map(AfterSale.fromJson)
          .toList(),
      total: JsonUtil.intOf(JsonUtil.asMap(data['meta']), 'total'),
      page: page,
    );
  }

  /// 售后详情。
  Future<AfterSale> afterSaleDetail(int id) async {
    final data = await client.get('/after-sales/$id');
    return AfterSale.fromJson(data);
  }

  /// 提交售后申请。
  Future<AfterSale> createAfterSale({
    required int orderId,
    required int type,
    required String reason,
    int amountCents = 0,
    String description = '',
    List<int> itemIds = const <int>[],
    List<String> images = const <String>[],
  }) async {
    final data = await client.post('/after-sales', body: {
      'order_id': orderId,
      'type': type,
      'reason': reason,
      'amount_cents': amountCents,
      'description': description,
      'item_ids': itemIds,
      'images': images,
    });
    return AfterSale.fromJson(data);
  }

  /// 退款原因选项。
  Future<List<RefundReason>> refundReasons() async {
    final data = await client.get('/refund-reasons');
    return JsonUtil.asMapList(data['reasons'])
        .map(RefundReason.fromJson)
        .toList();
  }

  /// 下单前确认：返回可结算预览（金额、可用券、地址校验结果）。
  ///
  /// 后端结算预览是 `POST /api/v1/marketing/preview`（营销域），
  /// 不存在 `/orders/confirm` 路由。
  Future<CheckoutPreview> confirmOrder({
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
}

/// 订单日志解析辅助（单独放置以避免与模型文件循环依赖）。
class JsonUtilLogs {
  JsonUtilLogs._();

  static List<OrderStatusLog> fromJson(Map<String, dynamic> data) {
    final raw = data['logs'];
    if (raw is! List) return const <OrderStatusLog>[];
    return raw
        .map((e) => OrderStatusLog.fromJson(
            e is Map ? e.map((k, v) => MapEntry('$k', v)) : <String, dynamic>{}))
        .toList();
  }
}
