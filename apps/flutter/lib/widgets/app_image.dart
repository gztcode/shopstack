import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// 统一的网络图片组件：自带占位、错误占位与圆角。
class AppImage extends StatelessWidget {
  const AppImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.radius = 0,
    this.icon = Icons.image_not_supported_outlined,
  });

  final String url;
  final double? width;
  final double? height;
  final BoxFit fit;
  final double radius;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      width: width,
      height: height,
      color: AppTheme.bgMuted,
      alignment: Alignment.center,
      child: Icon(icon, size: 20, color: AppTheme.textTertiary),
    );
    Widget image;
    if (url.isEmpty) {
      image = placeholder;
    } else {
      image = CachedNetworkImage(
        imageUrl: url,
        width: width,
        height: height,
        fit: fit,
        placeholder: (context, url) => Container(
          width: width,
          height: height,
          color: AppTheme.bgMuted,
        ),
        errorWidget: (context, url, error) => placeholder,
      );
    }
    if (radius <= 0) return image;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: image,
    );
  }
}
