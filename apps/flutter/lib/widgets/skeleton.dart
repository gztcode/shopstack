import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

/// 骨架占位块。
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 14,
    this.radius = 6,
  });

  final double? width;
  /// 为 null 时填满父约束（配合 Expanded 使用）。
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppTheme.bgMuted,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

/// 商品卡片骨架。
class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 与商品卡保持一致：图片占位吃掉剩余高度，
        // 固定高度在矮容器里会溢出（黄色溢出条）。
        const Expanded(
          child: SkeletonBox(height: null, radius: 10),
        ),
        const SizedBox(height: 10),
        const SkeletonBox(width: 110),
        const SizedBox(height: 8),
        const SkeletonBox(width: 70),
        const SizedBox(height: 10),
        const SkeletonBox(width: 90, height: 22, radius: 11),
      ],
    );
  }
}

/// 列表行骨架。
class ListRowSkeleton extends StatelessWidget {
  const ListRowSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      child: Row(
        children: [
          const SkeletonBox(width: 76, height: 76, radius: 10),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBox(height: 16),
                SizedBox(height: 8),
                SkeletonBox(height: 14, width: 120),
                SizedBox(height: 12),
                SkeletonBox(height: 18, width: 90),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
