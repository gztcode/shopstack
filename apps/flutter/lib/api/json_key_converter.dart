/// JSON 键名转换工具。
///
/// 后端（protojson + UseProtoNames）输出 snake_case，而 App 内的 Dart Model 使用
/// camelCase，因此需要在 dio 层做一次响应体的键名转换；请求方向则相反。
class JsonKeyConverter {
  JsonKeyConverter._();

  /// 仅匹配「小写单词 + 下划线」形式的键，避免误伤 camelCase、中文或含大写的键。
  static final RegExp _snakeKey = RegExp(r'^[a-z0-9]+(_[a-z0-9]+)*$');

  /// camelCase 中大写字母的位置。
  static final RegExp _upperCase = RegExp(r'([A-Z])');

  /// 响应方向：snake_case -> camelCase。
  static dynamic snakeToCamel(dynamic value) {
    if (value is Map) {
      final result = <String, dynamic>{};
      value.forEach((key, val) {
        result[_snakeToCamelKey('$key')] = snakeToCamel(val);
      });
      return result;
    }
    if (value is List) {
      return value.map(snakeToCamel).toList();
    }
    return value;
  }

  /// 请求方向：camelCase -> snake_case。
  static dynamic camelToSnake(dynamic value) {
    if (value is Map) {
      final result = <String, dynamic>{};
      value.forEach((key, val) {
        result[_camelToSnakeKey('$key')] = camelToSnake(val);
      });
      return result;
    }
    if (value is List) {
      return value.map(camelToSnake).toList();
    }
    return value;
  }

  /// `min_price_cents` -> `minPriceCents`；`id` -> `id`。
  static String _snakeToCamelKey(String key) {
    if (!key.contains('_') || !_snakeKey.hasMatch(key)) return key;
    final parts = key.split('_');
    final buffer = StringBuffer(parts.first);
    for (final part in parts.skip(1)) {
      if (part.isEmpty) continue;
      buffer
        ..write(part[0].toUpperCase())
        ..write(part.substring(1));
    }
    return buffer.toString();
  }

  /// `minPriceCents` -> `min_price_cents`；已是 snake_case 的键保持不变。
  static String _camelToSnakeKey(String key) {
    if (!key.contains(RegExp('[A-Z]'))) return key;
    return key.replaceAllMapped(_upperCase, (match) => '_${match[1]}').toLowerCase();
  }
}
