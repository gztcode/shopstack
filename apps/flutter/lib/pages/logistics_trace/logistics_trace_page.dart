import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/order_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 物流轨迹页：展示各订单包裹的物流进度，数据来自
/// `GET /api/v1/logistics/tracks`。
class LogisticsTracePage extends ConsumerWidget {
  const LogisticsTracePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(orderListProvider(null));
    return Scaffold(
      appBar: AppBar(title: const Text('物流轨迹')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: orders.when(
              data: (result) {
                final shipping = result.orders
                    .where((o) =>
                        o.status == OrderStatus.shipped ||
                        o.status == OrderStatus.completed)
                    .toList();
                if (shipping.isEmpty) {
                  return EmptyState(
                    title: '暂无物流轨迹',
                    subtitle: '包裹发出后，物流轨迹会显示在这里',
                    icon: Icons.local_shipping_outlined,
                    actionText: '按运单号查询',
                    onAction: () => context.push('/logistics/track'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                  itemCount: shipping.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _TraceCard(orderId: shipping[index].id),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '物流轨迹加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(orderListProvider(null)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 单个订单的物流轨迹卡片。
class _TraceCard extends ConsumerWidget {
  const _TraceCard({required this.orderId});

  final int orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final logistics = ref.watch(logisticsProvider(orderId));
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/order/$orderId'),
      child: logistics.when(
        data: (data) {
          final shipment = data.shipment;
          final tracks = data.tracks;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      shipment?.company.isNotEmpty == true
                          ? shipment!.company
                          : '包裹运输中',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  if (shipment != null)
                    StatusTag(text: shipment.status.label),
                ],
              ),
              if (shipment != null && shipment.trackingNo.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  '运单号 ${shipment.trackingNo}',
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textTertiary),
                ),
              ],
              const SizedBox(height: 12),
              if (tracks.isEmpty)
                const Text(
                  '暂无轨迹信息，商家发货后会自动更新',
                  style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                )
              else
                for (var i = 0; i < tracks.length.clamp(0, 3); i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(top: 4),
                          decoration: BoxDecoration(
                            color: i == 0 ? AppTheme.brand : AppTheme.bgMuted,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tracks[i].description,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: i == 0
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                  color: i == 0
                                      ? AppTheme.textPrimary
                                      : AppTheme.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${tracks[i].location} · '
                                '${DateFormatter.dateTime(tracks[i].occurredAt)}',
                                style: const TextStyle(
                                    fontSize: 11, color: AppTheme.textTertiary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
            ],
          );
        },
        loading: () => const Padding(
          padding: EdgeInsets.symmetric(vertical: 12),
          child: Center(child: CircularProgressIndicator()),
        ),
        error: (error, stack) => const Text(
          '轨迹加载失败',
          style: TextStyle(fontSize: 12, color: AppTheme.textTertiary),
        ),
      ),
    );
  }
}
