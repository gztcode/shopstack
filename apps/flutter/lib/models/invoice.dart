import '../utils/json_util.dart';
import 'common.dart';

/// 发票申请，对应 shopstack.user.v1.Invoice。
class Invoice {
  const Invoice({
    this.id = 0,
    this.userId = 0,
    this.orderNo = '',
    this.title = '',
    this.taxNo = '',
    this.type = 'personal',
    this.email = '',
    this.amountCents = 0,
    this.status = 0,
    this.invoiceUrl = '',
    this.remark = '',
    this.createdAt = '',
  });

  final int id;
  final int userId;

  /// 关联订单号。
  final String orderNo;

  /// 发票抬头。
  final String title;

  /// 纳税人识别号。
  final String taxNo;

  /// personal | company。
  final String type;
  final String email;
  final int amountCents;

  /// 0 待开票 1 已开票 2 已驳回。
  final int status;
  final String invoiceUrl;
  final String remark;
  final String createdAt;

  bool get isCompany => type == 'company';

  String get typeLabel => isCompany ? '企业发票' : '个人发票';

  String get statusLabel => invoiceStatusLabel(status);

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: JsonUtil.intOf(json, 'id'),
        userId:
            JsonUtil.intOf(json, 'user_id', JsonUtil.intOf(json, 'userId')),
        orderNo: JsonUtil.stringOf(json, 'order_no',
            JsonUtil.stringOf(json, 'orderNo')),
        title: JsonUtil.stringOf(json, 'title'),
        taxNo:
            JsonUtil.stringOf(json, 'tax_no', JsonUtil.stringOf(json, 'taxNo')),
        type: JsonUtil.stringOf(json, 'type', 'personal'),
        email: JsonUtil.stringOf(json, 'email'),
        amountCents: JsonUtil.intOf(json, 'amount_cents',
            JsonUtil.intOf(json, 'amountCents')),
        status: JsonUtil.intOf(json, 'status'),
        invoiceUrl: JsonUtil.stringOf(json, 'invoice_url',
            JsonUtil.stringOf(json, 'invoiceUrl')),
        remark: JsonUtil.stringOf(json, 'remark'),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'order_no': orderNo,
        'title': title,
        'tax_no': taxNo,
        'type': type,
        'email': email,
        'amount_cents': amountCents,
        'status': status,
        'invoice_url': invoiceUrl,
        'remark': remark,
        'created_at': createdAt,
      };
}

/// 发票列表结果（对应 ListInvoicesResponse）。
class InvoicesResult {
  const InvoicesResult({
    this.invoices = const <Invoice>[],
    this.meta = PageMeta.empty,
  });

  final List<Invoice> invoices;
  final PageMeta meta;

  factory InvoicesResult.fromJson(Map<String, dynamic> json) => InvoicesResult(
        invoices:
            JsonUtil.asMapList(json['invoices']).map(Invoice.fromJson).toList(),
        meta: PageMeta.fromJson(JsonUtil.asMap(json['meta'])),
      );
}

/// 发票状态中文映射。
String invoiceStatusLabel(int status) {
  switch (status) {
    case 0:
      return '待开票';
    case 1:
      return '已开票';
    case 2:
      return '已驳回';
    default:
      return '未知状态';
  }
}
