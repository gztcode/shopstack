import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../utils/formatters.dart';

/// 价格文本：金额单位为「分」。
class PriceText extends StatelessWidget {
  const PriceText({
    super.key,
    required this.cents,
    this.size = 18,
    this.color,
    this.bold = true,
    this.showSymbol = true,
  });

  final int cents;
  final double size;
  final Color? color;
  final bool bold;
  final bool showSymbol;

  @override
  Widget build(BuildContext context) {
    final text = showSymbol
        ? Money.formatYuanWithSymbol(cents)
        : Money.formatYuan(cents);
    return Text(
      text,
      style: TextStyle(
        fontSize: size,
        height: 1.1,
        fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
        color: color ?? AppTheme.danger,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    );
  }
}

/// 原价（划线）。
class OriginalPriceText extends StatelessWidget {
  const OriginalPriceText({super.key, required this.cents, this.size = 12});

  final int cents;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Text(
      Money.formatYuanWithSymbol(cents),
      style: TextStyle(
        fontSize: size,
        color: AppTheme.textTertiary,
        decoration: TextDecoration.lineThrough,
        decorationColor: AppTheme.textTertiary,
      ),
    );
  }
}
