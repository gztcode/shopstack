import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/invoice.dart';
import 'core_providers.dart';

/// 发票申请列表。
final invoicesProvider = FutureProvider<InvoicesResult>((ref) async {
  try {
    return await ref.read(invoiceApiProvider).listInvoices(page: 1, pageSize: 50);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final invoices = MockStore.instance.invoices();
    return InvoicesResult(
      invoices: invoices,
      meta: PageMeta(page: 1, pageSize: invoices.length, total: invoices.length, totalPages: 1),
    );
  }
});

/// 发票相关写操作。
class InvoiceActions {
  InvoiceActions(this.ref);

  final Ref ref;

  /// 申请开票，成功返回发票，失败返回错误信息。
  Future<(Invoice?, String?)> createInvoice({
    required String orderNo,
    required String title,
    String taxNo = '',
    String type = 'personal',
    String email = '',
    int amountCents = 0,
    String remark = '',
  }) async {
    try {
      final invoice = await ref.read(invoiceApiProvider).createInvoice(
            orderNo: orderNo,
            title: title,
            taxNo: taxNo,
            type: type,
            email: email,
            amountCents: amountCents,
            remark: remark,
          );
      ref.invalidate(invoicesProvider);
      return (invoice, null);
    } on ApiException catch (e) {
      return (null, e.message);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      final invoice = MockStore.instance.createInvoice(
        orderNo: orderNo,
        title: title,
        taxNo: taxNo,
        type: type,
        email: email,
        amountCents: amountCents,
        remark: remark,
      );
      ref.invalidate(invoicesProvider);
      return (invoice, null);
    }
  }
}

final invoiceActionsProvider = Provider<InvoiceActions>(InvoiceActions.new);
