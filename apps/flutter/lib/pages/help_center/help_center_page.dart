import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/expansion.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 帮助中心页：分类展示帮助文章，数据来自 `GET /api/v1/help/articles`。
class HelpCenterPage extends ConsumerWidget {
  const HelpCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(helpArticlesProvider(''));
    return Scaffold(
      appBar: AppBar(title: const Text('帮助中心')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: articles.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '暂无帮助文章',
                    subtitle: '有疑问可先查看订单、支付等常见问题',
                    icon: Icons.help_outline_rounded,
                    actionText: '提交反馈',
                    onAction: () => context.push('/user/feedback'),
                  );
                }
                final categories = <String, List<HelpArticle>>{};
                for (final article in list) {
                  categories.putIfAbsent(article.category, () => []).add(article);
                }
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    for (final entry in categories.entries) ...[
                      AppCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.folder_outlined,
                                    size: 18, color: AppTheme.brand),
                                const SizedBox(width: 8),
                                Text(
                                  entry.key.isEmpty ? '常见问题' : entry.key,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  '${entry.value.length} 篇',
                                  style: const TextStyle(
                                      fontSize: 12, color: AppTheme.textTertiary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            for (final article in entry.value)
                              InkWell(
                                onTap: () =>
                                    context.push('/help/article/${article.id}'),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 9),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          article.title,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: AppTheme.textSecondary,
                                          ),
                                        ),
                                      ),
                                      const Icon(Icons.chevron_right_rounded,
                                          size: 16,
                                          color: AppTheme.textTertiary),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      onTap: () => context.push('/user/feedback'),
                      child: const Row(
                        children: [
                          Icon(Icons.chat_bubble_outline_rounded,
                              size: 18, color: AppTheme.brand),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '没有找到答案？提交反馈告诉我们',
                              style: TextStyle(
                                  fontSize: 13, color: AppTheme.textPrimary),
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded,
                              size: 18, color: AppTheme.textTertiary),
                        ],
                      ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '帮助文章加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(helpArticlesProvider('')),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 文章摘要行（供其他页面复用）。
class HelpArticleTile extends StatelessWidget {
  const HelpArticleTile({super.key, required this.article});

  final HelpArticle article;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/help/article/${article.id}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    style: const TextStyle(
                        fontSize: 14, color: AppTheme.textPrimary),
                  ),
                  if (article.summary.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      article.summary,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.textTertiary),
                    ),
                  ],
                  if (article.updatedAt.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      '更新于 ${DateFormatter.date(article.updatedAt)}',
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textQuaternary),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: AppTheme.textTertiary),
          ],
        ),
      ),
    );
  }
}
