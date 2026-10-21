import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/expansion_providers.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 物流查询页：按运单号查询包裹轨迹，数据来自
/// `GET /api/v1/logistics/tracking/{no}`。
class LogisticsTrackPage extends ConsumerStatefulWidget {
  const LogisticsTrackPage({super.key, this.trackingNo});

  /// 预填的运单号。
  final String? trackingNo;

  @override
  ConsumerState<LogisticsTrackPage> createState() => _LogisticsTrackPageState();
}

class _LogisticsTrackPageState extends ConsumerState<LogisticsTrackPage> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.trackingNo ?? '');
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final result = _query.isEmpty
        ? null
        : ref.watch(trackingProvider(_query));
    return Scaffold(
      appBar: AppBar(title: const Text('物流查询')),
      body: Column(
        children: [
          const DemoBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    textInputAction: TextInputAction.search,
                    decoration: const InputDecoration(
                      hintText: '输入运单号，如 SF1234567890',
                      prefixIcon: Icon(Icons.qr_code_scanner_rounded),
                    ),
                    onSubmitted: (value) => setState(() => _query = value.trim()),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: () =>
                      setState(() => _query = _controller.text.trim()),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(76, 46),
                  ),
                  child: const Text('查询'),
                ),
              ],
            ),
          ),
          Expanded(
            child: result == null
                ? const EmptyState(
                    title: '输入运单号开始查询',
                    subtitle: '也可以在「物流轨迹」中直接查看订单包裹进度',
                    icon: Icons.local_shipping_outlined,
                  )
                : result.when(
                    data: (data) {
                      if (data.tracks.isEmpty && data.shipment == null) {
                        return const EmptyState(
                          title: '未查询到该运单号',
                          subtitle: '请核对运单号是否正确，或稍后再试',
                          icon: Icons.search_off_rounded,
                        );
                      }
                      final shipment = data.shipment;
                      return ListView(
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                        children: [
                          if (shipment != null)
                            AppCard(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          shipment.company.isEmpty
                                              ? '包裹运输中'
                                              : shipment.company,
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.textPrimary,
                                          ),
                                        ),
                                      ),
                                      StatusTag(text: shipment.status.label),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '运单号 ${shipment.trackingNo}',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${shipment.receiver} ${shipment.phone} · ${shipment.address}',
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary),
                                  ),
                                ],
                              ),
                            ),
                          if (shipment != null) const SizedBox(height: 12),
                          AppCard(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  '物流轨迹',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                if (data.tracks.isEmpty)
                                  const Text(
                                    '暂无轨迹，商家发货后会自动更新',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.textTertiary),
                                  )
                                else
                                  for (var i = 0; i < data.tracks.length; i++)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 14),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Column(
                                            children: [
                                              Container(
                                                width: 10,
                                                height: 10,
                                                decoration: BoxDecoration(
                                                  color: i == 0
                                                      ? AppTheme.brand
                                                      : AppTheme.bgMuted,
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                              if (i != data.tracks.length - 1)
                                                Container(
                                                  width: 1.5,
                                                  height: 32,
                                                  color: AppTheme.borderSubtle,
                                                ),
                                            ],
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  data.tracks[i].description,
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
                                                  '${data.tracks[i].location} · '
                                                  '${DateFormatter.dateTime(data.tracks[i].occurredAt)}',
                                                  style: const TextStyle(
                                                      fontSize: 11,
                                                      color: AppTheme.textTertiary),
                                                ),
                                              ],
                                            ),
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
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (error, stack) => EmptyState(
                      title: '查询失败',
                      subtitle: '请检查运单号或网络后重试',
                      icon: Icons.wifi_off_rounded,
                      actionText: '重新查询',
                      onAction: () => setState(() => _query = _controller.text.trim()),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
