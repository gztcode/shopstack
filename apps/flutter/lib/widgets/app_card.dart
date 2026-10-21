import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// 通用卡片：白底 + 圆角 + 柔和阴影。
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(12),
    this.margin,
    this.radius,
    this.onTap,
    this.color,
    this.shadow = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double? radius;
  final VoidCallback? onTap;
  final Color? color;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppTheme.bgCard,
        borderRadius: BorderRadius.circular(radius ?? AppTheme.radiusLg),
        boxShadow: shadow ? AppTheme.shadowSm : null,
      ),
      child: child,
    );
    if (margin != null) {
      return Padding(padding: margin!, child: content);
    }
    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius ?? AppTheme.radiusLg),
        child: content,
      ),
    );
  }
}

/// 区块标题：左侧标题 + 右侧更多。
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
    this.padding = const EdgeInsets.fromLTRB(12, 16, 12, 8),
  });

  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: AppTheme.brand,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          if (subtitle != null) ...[
            const SizedBox(width: 8),
            Text(subtitle!, style: Theme.of(context).textTheme.labelSmall),
          ],
          const Spacer(),
          if (actionText != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(
                    actionText!,
                    style: TextStyle(
                        fontSize: 13, color: AppTheme.textTertiary),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      size: 16, color: AppTheme.textTertiary),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 状态标签。
class StatusTag extends StatelessWidget {
  const StatusTag({
    super.key,
    required this.text,
    this.color,
    this.background,
    this.icon,
  });

  final String text;
  final Color? color;
  final Color? background;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final foreground = color ?? AppTheme.brand;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: background ?? foreground.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: foreground),
            const SizedBox(width: 3),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: foreground,
            ),
          ),
        ],
      ),
    );
  }
}
