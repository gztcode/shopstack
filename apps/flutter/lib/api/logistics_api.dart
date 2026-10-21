import '../models/expansion.dart';
import '../models/logistics.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 物流接口。
class LogisticsApi {
  LogisticsApi(this.client);

  final ApiClient client;

  /// 查询订单物流。
  Future<LogisticsResult> orderLogistics(int orderId) async {
    final data = await client.get('/logistics/order/$orderId');
    return LogisticsResult.fromJson(data);
  }

  /// 按订单号查询物流轨迹。
  Future<LogisticsResult> tracksByOrder(int orderId) async {
    final data = await client.get('/logistics/tracks', query: {
      'order_id': orderId,
    });
    return LogisticsResult.fromJson(data);
  }

  /// 按运单号查询物流轨迹。
  Future<LogisticsResult> trackingByNo(String trackingNo) async {
    final data = await client.get('/logistics/tracking/$trackingNo');
    return LogisticsResult.fromJson(data);
  }

  /// 运费试算。
  ///
  /// 后端是 `POST /api/v1/logistics/freight`，参数为
  /// template_id / amount_cents / region / quantity。
  Future<FreightQuote> freight({
    required int templateId,
    required int amountCents,
    required String region,
    int quantity = 1,
  }) async {
    final data = await client.post('/logistics/freight', body: {
      'template_id': templateId,
      'amount_cents': amountCents,
      'region': region,
      'quantity': quantity,
    });
    return FreightQuote.fromJson(data);
  }

  /// 快递公司列表。
  Future<List<LogisticsCompany>> companies() async {
    final data = await client.get('/logistics/companies');
    return JsonUtil.asMapList(data['companies'])
        .map(LogisticsCompany.fromJson)
        .toList();
  }

  /// 配送范围列表。
  Future<List<DeliveryRange>> ranges() async {
    final data = await client.get('/logistics/ranges');
    return JsonUtil.asMapList(data['ranges'])
        .map(DeliveryRange.fromJson)
        .toList();
  }
}
