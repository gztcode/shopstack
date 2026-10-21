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
import '../../widgets/price_text.dart';

/// 售后列表页：展示我的售后申请，数据来自 `GET /api/v1/after-sales`。
class AfterSaleListPage extends ConsumerWidget {
  const AfterSaleListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sales = ref.watch(afterSalesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('售后列表')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: sales.when(
              data: (result) {
                if (result.items.isEmpty) {
                  return EmptyState(
                    title: '暂无售后记录',
                    subtitle: '订单有问题时可在这里提交退款或退货申请',
                    icon: Icons.assignment_return_outlined,
                    actionText: '去申请售后',
                    onAction: () => context.push('/after-sale/apply'),
                  );
                }
                return RefreshIndicator(
                  color: AppTheme.brand,
                  onRefresh: () async => ref.invalidate(afterSalesProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                    itemCount: result.items.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final sale = result.items[index];
                      return _AfterSaleCard(sale: sale);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '售后列表加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(afterSalesProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 售后卡片。
class _AfterSaleCard extends StatelessWidget {
  const _AfterSaleCard({required this.sale});

  final AfterSale sale;

  @override
  Widget build(BuildContext context) {
    final label = sale.statusLabel;
    final color = switch (sale.status) {
      1 || 4 => AppTheme.success,
      2 => AppTheme.danger,
      3 => AppTheme.accent600,
      _ => AppTheme.warning,
    };
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/after-sale/${sale.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '售后单 #${sale.id}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              StatusTag(text: label, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '订单号 ${sale.orderNo}',
            style: const TextStyle(fontSize: 11, color: AppTheme.textTertiary),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Text(
                '退款金额',
                style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
              ),
              const SizedBox(width: 6),
              PriceText(cents: sale.amountCents, size: 16),
              const Spacer(),
              StatusTag(
                text: sale.typeLabel,
                color: AppTheme.accent600,
              ),
            ],
          ),
          if (sale.reason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '原因：${sale.reason}',
              style: const TextStyle(
                  fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                DateFormatter.dateTime(sale.createdAt),
                style: const TextStyle(
                    fontSize: 11, color: AppTheme.textTertiary),
              ),
              const Spacer(),
              const Icon(Icons.chevron_right_rounded,
                  size: 16, color: AppTheme.textTertiary),
            ],
          ),
        ],
      ),
    );
  }
}
