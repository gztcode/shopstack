import 'package:flutter/material.dart';

import 'app_tokens.dart';
import 'generated_app_tokens.dart';
import 'token_parsers.dart';

/// App 主题：完全基于 design-tokens 的 AppColors / AppBreakpoints 构建。
///
/// 颜色与尺寸来自 tool/sync_tokens.sh 同步生成的常量（唯一来源仍是 design-tokens）。
class AppTheme {
  AppTheme._();

  // 常用颜色（来自令牌）。
  static const Color brand = AppColorTokens.colorBrand600;
  static const Color brandDark = AppColorTokens.colorBrand700;
  static const Color brand50 = AppColorTokens.colorBrand50;
  static const Color brand100 = AppColorTokens.colorBrand100;
  static const Color brand200 = AppColorTokens.colorBrand200;
  static const Color brand900 = AppColorTokens.colorBrand900;
  static const Color brand600 = AppColorTokens.colorBrand600;
  static const Color accent = AppColorTokens.colorAccent500;
  static const Color accent500 = AppColorTokens.colorAccent500;
  static const Color accent50 = AppColorTokens.colorAccent50;
  static const Color accent600 = AppColorTokens.colorAccent600;
  static const Color accent700 = AppColorTokens.colorAccent700;
  static const Color success = AppColorTokens.colorSuccess500;
  static const Color success600 = AppColorTokens.colorSuccess600;
  static const Color success50 = AppColorTokens.colorSuccess50;
  static const Color success700 = AppColorTokens.colorSuccess700;
  static const Color warning = AppColorTokens.colorWarning500;
  static const Color warning600 = AppColorTokens.colorWarning600;
  static const Color warning50 = AppColorTokens.colorWarning50;
  static const Color warning700 = AppColorTokens.colorWarning700;
  static const Color danger = AppColorTokens.colorDanger500;
  static const Color danger600 = AppColorTokens.colorDanger600;
  static const Color danger50 = AppColorTokens.colorDanger50;
  static const Color danger700 = AppColorTokens.colorDanger700;
  static const Color info = AppColorTokens.colorInfo500;
  static const Color info600 = AppColorTokens.colorInfo600;
  static const Color info50 = AppColorTokens.colorInfo50;
  static const Color info700 = AppColorTokens.colorInfo700;
  static const Color purple500 = AppColorTokens.colorPurple500;
  static const Color purple50 = AppColorTokens.colorPurple50;
  static const Color textPrimary = AppColorTokens.colorTextPrimary;
  static const Color textSecondary = AppColorTokens.colorTextSecondary;
  static const Color textTertiary = AppColorTokens.colorTextTertiary;
  static const Color textQuaternary = AppColorTokens.colorTextQuaternary;
  static const Color textPlaceholder = AppColorTokens.colorTextPlaceholder;
  static const Color bgPage = AppColorTokens.colorBgPage;
  static const Color bgCard = AppColorTokens.colorBgCard;
  static const Color bgSubtle = AppColorTokens.colorBgSubtle;
  static const Color bgMuted = AppColorTokens.colorBgMuted;
  static const Color borderSubtle = AppColorTokens.colorBorderSubtle;
  static const Color borderDefault = AppColorTokens.colorBorderDefault;
  static const Color borderStrong = AppColorTokens.colorBorderStrong;

  // 圆角（来自令牌）。
  static const double radiusXs = AppSizeTokens.radiusXs;
  static const double radiusSm = AppSizeTokens.radiusSm;
  static const double radiusMd = AppSizeTokens.radiusMd;
  static const double radiusLg = AppSizeTokens.radiusLg;
  static const double radiusXl = AppSizeTokens.radiusXl;
  static const double radiusPill = AppSizeTokens.radiusPill;

  // 阴影（由令牌字符串解析）。
  static final List<BoxShadow> shadowSm =
      TokenParser.shadows(AppColors.shadowSm);
  static final List<BoxShadow> shadowMd =
      TokenParser.shadows(AppColors.shadowMd);
  static final List<BoxShadow> shadowLg =
      TokenParser.shadows(AppColors.shadowLg);
  static final List<BoxShadow> shadowBrand =
      TokenParser.shadows(AppColors.shadowBrand);

  /// 浅色主题。
  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: brand,
      brightness: Brightness.light,
    ).copyWith(
      primary: brand,
      onPrimary: Colors.white,
      secondary: accent,
      surface: bgCard,
      onSurface: textPrimary,
      error: danger,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bgPage,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: const AppBarTheme(
        backgroundColor: bgCard,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 17,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusLg)),
      ),
      dividerTheme: const DividerThemeData(
        color: borderSubtle,
        thickness: 0.6,
        space: 0.6,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: brand,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: brand,
          side: const BorderSide(color: borderDefault),
          minimumSize: const Size.fromHeight(44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMd),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: brand,
          textStyle: const TextStyle(fontSize: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgMuted,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: const TextStyle(color: textTertiary, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: brand, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: danger, width: 1.4),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: bgCard,
        indicatorColor: brand50,
        elevation: 0,
        height: 58,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 11,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w600
                : FontWeight.w400,
            color: states.contains(WidgetState.selected) ? brand : textTertiary,
          ),
        ),
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: brand,
        unselectedLabelColor: textSecondary,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: Colors.transparent,
        labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 14),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: bgCard,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXl)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: textPrimary,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusMd),
        ),
      ),
      textTheme: const TextTheme(
        titleLarge: TextStyle(
            fontSize: 20, fontWeight: FontWeight.w600, color: textPrimary),
        titleMedium: TextStyle(
            fontSize: 16, fontWeight: FontWeight.w600, color: textPrimary),
        titleSmall: TextStyle(
            fontSize: 15, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: TextStyle(fontSize: 15, color: textPrimary, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, color: textSecondary, height: 1.5),
        bodySmall: TextStyle(fontSize: 13, color: textSecondary, height: 1.5),
        labelSmall: TextStyle(fontSize: 12, color: textTertiary),
      ),
    );
  }
}
