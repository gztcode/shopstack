import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../help_center/help_center_page.dart';

/// 帮助文章页：展示文章正文，数据来自 `GET /api/v1/help/articles/{id}`。
class HelpArticlePage extends ConsumerWidget {
  const HelpArticlePage({super.key, this.articleId = 0});

  /// 文章 id。
  final int articleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final article = ref.watch(helpArticleProvider(articleId));
    final related = ref.watch(helpArticlesProvider(''));
    return Scaffold(
      appBar: AppBar(title: const Text('帮助文章')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: article.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (data.category.isNotEmpty) ...[
                          StatusTag(text: data.category),
                          const SizedBox(height: 10),
                        ],
                        Text(
                          data.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '更新于 ${DateFormatter.date(data.updatedAt)}',
                          style: const TextStyle(
                              fontSize: 11, color: AppTheme.textTertiary),
                        ),
                        const Divider(height: 24),
                        Text(
                          data.content.isEmpty ? data.summary : data.content,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.8,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  related.when(
                    data: (list) {
                      final others = list
                          .where((item) => item.id != articleId)
                          .toList();
                      if (others.isEmpty) return const SizedBox.shrink();
                      return AppCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '相关问题',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            for (final item in others)
                              HelpArticleTile(article: item),
                          ],
                        ),
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (error, stack) => const SizedBox.shrink(),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '文章加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(helpArticleProvider(articleId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
