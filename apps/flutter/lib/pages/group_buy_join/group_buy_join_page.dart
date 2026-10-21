import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';
import '../../widgets/quantity_stepper.dart';

/// 参团下单页：确认拼团数量并参团，数据来自
/// `POST /api/v1/group-buys/{id}/join`。
class GroupBuyJoinPage extends ConsumerStatefulWidget {
  const GroupBuyJoinPage({super.key, this.groupBuyId = 0});

  /// 拼团 id。
  final int groupBuyId;

  @override
  ConsumerState<GroupBuyJoinPage> createState() => _GroupBuyJoinPageState();
}

class _GroupBuyJoinPageState extends ConsumerState<GroupBuyJoinPage> {
  int _quantity = 1;

  @override
  Widget build(BuildContext context) {
    final group = ref.watch(groupBuyDetailProvider(widget.groupBuyId));
    return Scaffold(
      appBar: AppBar(title: const Text('参团下单')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: group.when(
              data: (data) {
                final limit = data.perUserLimit > 0 ? data.perUserLimit : 1;
                final total = data.priceCents * _quantity;
                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  children: [
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            data.title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            data.description,
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Text(
                                '拼团价',
                                style: TextStyle(
                                    fontSize: 13, color: AppTheme.textSecondary),
                              ),
                              const SizedBox(width: 8),
                              PriceText(cents: data.priceCents, size: 20),
                              const Spacer(),
                              StatusTag(
                                text: '${data.joinedMembers}/${data.requiredMembers} 人',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                              '购买数量',
                              style: TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.textPrimary),
                            ),
                          ),
                          QuantityStepper(
                            value: _quantity,
                            max: limit,
                            onChanged: (value) =>
                                setState(() => _quantity = value),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '每人限 $limit 件',
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textTertiary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        children: [
                          _Row(
                              label: '商品金额',
                              value: Money.formatYuanWithSymbol(total)),
                          const SizedBox(height: 10),
                          const _Row(label: '运费', value: '¥0.00 包邮'),
                          const Divider(height: 24),
                          Row(
                            children: [
                              const Text(
                                '应付金额',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary),
                              ),
                              const Spacer(),
                              PriceText(cents: total, size: 20),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => _join(context, ref),
                      child: const Text('确认参团'),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '拼团信息加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(
                    groupBuyDetailProvider(widget.groupBuyId)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final message = await ref
        .read(expansionActionsProvider)
        .joinGroupBuy(widget.groupBuyId);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    if (context.mounted) {
      context.push('/group-buy/${widget.groupBuyId}');
    }
  }
}

/// 结算行。
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary),
        ),
      ],
    );
  }
}
