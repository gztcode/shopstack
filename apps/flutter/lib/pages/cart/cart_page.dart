import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/cart.dart';
import '../../models/checkout_args.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';
import '../../widgets/quantity_stepper.dart';

/// 购物车页。
class CartPage extends ConsumerStatefulWidget {
  const CartPage({super.key});

  @override
  ConsumerState<CartPage> createState() => _CartPageState();
}

class _CartPageState extends ConsumerState<CartPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(cartProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final notifier = ref.read(cartProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: Text('购物车${cart.totalCount > 0 ? '（${cart.totalCount}）' : ''}'),
        actions: [
          if (cart.items.isNotEmpty)
            TextButton(
              onPressed: () => _confirmClear(notifier),
              child: const Text('清空'),
            ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: cart.items.isEmpty
                ? EmptyState(
                    title: '购物车还是空的',
                    subtitle: '挑几件心仪好物吧',
                    icon: Icons.shopping_cart_outlined,
                    actionText: '去逛逛',
                    onAction: () => context.go('/home'),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                    itemCount: cart.items.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = cart.items[index];
                      return _CartItemTile(
                        item: item,
                        onToggle: (selected) => notifier.updateItem(
                          id: item.id,
                          selected: selected,
                        ),
                        onQuantityChanged: (quantity) => notifier.updateItem(
                          id: item.id,
                          quantity: quantity,
                        ),
                        onRemove: () => notifier.removeItem(item.id),
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: cart.items.isEmpty
          ? null
          : _CartBottomBar(
              cart: cart,
              onSelectAll: (selected) => notifier.selectAll(selected),
              onCheckout: () => _checkout(cart),
            ),
    );
  }

  Future<void> _confirmClear(CartNotifier notifier) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('清空购物车'),
        content: const Text('确定要移除购物车中的全部商品吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('清空'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await notifier.clear();
    }
  }

  void _checkout(Cart cart) {
    final selected = cart.items
        .where((item) => item.selected && item.available)
        .toList();
    if (selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请先选择要结算的商品')),
      );
      return;
    }
    final insufficient = selected.where((item) => item.stockShort).toList();
    if (insufficient.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('「${insufficient.first.productTitle}」库存不足，请调整数量'),
        ),
      );
      return;
    }
    context.push(
      '/checkout',
      extra: CheckoutArgs(
        cartItemIds: selected.map((item) => item.id).toList(),
      ),
    );
  }
}

/// 购物车条目。
class _CartItemTile extends StatelessWidget {
  const _CartItemTile({
    required this.item,
    required this.onToggle,
    required this.onQuantityChanged,
    required this.onRemove,
  });

  final CartItem item;
  final ValueChanged<bool> onToggle;
  final ValueChanged<int> onQuantityChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final disabled = !item.available;
    return Opacity(
      opacity: disabled ? 0.55 : 1,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          boxShadow: AppTheme.shadowSm,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: Checkbox(
                value: item.selected,
                onChanged: disabled
                    ? null
                    : (value) => onToggle(value ?? false),
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusXs),
                ),
              ),
            ),
            const SizedBox(width: 6),
            AppImage(
              url: item.image,
              width: 78,
              height: 78,
              radius: AppTheme.radiusMd,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.productTitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: disabled
                          ? AppTheme.textTertiary
                          : AppTheme.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  if (item.specText.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.specText,
                      style: TextStyle(
                          fontSize: 12, color: AppTheme.textTertiary),
                    ),
                  ],
                  if (disabled) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.danger50,
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusXs),
                      ),
                      child: Text(
                        '已失效',
                        style: TextStyle(
                            fontSize: 11, color: AppTheme.danger600),
                      ),
                    ),
                  ] else if (item.stockShort) ...[
                    const SizedBox(height: 6),
                    Text(
                      '库存不足，仅剩 ${item.stock} 件',
                      style: TextStyle(
                          fontSize: 11, color: AppTheme.danger600),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      PriceText(cents: item.priceCents, size: 15),
                      const Spacer(),
                      QuantityStepper(
                        value: item.quantity,
                        max: item.stock > 0 ? item.stock : 1,
                        onChanged: onQuantityChanged,
                        compact: true,
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: onRemove,
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusSm),
                        child: const Padding(
                          padding: EdgeInsets.all(4),
                          child: Icon(Icons.delete_outline_rounded,
                              size: 18, color: AppTheme.textTertiary),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 底部结算栏。
class _CartBottomBar extends StatelessWidget {
  const _CartBottomBar({
    required this.cart,
    required this.onSelectAll,
    required this.onCheckout,
  });

  final Cart cart;
  final ValueChanged<bool> onSelectAll;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(
          top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: Checkbox(
                value: cart.allSelected,
                onChanged: (value) => onSelectAll(value ?? false),
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusXs),
                ),
              ),
            ),
            const SizedBox(width: 4),
            Text(
              '全选',
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '已选 ${cart.selectedCount} 件',
                    style: TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                  PriceText(cents: cart.selectedAmountCents, size: 18),
                ],
              ),
            ),
            const SizedBox(width: 12),
            SizedBox(
              width: 116,
              child: FilledButton(
                onPressed: onCheckout,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(42),
                  backgroundColor: AppTheme.accent500,
                ),
                child: const Text('结算'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
