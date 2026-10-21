import 'package:flutter/material.dart';

/// 设计令牌解析工具：把 tokens.dart 中的字符串令牌还原为 Flutter 图形对象。
///
/// 这样 App 内不重复手写任何颜色 / 圆角 / 阴影常量，唯一来源仍是 design-tokens。
class TokenParser {
  TokenParser._();

  /// 解析颜色令牌：`#RRGGBB` 或 `rgba(r, g, b, a)`。
  static Color color(String token) {
    final value = token.trim();
    if (value.isEmpty) return const Color(0xFF000000);
    if (value.startsWith('#')) {
      final hex = value.substring(1);
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
      if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
      if (hex.length == 3) {
        final expanded = hex.split('').map((c) => '$c$c').join();
        return Color(int.parse('FF$expanded', radix: 16));
      }
    }
    if (value.startsWith('rgba')) {
      final inner = value.substring(value.indexOf('(') + 1, value.lastIndexOf(')'));
      final parts = inner.split(',').map((p) => p.trim()).toList();
      if (parts.length >= 3) {
        final r = int.tryParse(parts[0]) ?? 0;
        final g = int.tryParse(parts[1]) ?? 0;
        final b = int.tryParse(parts[2]) ?? 0;
        final a = parts.length > 3 ? (double.tryParse(parts[3]) ?? 1) : 1.0;
        return Color.fromRGBO(r, g, b, a);
      }
    }
    if (value.startsWith('rgb')) {
      final inner = value.substring(value.indexOf('(') + 1, value.lastIndexOf(')'));
      final parts = inner.split(',').map((p) => p.trim()).toList();
      if (parts.length >= 3) {
        return Color.fromRGBO(
          int.tryParse(parts[0]) ?? 0,
          int.tryParse(parts[1]) ?? 0,
          int.tryParse(parts[2]) ?? 0,
          1,
        );
      }
    }
    return const Color(0xFF000000);
  }

  /// 解析尺寸令牌：`16px` -> 16。
  static double size(String token) {
    final cleaned = token.replaceAll('px', '').trim();
    return double.tryParse(cleaned) ?? 0;
  }

  /// 解析阴影令牌：`0 4px 12px rgba(...)` -> BoxShadow 列表。
  static List<BoxShadow> shadows(String token) {
    final parts = _splitTopLevel(token);
    final shadows = <BoxShadow>[];
    for (final part in parts) {
      final trimmed = part.trim();
      if (trimmed.isEmpty) continue;
      final spaceIndex = trimmed.indexOf(' ');
      if (spaceIndex < 0) continue;
      final geometry = trimmed.substring(0, spaceIndex).trim().split(' ');
      final colorText = trimmed.substring(spaceIndex + 1).trim();
      final dx = _number(geometry, 0);
      final dy = _number(geometry, 1);
      final blur = _number(geometry, 2);
      final spread = _number(geometry, 3);
      shadows.add(BoxShadow(
        color: color(colorText),
        offset: Offset(dx, dy),
        blurRadius: blur,
        spreadRadius: spread,
      ));
    }
    return shadows;
  }

  /// 读取阴影几何数值，缺失时按 0 处理。
  static double _number(List<String> parts, int index) {
    if (index >= parts.length) return 0;
    final text = parts[index].replaceAll('px', '').trim();
    return double.tryParse(text) ?? 0;
  }

  /// 按顶层逗号切分（忽略括号内的逗号）。
  static List<String> _splitTopLevel(String value) {
    final result = <String>[];
    final buffer = StringBuffer();
    var depth = 0;
    for (final rune in value.runes) {
      final char = String.fromCharCode(rune);
      if (char == '(') depth++;
      if (char == ')') depth--;
      if (char == ',' && depth == 0) {
        result.add(buffer.toString());
        buffer.clear();
        continue;
      }
      buffer.write(char);
    }
    if (buffer.isNotEmpty) result.add(buffer.toString());
    return result;
  }
}
