import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/catalog_provider.dart';
import '../../providers/expansion_providers.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 商品参数页：展示商品的规格参数，数据来自
/// `GET /api/v1/products/{id}/params`。
class ProductParamsPage extends ConsumerWidget {
  const ProductParamsPage({super.key, this.productId = 0});

  /// 商品 id。
  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final params = ref.watch(productParamsProvider(productId));
    final detail = ref.watch(productDetailProvider(productId));
    final title = detail.asData?.value.product.title ?? '商品参数';

    return Scaffold(
      appBar: AppBar(title: const Text('商品参数')),
      body: Column(
        children: [
          const DemoBanner(),
          if (title.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: AppCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.table_chart_outlined,
                        size: 18, color: AppTheme.brand),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    const Text(
                      '商品参数',
                      style:
                          TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: params.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无参数信息',
                    subtitle: '该商品暂未录入规格参数，可先查看商品详情',
                    icon: Icons.table_chart_outlined,
                    actionText: '查看商品详情',
                    onAction: () =>
                        context.push('/product/$productId'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final param = list[index];
                    return AppCard(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 92,
                            child: Text(
                              param.name,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textTertiary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              param.value.isEmpty ? '暂无' : param.value,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '参数加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(productParamsProvider(productId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
