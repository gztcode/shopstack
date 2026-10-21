/// JSON 解析辅助工具。
///
/// 后端网关可能以 snake_case 或 camelCase 输出字段（protojson 默认 camelCase，
/// 网关层多转换为 snake_case），因此所有模型统一走这里的取值逻辑。
class JsonUtil {
  JsonUtil._();

  static Map<String, dynamic> asMap(dynamic value) {
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return <String, dynamic>{};
  }

  static List<Map<String, dynamic>> asMapList(dynamic value) {
    if (value is List) {
      return value.whereType<Map>().map(asMap).toList();
    }
    return <Map<String, dynamic>>[];
  }

  static List<String> asStringList(dynamic value) {
    if (value is List) {
      return value.map((e) => e?.toString() ?? '').toList();
    }
    return <String>[];
  }

  static List<int> asIntList(dynamic value) {
    if (value is List) {
      return value.map((e) {
        if (e is int) return e;
        if (e is num) return e.toInt();
        return int.tryParse(e?.toString() ?? '') ?? 0;
      }).toList();
    }
    return <int>[];
  }

  static Map<String, String> asStringMap(dynamic value) {
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val?.toString() ?? ''));
    }
    return <String, String>{};
  }

  static int intOf(Map<String, dynamic> json, String key, [int fallback = 0]) {
    final value = json[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value) ?? fallback;
    return fallback;
  }

  static double doubleOf(Map<String, dynamic> json, String key, [double fallback = 0]) {
    final value = json[key];
    if (value is double) return value;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? fallback;
    return fallback;
  }

  static String stringOf(Map<String, dynamic> json, String key, [String fallback = '']) {
    final value = json[key];
    if (value == null) return fallback;
    if (value is String) return value;
    return value.toString();
  }

  static bool boolOf(Map<String, dynamic> json, String key, [bool fallback = false]) {
    final value = json[key];
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) return value == 'true' || value == '1';
    return fallback;
  }

  /// 优先取 snake_case 字段，缺失时回退 camelCase。
  static dynamic valueOf(Map<String, dynamic> json, String snake, String camel) {
    final snakeValue = json[snake];
    if (snakeValue != null) return snakeValue;
    return json[camel];
  }
}
