import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/checkout_args.dart';
import '../../models/cart.dart';
import '../../models/common.dart';
import '../../models/marketing.dart';
import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/user_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 结算页。
class CheckoutPage extends ConsumerStatefulWidget {
  const CheckoutPage({super.key, this.args});

  final CheckoutArgs? args;

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

/// 结算行。
class _Line {
  const _Line({
    required this.title,
    required this.spec,
    required this.image,
    required this.priceCents,
    required this.quantity,
  });

  final String title;
  final String spec;
  final String image;
  final int priceCents;
  final int quantity;

  int get subtotal => priceCents * quantity;
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  final TextEditingController _remarkController = TextEditingController();
  Address? _address;
  UserCoupon? _coupon;
  PaymentMethod _method = PaymentMethod.wechat;
  bool _submitting = false;

  @override
  void dispose() {
    _remarkController.dispose();
    super.dispose();
  }

  CheckoutArgs get _args => widget.args ?? const CheckoutArgs();

  @override
  Widget build(BuildContext context) {
    final addresses = ref.watch(addressesProvider);
    final coupons = ref.watch(availableCouponsProvider);
    final cart = ref.watch(cartProvider);

    final lines = _buildLines(cart);
    final total = lines.fold<int>(0, (sum, line) => sum + line.subtotal);
    final discount = _discountFor(_coupon, total);

    if (_args.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('确认订单')),
        body: const EmptyState(
          title: '没有需要结算的商品',
          icon: Icons.shopping_bag_outlined,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('确认订单')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
              children: [
                _AddressCard(
                  address: _address,
                  onTap: () =>
                      _selectAddress(addresses.asData?.value ?? const <Address>[]),
                  onManage: () => context.push('/addresses'),
                ),
                const SizedBox(height: 10),
                _CouponCard(
                  coupon: _coupon,
                  onTap: () => _selectCoupon(
                    coupons.asData?.value ?? const <UserCoupon>[],
                    total,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    boxShadow: AppTheme.shadowSm,
                  ),
                  child: Column(
                    children: [
                      for (var i = 0; i < lines.length; i++) ...[
                        _LineTile(line: lines[i]),
                        if (i != lines.length - 1)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 10),
                            child: Divider(height: 1),
                          ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    boxShadow: AppTheme.shadowSm,
                  ),
                  child: Column(
                    children: [
                      _AmountRow(label: '商品总额', value: Money.formatYuan(total)),
                      const SizedBox(height: 8),
                      _AmountRow(
                        label: '优惠券抵扣',
                        value: '-${Money.formatYuan(discount)}',
                        valueColor: discount > 0 ? AppTheme.danger : null,
                      ),
                      const SizedBox(height: 8),
                      const _AmountRow(label: '运费', value: '¥0.00'),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 10),
                        child: Divider(height: 1),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '实付金额',
                            style: TextStyle(
                                fontSize: 14, color: AppTheme.textSecondary),
                          ),
                          PriceText(cents: total - discount, size: 20),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    boxShadow: AppTheme.shadowSm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '支付方式',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          for (final method in PaymentMethod.values)
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: _MethodChip(
                                  method: method,
                                  active: _method == method,
                                  onTap: () =>
                                      setState(() => _method = method),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        '订单备注',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _remarkController,
                        maxLength: 50,
                        decoration: const InputDecoration(
                          hintText: '选填，如口味 / 配送要求',
                          counterText: '',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '合计 ${lines.fold<int>(0, (sum, line) => sum + line.quantity)} 件',
                      style:
                          TextStyle(fontSize: 12, color: AppTheme.textTertiary),
                    ),
                    PriceText(cents: total - discount, size: 20),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 140,
                child: FilledButton(
                  onPressed: _submitting ? null : () => _submit(total, discount),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                    backgroundColor: AppTheme.accent500,
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text('提交订单'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<_Line> _buildLines(Cart cart) {
    if (_args.isFromCart) {
      return cart.items
          .where((item) => _args.cartItemIds.contains(item.id))
          .map((item) => _Line(
                title: item.productTitle,
                spec: item.specText,
                image: item.image,
                priceCents: item.priceCents,
                quantity: item.quantity,
              ))
          .toList();
    }
    return const <_Line>[];
  }

  int _discountFor(UserCoupon? coupon, int total) {
    if (coupon == null) return 0;
    if (coupon.minAmountCents > total) return 0;
    switch (coupon.type) {
      case CouponType.fixed:
        return coupon.faceValueCents > total ? total : coupon.faceValueCents;
      case CouponType.percent:
        var value = (total * (100 - coupon.percent) / 100).round();
        if (coupon.maxDiscountCents > 0 && value > coupon.maxDiscountCents) {
          value = coupon.maxDiscountCents;
        }
        return value > total ? total : value;
      case CouponType.shipping:
      case CouponType.unspecified:
        return 0;
    }
  }

  Future<void> _selectAddress(List<Address> addresses) async {
    if (addresses.isEmpty) {
      context.push('/addresses');
      return;
    }
    final selected = await showModalBottomSheet<Address>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('选择收货地址',
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            for (final address in addresses)
              ListTile(
                title: Text('${address.receiver}  ${address.phone}'),
                subtitle: Text(address.fullAddress),
                trailing: address.isDefault
                    ? const Icon(Icons.home_rounded, size: 16)
                    : null,
                onTap: () => Navigator.of(context).pop(address),
              ),
            ListTile(
              leading: const Icon(Icons.add_rounded),
              title: const Text('管理收货地址'),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/addresses');
              },
            ),
          ],
        ),
      ),
    );
    if (selected == null) return;
    setState(() => _address = selected);
  }

  Future<void> _selectCoupon(List<UserCoupon> coupons, int total) async {
    final usable = coupons
        .where((c) => c.status == UserCouponStatus.unused)
        .toList();
    final selected = await showModalBottomSheet<UserCoupon?>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('选择优惠券',
                  style: Theme.of(context).textTheme.titleMedium),
            ),
            ListTile(
              title: const Text('不使用优惠券'),
              onTap: () => Navigator.of(context).pop(),
            ),
            for (final coupon in usable)
              ListTile(
                title: Text(coupon.name),
                subtitle: Text(
                  '满 ${Money.formatYuan(coupon.minAmountCents)} 可用 · ${coupon.discountText}',
                ),
                trailing: coupon.minAmountCents > total
                    ? const Text('未达门槛',
                        style: TextStyle(
                            fontSize: 12, color: AppTheme.textTertiary))
                    : null,
                onTap: coupon.minAmountCents > total
                    ? null
                    : () => Navigator.of(context).pop(coupon),
              ),
          ],
        ),
      ),
    );
    if (!mounted) return;
    setState(() => _coupon = selected);
  }

  Future<void> _submit(int total, int discount) async {
    if (_address == null) {
      final addresses = await ref.read(addressesProvider.future);
      if (!mounted) return;
      if (addresses.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('请先添加收货地址')),
        );
        context.push('/address/edit');
        return;
      }
      setState(() => _address = addresses.first);
    }
    setState(() => _submitting = true);
    final result = await ref.read(orderActionsProvider).createOrder(
          items: _args.items.map((item) => item.toJson()).toList(),
          fromCart: _args.isFromCart,
          cartItemIds: _args.cartItemIds,
          addressId: _address?.id ?? 0,
          couponId: _coupon?.id ?? 0,
          remark: _remarkController.text.trim(),
          paymentMethod: _method.wire,
        );
    if (!mounted) return;
    setState(() => _submitting = false);
    final error = result.value;
    if (error != null || result.key == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error ?? '下单失败，请重试')),
      );
      return;
    }
    context.pushReplacement('/payment/${result.key}');
  }
}

/// 支付方式。
enum PaymentMethod {
  wechat('wechat', '微信支付', Icons.chat_bubble_rounded),
  alipay('alipay', '支付宝', Icons.account_balance_wallet_rounded),
  balance('balance', '余额支付', Icons.payments_rounded);

  const PaymentMethod(this.wire, this.label, this.icon);

  final String wire;
  final String label;
  final IconData icon;
}

/// 地址卡片。
class _AddressCard extends StatelessWidget {
  const _AddressCard({
    required this.address,
    required this.onTap,
    required this.onManage,
  });

  final Address? address;
  final VoidCallback onTap;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on_rounded, size: 20, color: AppTheme.brand),
          const SizedBox(width: 10),
          Expanded(
            child: GestureDetector(
              onTap: onTap,
              behavior: HitTestBehavior.opaque,
              child: address == null
                  ? Text(
                      '请选择收货地址',
                      style: TextStyle(
                          fontSize: 14, color: AppTheme.textTertiary),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              address!.receiver,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              address!.phone,
                              style: TextStyle(
                                  fontSize: 13, color: AppTheme.textSecondary),
                            ),
                            if (address!.isDefault) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppTheme.brand50,
                                  borderRadius: BorderRadius.circular(
                                      AppTheme.radiusXs),
                                ),
                                child: Text(
                                  '默认',
                                  style: TextStyle(
                                      fontSize: 10, color: AppTheme.brand600),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          address!.fullAddress,
                          style: TextStyle(
                              fontSize: 12, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
            ),
          ),
          TextButton(
            onPressed: onManage,
            child: const Text('管理'),
          ),
        ],
      ),
    );
  }
}

/// 优惠券卡片。
class _CouponCard extends StatelessWidget {
  const _CouponCard({required this.coupon, required this.onTap});

  final UserCoupon? coupon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Row(
        children: [
          const Icon(Icons.local_offer_outlined,
              size: 20, color: AppTheme.accent600),
          const SizedBox(width: 10),
          Expanded(
            child: GestureDetector(
              onTap: onTap,
              behavior: HitTestBehavior.opaque,
              child: Text(
                coupon == null ? '选择优惠券' : coupon!.name,
                style: TextStyle(
                  fontSize: 14,
                  color: coupon == null
                      ? AppTheme.textTertiary
                      : AppTheme.textPrimary,
                ),
              ),
            ),
          ),
          if (coupon != null)
            Text(
              coupon!.discountText,
              style: const TextStyle(fontSize: 12, color: AppTheme.accent600),
            ),
          const Icon(Icons.chevron_right_rounded,
              size: 18, color: AppTheme.textTertiary),
        ],
      ),
    );
  }
}

/// 结算行。
class _LineTile extends StatelessWidget {
  const _LineTile({required this.line});

  final _Line line;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AppImage(url: line.image, width: 62, height: 62,
            radius: AppTheme.radiusMd),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                line.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              if (line.spec.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  line.spec,
                  style: const TextStyle(
                      fontSize: 12, color: AppTheme.textTertiary),
                ),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  PriceText(cents: line.priceCents, size: 14),
                  const Spacer(),
                  Text(
                    'x${line.quantity}',
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.textTertiary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// 金额行。
class _AmountRow extends StatelessWidget {
  const _AmountRow({required this.label, required this.value, this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            color: valueColor ?? AppTheme.textPrimary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// 支付方式选择。
class _MethodChip extends StatelessWidget {
  const _MethodChip({
    required this.method,
    required this.active,
    required this.onTap,
  });

  final PaymentMethod method;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? AppTheme.brand50 : AppTheme.bgMuted,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(
            color: active ? AppTheme.brand : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Column(
          children: [
            Icon(method.icon,
                size: 20, color: active ? AppTheme.brand : AppTheme.textSecondary),
            const SizedBox(height: 4),
            Text(
              method.label,
              style: TextStyle(
                fontSize: 12,
                color: active ? AppTheme.brand : AppTheme.textSecondary,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
