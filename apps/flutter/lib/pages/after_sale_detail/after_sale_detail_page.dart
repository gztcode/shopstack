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

/// 售后详情页：展示单个售后申请的进度，数据来自
/// `GET /api/v1/after-sales/{id}`。
class AfterSaleDetailPage extends ConsumerWidget {
  const AfterSaleDetailPage({super.key, this.afterSaleId = 0});

  /// 售后单 id。
  final int afterSaleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sale = ref.watch(afterSaleDetailProvider(afterSaleId));
    return Scaffold(
      appBar: AppBar(title: const Text('售后详情')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: sale.when(
              data: (data) => ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                children: [
                  AppCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                '售后进度',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ),
                            StatusTag(text: data.statusLabel),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _Timeline(processedAt: data.processedAt),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '售后信息',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _Row(label: '售后单号', value: '#${data.id}'),
                        _Row(label: '订单编号', value: data.orderNo),
                        _Row(label: '售后类型', value: data.typeLabel),
                        _Row(label: '申请原因', value: data.reason),
                        if (data.description.isNotEmpty)
                          _Row(label: '问题描述', value: data.description),
                        const Divider(height: 20),
                        Row(
                          children: [
                            const Text(
                              '退款金额',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary),
                            ),
                            const Spacer(),
                            PriceText(cents: data.amountCents, size: 18),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: () => context.push('/after-sale/list'),
                    child: const Text('返回售后列表'),
                  ),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '售后详情加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () =>
                    ref.invalidate(afterSaleDetailProvider(afterSaleId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 售后进度时间轴。
class _Timeline extends StatelessWidget {
  const _Timeline({required this.processedAt});

  final String processedAt;

  @override
  Widget build(BuildContext context) {
    final steps = <({String title, String time, bool done})>[
      (
        title: '提交申请',
        time: processedAt.isEmpty ? '已提交' : DateFormatter.dateTime(processedAt),
        done: true
      ),
      (title: '商家审核', time: '1 个工作日内', done: false),
      (title: '退款到账', time: '审核通过后 1-3 个工作日', done: false),
    ];
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: steps[i].done ? AppTheme.brand : AppTheme.bgMuted,
                      shape: BoxShape.circle,
                    ),
                  ),
                  if (i != steps.length - 1)
                    Container(width: 1.5, height: 26, color: AppTheme.borderSubtle),
                ],
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        steps[i].title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              steps[i].done ? FontWeight.w600 : FontWeight.w400,
                          color: steps[i].done
                              ? AppTheme.textPrimary
                              : AppTheme.textTertiary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        steps[i].time,
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.textTertiary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// 信息行。
class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 76,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppTheme.textTertiary),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '--' : value,
              style: const TextStyle(
                  fontSize: 13, color: AppTheme.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}
