import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/logistics.dart';
import '../../models/order.dart';
import '../../providers/logistics_provider.dart';
import '../../providers/order_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 物流跟踪页。
class LogisticsPage extends ConsumerStatefulWidget {
  const LogisticsPage({super.key, this.initialOrderId});

  final int? initialOrderId;

  @override
  ConsumerState<LogisticsPage> createState() => _LogisticsPageState();
}

class _LogisticsPageState extends ConsumerState<LogisticsPage> {
  int? _orderId;

  @override
  void initState() {
    super.initState();
    _orderId = widget.initialOrderId;
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(orderListProvider(null));
    final orderList = orders.asData?.value.orders ?? const <Order>[];

    if (_orderId == null && orderList.isNotEmpty) {
      _orderId = orderList.first.id;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('物流跟踪')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: orders.when(
              data: (_) => _buildBody(context, ref, orderList),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单列表加载失败',
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

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    List<Order> orderList,
  ) {
    if (orderList.isEmpty) {
      return const EmptyState(
        title: '暂无订单',
        subtitle: '下单后可在这里查看物流轨迹',
        icon: Icons.local_shipping_outlined,
      );
    }
    final orderId = _orderId ?? orderList.first.id;
    final async = ref.watch(orderLogisticsProvider(orderId));
    final state = async.asData?.value;

    return RefreshIndicator(
      color: AppTheme.brand,
      onRefresh: () async => ref.invalidate(orderLogisticsProvider(orderId)),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
        children: [
          _OrderSelector(
            orders: orderList,
            selectedId: orderId,
            onChanged: (id) => setState(() => _orderId = id),
          ),
          const SizedBox(height: 12),
          if (state != null && state.error != null) ...[
            _ErrorBanner(
              message: state.error!,
              onRetry: () => ref.invalidate(orderLogisticsProvider(orderId)),
            ),
            const SizedBox(height: 12),
          ],
          async.when(
            data: (data) {
              if (!data.hasData) {
                return Padding(
                  padding: const EdgeInsets.only(top: 40),
                  child: EmptyState(
                    title: '暂无物流信息',
                    subtitle: '商家发货后即可查看完整轨迹',
                    icon: Icons.local_shipping_outlined,
                    actionText: '重新查询',
                    onAction: () =>
                        ref.invalidate(orderLogisticsProvider(orderId)),
                  ),
                );
              }
              return _LogisticsContent(
                shipment: data.result!.shipment,
                tracks: data.result!.tracks,
              );
            },
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 60),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, stack) => Padding(
              padding: const EdgeInsets.only(top: 40),
              child: EmptyState(
                title: '物流查询失败',
                subtitle: '请稍后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新查询',
                onAction: () =>
                    ref.invalidate(orderLogisticsProvider(orderId)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 订单选择器。
class _OrderSelector extends StatelessWidget {
  const _OrderSelector({
    required this.orders,
    required this.selectedId,
    required this.onChanged,
  });

  final List<Order> orders;
  final int selectedId;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.fromLTRB(14, 6, 14, 6),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: selectedId,
          isExpanded: true,
          items: orders
              .map((order) => DropdownMenuItem<int>(
                    value: order.id,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            order.orderNo,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                        Text(
                          order.status.label,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textTertiary),
                        ),
                      ],
                    ),
                  ))
              .toList(),
          onChanged: (value) {
            if (value != null) onChanged(value);
          },
        ),
      ),
    );
  }
}

/// 物流内容。
class _LogisticsContent extends StatelessWidget {
  const _LogisticsContent({required this.shipment, required this.tracks});

  final Shipment? shipment;
  final List<ShipmentTrack> tracks;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (shipment != null) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.local_shipping_outlined,
                        size: 20, color: AppTheme.brand),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        shipment!.company.isEmpty ? '待分配承运商' : shipment!.company,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ),
                    StatusTag(
                      text: shipment!.status.label,
                      color: AppTheme.info600,
                    ),
                  ],
                ),
                if (shipment!.trackingNo.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    '运单号 ${shipment!.trackingNo}',
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
                if (shipment!.address.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    '收货地址 ${shipment!.address}',
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
                if (shipment!.shippedAt.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    '发货时间 ${DateFormatter.dateTime(shipment!.shippedAt)}',
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        AppCard(
          child: tracks.isEmpty
              ? const Text(
                  '暂无轨迹信息',
                  style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
                )
              : Column(
                  children: [
                    for (var i = 0; i < tracks.length; i++)
                      _TrackTile(track: tracks[i], isLast: i == tracks.length - 1),
                  ],
                ),
        ),
      ],
    );
  }
}

/// 轨迹条目。
class _TrackTile extends StatelessWidget {
  const _TrackTile({required this.track, required this.isLast});

  final ShipmentTrack track;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 5),
                decoration: BoxDecoration(
                  color: isLast ? AppTheme.brand : AppTheme.borderDefault,
                  shape: BoxShape.circle,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(width: 1, color: AppTheme.borderSubtle),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    track.description,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isLast ? FontWeight.w600 : FontWeight.w400,
                      color: isLast
                          ? AppTheme.textPrimary
                          : AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${track.location.isEmpty ? '' : '${track.location} · '}'
                    '${DateFormatter.dateTime(track.occurredAt)}',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 错误提示条。
class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: AppTheme.warning50,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded,
              size: 18, color: AppTheme.warning700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                  fontSize: 12, color: AppTheme.warning700, height: 1.4),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }
}
