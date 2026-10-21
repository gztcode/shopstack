import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';
import '../models/product.dart';
import '../utils/formatters.dart';
import 'app_image.dart';
import 'price_text.dart';

/// 商品卡片：图片、标题、价格、销量、加购按钮。
class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
    this.onAddToCart,
    this.width,
  });

  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 图片区吃掉剩余高度：卡片高度由外层网格的 childAspectRatio 决定，
            // 若图片按固定比例占位，格子稍矮就会把内容顶出边界（黄色溢出条）。
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.vertical(
                    top: Radius.circular(AppTheme.radiusLg)),
                child: AppImage(url: product.cover),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                  const SizedBox(height: 8),
                  // 窄卡片里「现价 + 划线原价」可能放不下，
                  // 在横向 Row 内做弹性：空间不足时整体等比缩小而不是挤出边界。
                  Row(
                    children: [
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              PriceText(cents: product.minPriceCents, size: 16),
                              if (product.hasDiscount) ...[
                                const SizedBox(width: 6),
                                OriginalPriceText(cents: product.maxPriceCents),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '已售 ${SalesFormatter.format(product.salesCount)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 11, color: AppTheme.textTertiary),
                        ),
                      ),
                      if (onAddToCart != null)
                        InkWell(
                          onTap: onAddToCart,
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusSm),
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: AppTheme.brand,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusSm),
                            ),
                            child: const Icon(Icons.add_rounded,
                                size: 16, color: Colors.white),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
