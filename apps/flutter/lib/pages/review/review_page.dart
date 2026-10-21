import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../models/order.dart';
import '../../providers/order_provider.dart';
import '../../providers/review_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 发表评价页。
class ReviewPage extends ConsumerStatefulWidget {
  const ReviewPage({super.key, this.initialProductId});

  /// 从订单详情跳转过来时预选商品。
  final int? initialProductId;

  @override
  ConsumerState<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends ConsumerState<ReviewPage> {
  final TextEditingController _contentController = TextEditingController();
  final List<String> _images = <String>[];
  int? _orderId;
  int? _productId;
  int _rating = 5;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _productId = widget.initialProductId;
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(reviewableOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('发表评价')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: orders.when(
              data: (list) {
                if (list.isEmpty) {
                  return const EmptyState(
                    title: '暂无可评价的订单',
                    subtitle: '订单完成后即可发表评价',
                    icon: Icons.rate_review_outlined,
                  );
                }
                return _buildBody(context, ref, list);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => EmptyState(
                title: '订单加载失败',
                subtitle: '请检查网络后重试',
                icon: Icons.wifi_off_rounded,
                actionText: '重新加载',
                onAction: () => ref.invalidate(reviewableOrdersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, List<Order> orders) {
    final orderId = _orderId ?? orders.first.id;
    final detail = ref.watch(orderDetailProvider(orderId));
    final items = detail.asData?.value.items ?? const <OrderItem>[];
    final selectedItem = items
        .where((item) => item.productId == _productId)
        .cast<OrderItem?>()
        .firstWhere((_) => true, orElse: () => null);

    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '选择订单',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: orders.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    final active = order.id == orderId;
                    return ChoiceChip(
                      label: Text(
                        order.orderNo.length > 12
                            ? order.orderNo.substring(order.orderNo.length - 12)
                            : order.orderNo,
                        style: const TextStyle(fontSize: 12),
                      ),
                      selected: active,
                      onSelected: (_) => setState(() {
                        _orderId = order.id;
                        _productId = null;
                      }),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '选择商品',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              if (items.isEmpty)
                const Text(
                  '未获取到商品信息',
                  style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
                )
              else
                for (final item in items)
                  _ProductSelectTile(
                    item: item,
                    active: item.productId == _productId,
                    onTap: () =>
                        setState(() => _productId = item.productId),
                  ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '评分',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var i = 1; i <= 5; i++)
                    GestureDetector(
                      onTap: () => setState(() => _rating = i),
                      child: Icon(
                        i <= _rating
                            ? Icons.star_rounded
                            : Icons.star_outline_rounded,
                        size: 30,
                        color: AppTheme.accent500,
                      ),
                    ),
                  const SizedBox(width: 10),
                  Text(
                    _ratingLabel(_rating),
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                '评价内容',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _contentController,
                maxLines: 4,
                maxLength: 200,
                decoration: const InputDecoration(
                  hintText: '说说商品的使用感受，至少 5 个字',
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                '晒图',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              _ImagePicker(
                images: _images,
                onAdd: _addImage,
                onRemove: (index) => setState(() => _images.removeAt(index)),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _submitting ? null : () => _submit(selectedItem),
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('发表评价'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _ratingLabel(int rating) {
    switch (rating) {
      case 1:
        return '很差';
      case 2:
        return '较差';
      case 3:
        return '一般';
      case 4:
        return '满意';
      default:
        return '非常满意';
    }
  }

  void _addImage() {
    if (_images.length >= 6) return;
    // 暂无对象存储，使用占位图 URL 作为晒图。
    final index = _images.length + 1;
    setState(() {
      _images.add(
        'https://placehold.co/400x400/2A4AD9/FFFFFF?text=Review+Photo+$index',
      );
    });
  }

  Future<void> _submit(OrderItem? item) async {
    if (item == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请选择要评价的商品')));
      return;
    }
    final content = _contentController.text.trim();
    if (content.length < 5) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('评价内容至少 5 个字')));
      return;
    }
    setState(() => _submitting = true);
    final error = await ref.read(reviewActionsProvider).submit(
          productId: item.productId,
          skuId: item.skuId,
          rating: _rating,
          content: content,
          images: List<String>.from(_images),
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    _contentController.clear();
    setState(() {
      _images.clear();
      _rating = 5;
    });
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('评价发表成功')));
  }
}

/// 可评价商品条目。
class _ProductSelectTile extends StatelessWidget {
  const _ProductSelectTile({
    required this.item,
    required this.active,
    required this.onTap,
  });

  final OrderItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            AppImage(
              url: item.image,
              width: 52,
              height: 52,
              radius: AppTheme.radiusMd,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.productTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  if (item.specText.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.specText,
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textTertiary),
                    ),
                  ],
                  const SizedBox(height: 2),
                  Text(
                    '¥${Money.formatYuan(item.priceCents)} x${item.quantity}',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
            Icon(
              active
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: active ? AppTheme.brand : AppTheme.borderDefault,
            ),
          ],
        ),
      ),
    );
  }
}

/// 晒图选择器。
class _ImagePicker extends StatelessWidget {
  const _ImagePicker({
    required this.images,
    required this.onAdd,
    required this.onRemove,
  });

  final List<String> images;
  final VoidCallback onAdd;
  final ValueChanged<int> onRemove;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (var i = 0; i < images.length; i++)
          Stack(
            clipBehavior: Clip.none,
            children: [
              AppImage(
                url: images[i],
                width: 72,
                height: 72,
                radius: AppTheme.radiusMd,
              ),
              Positioned(
                right: -6,
                top: -6,
                child: GestureDetector(
                  onTap: () => onRemove(i),
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: const BoxDecoration(
                      color: AppTheme.danger,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded,
                        size: 12, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        if (images.length < 6)
          GestureDetector(
            onTap: onAdd,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppTheme.bgMuted,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_a_photo_outlined,
                      size: 20, color: AppTheme.textTertiary),
                  SizedBox(height: 4),
                  Text(
                    '添加图片',
                    style: TextStyle(fontSize: 11, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
