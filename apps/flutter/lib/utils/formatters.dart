import 'package:intl/intl.dart';

/// 金额单位为「分」，统一格式化为「元」。
class Money {
  Money._();

  /// 分 -> 元字符串，保留两位小数。
  static String formatYuan(int cents) {
    final negative = cents < 0;
    final value = (cents.abs() / 100).toStringAsFixed(2);
    return negative ? '-$value' : value;
  }

  /// 分 -> 带货币符号的金额，如 `¥4299.00`。
  static String formatYuanWithSymbol(int cents) => '¥${formatYuan(cents)}';

  /// 分 -> 去掉小数尾零的金额，如 `¥4299`。
  static String formatYuanCompact(int cents) {
    final yuan = cents / 100;
    if (yuan == yuan.roundToDouble()) {
      return '¥${yuan.round()}';
    }
    return '¥${yuan.toStringAsFixed(2)}';
  }
}

/// 金额格式化扩展。
extension MoneyFormat on int {
  String get formatYuan => Money.formatYuan(this);
  String get formatYuanWithSymbol => Money.formatYuanWithSymbol(this);
}

/// 时间格式化工具，输入为 RFC3339 字符串。
class DateFormatter {
  DateFormatter._();

  static final DateFormat _date = DateFormat('yyyy-MM-dd');
  static final DateFormat _dateTime = DateFormat('yyyy-MM-dd HH:mm');
  static final DateFormat _dateTimeSec = DateFormat('yyyy-MM-dd HH:mm:ss');
  static final DateFormat _monthDay = DateFormat('MM-dd');
  static final DateFormat _clock = DateFormat('HH:mm');

  static DateTime? parse(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  /// `2026-10-20 14:30`
  static String dateTime(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    return _dateTime.format(time.toLocal());
  }

  /// `2026-10-20 14:30:12`
  static String dateTimeSec(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    return _dateTimeSec.format(time.toLocal());
  }

  /// `2026-10-20`
  static String date(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    return _date.format(time.toLocal());
  }

  /// `10-20`
  static String monthDay(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    return _monthDay.format(time.toLocal());
  }

  /// `14:30`
  static String clock(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    return _clock.format(time.toLocal());
  }

  /// 相对时间：刚刚 / 5 分钟前 / 3 天前
  static String relative(String? raw, {String fallback = '--'}) {
    final time = parse(raw);
    if (time == null) return fallback;
    final diff = DateTime.now().difference(time.toLocal());
    if (diff.inSeconds < 60) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes} 分钟前';
    if (diff.inHours < 24) return '${diff.inHours} 小时前';
    if (diff.inDays < 30) return '${diff.inDays} 天前';
    return date(raw, fallback: fallback);
  }

  /// Unix 秒时间戳 -> `yyyy-MM-dd`
  static String fromUnix(int? seconds, {String fallback = '--'}) {
    if (seconds == null || seconds <= 0) return fallback;
    return _date.format(DateTime.fromMillisecondsSinceEpoch(seconds * 1000).toLocal());
  }
}

/// 销量文本：超过 1 万显示「x.x万」。
class SalesFormatter {
  SalesFormatter._();

  static String format(int sales) {
    if (sales >= 10000) {
      return '${(sales / 10000).toStringAsFixed(1)}万';
    }
    return '$sales';
  }
}
