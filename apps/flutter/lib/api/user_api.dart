import '../models/expansion.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 用户中心扩展接口：会员等级、成长值、发票抬头、通知设置、账号安全、
/// 实名认证与意见反馈。
class UserApi {
  UserApi(this.client);

  final ApiClient client;

  /// 我的会员等级。
  Future<UserLevelInfo> level() async {
    final data = await client.get('/users/level');
    return UserLevelInfo.fromJson(data);
  }

  /// 全部会员等级。
  Future<List<UserLevel>> levels() async {
    final data = await client.get('/marketing/levels');
    return JsonUtil.asMapList(data['levels']).map(UserLevel.fromJson).toList();
  }

  /// 成长值明细。
  Future<PagedList<GrowthLog>> growthLogs({
    int page = 1,
    int pageSize = 20,
  }) async {
    final data = await client.get('/users/growth-logs', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    return PagedList<GrowthLog>(
      items:
          JsonUtil.asMapList(data['logs']).map(GrowthLog.fromJson).toList(),
      total: JsonUtil.intOf(JsonUtil.asMap(data['meta']), 'total'),
      page: page,
    );
  }

  /// 发票抬头模板列表。
  Future<List<InvoiceTemplate>> invoiceTemplates() async {
    final data = await client.get('/users/invoice-templates');
    return JsonUtil.asMapList(data['templates'])
        .map(InvoiceTemplate.fromJson)
        .toList();
  }

  /// 新增发票抬头模板。
  Future<InvoiceTemplate> createInvoiceTemplate({
    required String title,
    String taxNo = '',
    String type = 'personal',
    String email = '',
    String address = '',
    String phone = '',
    String bankName = '',
    String bankAccount = '',
    bool isDefault = false,
  }) async {
    final data = await client.post('/users/invoice-templates', body: {
      'title': title,
      'tax_no': taxNo,
      'type': type,
      'email': email,
      'address': address,
      'phone': phone,
      'bank_name': bankName,
      'bank_account': bankAccount,
      'is_default': isDefault,
    });
    return InvoiceTemplate.fromJson(data);
  }

  /// 删除发票抬头模板。
  Future<void> deleteInvoiceTemplate(int id) async {
    await client.delete('/users/invoice-templates/$id');
  }

  /// 通知设置。
  ///
  /// 后端 `UserNotificationSettings` 为扁平结构，这里拆成可逐项开关的列表。
  Future<List<NotificationSetting>> notificationSettings() async {
    final data = await client.get('/users/notification-settings');
    return NotificationSetting.fromSettings(JsonUtil.asMap(data));
  }

  /// 更新通知设置。
  ///
  /// 后端为全量更新，需把所有分类一起提交。
  Future<List<NotificationSetting>> updateNotificationSetting({
    required List<NotificationSetting> current,
    required String category,
    required bool enabled,
  }) async {
    final data = await client.put(
      '/users/notification-settings',
      body: NotificationSetting.toRequestBody(current, category, enabled),
    );
    return NotificationSetting.fromSettings(JsonUtil.asMap(data));
  }

  /// 账号安全信息。
  Future<SecurityInfo> security() async {
    final data = await client.get('/users/security');
    return SecurityInfo.fromJson(data);
  }

  /// 提交实名认证。
  Future<bool> realname({
    required String realName,
    required String idCard,
  }) async {
    final data = await client.post('/users/realname', body: {
      'real_name': realName,
      'id_card': idCard,
    });
    return JsonUtil.intOf(data, 'id') > 0;
  }

  /// 提交意见反馈。
  ///
  /// 后端 `type` 为整型：1 功能建议 2 使用问题 3 投诉 4 其他。
  Future<bool> feedback({
    required String content,
    int type = 1,
    String contact = '',
  }) async {
    final data = await client.post('/users/feedback', body: {
      'content': content,
      'type': type,
      'contact': contact,
    });
    return JsonUtil.boolOf(data, 'success', JsonUtil.boolOf(data, 'accepted', true));
  }
}
