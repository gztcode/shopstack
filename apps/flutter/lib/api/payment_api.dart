import '../models/expansion.dart';
import '../models/payment.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 支付接口。
class PaymentApi {
  PaymentApi(this.client);

  final ApiClient client;

  /// 创建支付单。
  Future<Payment> createPayment({
    required int orderId,
    required int channel,
    String returnUrl = '',
  }) async {
    final data = await client.post('/payments', body: {
      'order_id': orderId,
      'channel': channel,
      'return_url': returnUrl,
    });
    return Payment.fromJson(data);
  }

  /// 查询支付状态。
  Future<Payment> queryPayment({int? paymentId, int? orderId}) async {
    final data = await client.get('/payments/query', query: {
      'payment_id': ?paymentId,
      'order_id': ?orderId,
    });
    return Payment.fromJson(data);
  }

  /// 充值配置（面额区间与赠送规则）。
  Future<RechargeConfig> rechargeConfig() async {
    final data = await client.get('/payments/recharge-config');
    return RechargeConfig.fromJson(data);
  }

  /// 发起充值。
  Future<RechargeRecord> recharge({
    required int amountCents,
    String channel = 'wechat',
  }) async {
    final data = await client.post('/payments/recharge', body: {
      'amount_cents': amountCents,
      'channel': channel,
    });
    return RechargeRecord.fromJson(data);
  }

  /// 充值记录。
  Future<PagedList<RechargeRecord>> recharges({
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/payments/recharges', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PagedList<RechargeRecord>(
      items: JsonUtil.asMapList(data['recharges'])
          .map(RechargeRecord.fromJson)
          .toList(),
      total: JsonUtil.intOf(JsonUtil.asMap(data['meta']), 'total'),
      page: page,
    );
  }

  /// 余额流水。
  Future<PagedList<BalanceLog>> balanceLogs({
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/payments/balance-logs', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PagedList<BalanceLog>(
      items:
          JsonUtil.asMapList(data['logs']).map(BalanceLog.fromJson).toList(),
      total: JsonUtil.intOf(JsonUtil.asMap(data['meta']), 'total'),
      page: page,
    );
  }

  /// 可用支付渠道。
  Future<List<PayChannel>> payChannels() async {
    final data = await client.get('/admin/pay-channels', query: {
      'page.page': 1,
      'page.page_size': 50,
    });
    return JsonUtil.asMapList(data['payChannels'])
        .map(PayChannel.fromJson)
        .toList();
  }
}
