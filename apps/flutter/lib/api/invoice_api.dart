import '../models/invoice.dart';
import 'api_client.dart';

/// 发票申请接口。
class InvoiceApi {
  InvoiceApi(this.client);

  final ApiClient client;

  /// 发票申请列表。
  Future<InvoicesResult> listInvoices({
    int page = 1,
    int pageSize = 20,
    int? status,
  }) async {
    final data = await client.get('/users/invoices', query: {
      'page.page': page,
      'page.page_size': pageSize,
      'status': ?status,
    });
    return InvoicesResult.fromJson(data);
  }

  /// 申请开票。
  Future<Invoice> createInvoice({
    required String orderNo,
    required String title,
    String taxNo = '',
    String type = 'personal',
    String email = '',
    int amountCents = 0,
    String remark = '',
  }) async {
    final data = await client.post('/users/invoices', body: {
      'order_no': orderNo,
      'title': title,
      'tax_no': taxNo,
      'type': type,
      'email': email,
      'amount_cents': amountCents,
      'remark': remark,
    });
    return Invoice.fromJson(data);
  }
}
