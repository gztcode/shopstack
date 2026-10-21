import '../utils/json_util.dart';
import 'common.dart';

/// 积分变动记录，对应 shopstack.user.v1.PointsLog。
class PointsLog {
  const PointsLog({
    this.id = 0,
    this.userId = 0,
    this.title = '',
    this.change = 0,
    this.balance = 0,
    this.bizType = '',
    this.bizId = '',
    this.createdAt = '',
  });

  final int id;
  final int userId;

  /// 变动说明（如「签到奖励」）。
  final String title;

  /// 变动数值，正数为增加，负数为减少。
  final int change;

  /// 变动后余额。
  final int balance;

  /// 业务类型：register / order / exchange / admin / sign / review。
  final String bizType;

  /// 关联业务 id。
  final String bizId;
  final String createdAt;

  bool get isIncrease => change >= 0;

  /// 业务类型中文映射。
  String get bizTypeLabel => pointsBizTypeLabel(bizType);

  factory PointsLog.fromJson(Map<String, dynamic> json) => PointsLog(
        id: JsonUtil.intOf(json, 'id'),
        userId: JsonUtil.intOf(json, 'user_id',
            JsonUtil.intOf(json, 'userId')),
        title: JsonUtil.stringOf(json, 'title'),
        change: JsonUtil.intOf(json, 'change'),
        balance: JsonUtil.intOf(json, 'balance'),
        bizType: JsonUtil.stringOf(json, 'biz_type',
            JsonUtil.stringOf(json, 'bizType')),
        bizId: JsonUtil.stringOf(json, 'biz_id',
            JsonUtil.stringOf(json, 'bizId')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'title': title,
        'change': change,
        'balance': balance,
        'biz_type': bizType,
        'biz_id': bizId,
        'created_at': createdAt,
      };
}

/// 积分明细列表结果（对应 ListPointsLogsResponse）。
class PointsLogsResult {
  const PointsLogsResult({
    this.logs = const <PointsLog>[],
    this.meta = PageMeta.empty,
    this.currentPoints = 0,
  });

  final List<PointsLog> logs;
  final PageMeta meta;

  /// 当前积分。
  final int currentPoints;

  factory PointsLogsResult.fromJson(Map<String, dynamic> json) =>
      PointsLogsResult(
        logs: JsonUtil.asMapList(json['logs']).map(PointsLog.fromJson).toList(),
        meta: PageMeta.fromJson(JsonUtil.asMap(json['meta'])),
        currentPoints: JsonUtil.intOf(json, 'current_points',
            JsonUtil.intOf(json, 'currentPoints')),
      );
}

/// 积分业务类型中文映射。
String pointsBizTypeLabel(String bizType) {
  switch (bizType.toLowerCase()) {
    case 'register':
      return '注册奖励';
    case 'sign':
      return '签到奖励';
    case 'order':
      return '订单获得';
    case 'review':
      return '评价奖励';
    case 'exchange':
      return '积分兑换';
    case 'admin':
      return '后台调整';
    case 'refund':
      return '退款退回';
    case 'consume':
      return '消费扣除';
    case 'expire':
      return '积分过期';
    default:
      return bizType.isEmpty ? '积分变动' : bizType;
  }
}
