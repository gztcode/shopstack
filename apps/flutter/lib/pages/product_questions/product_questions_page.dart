import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/catalog_provider.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 商品问答页：展示买家提问与商家回复，数据来自
/// `GET /api/v1/products/{id}/questions`。
class ProductQuestionsPage extends ConsumerWidget {
  const ProductQuestionsPage({super.key, this.productId = 0});

  /// 商品 id。
  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final questions = ref.watch(productQuestionsProvider(productId));
    final detail = ref.watch(productDetailProvider(productId));
    final title = detail.asData?.value.product.title ?? '商品问答';

    return Scaffold(
      appBar: AppBar(title: const Text('商品问答')),
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
                    AppImage(
                      url: detail.asData?.value.product.cover ?? '',
                      width: 44,
                      height: 44,
                      radius: AppTheme.radiusMd,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '买家提问与商家回复',
                            style: TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.push('/product/$productId'),
                      child: const Text('看商品'),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: questions.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无提问',
                    subtitle: '成为第一个提问的人，商家会尽快回复',
                    icon: Icons.question_answer_outlined,
                    actionText: '查看商品详情',
                    onAction: () => context.push('/product/$productId'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = list[index];
                    return AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                decoration: const BoxDecoration(
                                  color: AppTheme.brand50,
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: const Icon(Icons.person_rounded,
                                    size: 15, color: AppTheme.brand),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item.userNickname.isEmpty
                                      ? '匿名买家'
                                      : item.userNickname,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ),
                              Text(
                                DateFormatter.date(item.createdAt),
                                style: const TextStyle(
                                    fontSize: 11, color: AppTheme.textTertiary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            item.question,
                            style: const TextStyle(
                              fontSize: 14,
                              height: 1.5,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          if (item.answered && item.answer.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppTheme.brand50,
                                borderRadius:
                                    BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    '商家回答',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.brand,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.answer,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        height: 1.5,
                                        color: AppTheme.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          ] else
                            Padding(
                              padding: const EdgeInsets.only(top: 10),
                              child: Row(
                                children: [
                                  const Icon(Icons.hourglass_empty_rounded,
                                      size: 14, color: AppTheme.textTertiary),
                                  const SizedBox(width: 4),
                                  Text(
                                    '商家待回复',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary),
                                  ),
                                ],
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
                title: '问答加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(productQuestionsProvider(productId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
