import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/common.dart';
import '../../models/marketing.dart';
import '../../providers/cart_provider.dart';
import '../../providers/expansion_providers.dart';
import '../../providers/order_provider.dart';
import '../../providers/user_provider.dart';
import '../../utils/enums.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_image.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/price_text.dart';

/// 订单确认页：下单前核对地址、商品、优惠券与金额。
///
/// 数据来源：`GET /api/v1/users/addresses`、`GET /api/v1/users/coupons`，
/// 金额预览走 `POST /api/v1/orders/confirm`。
class OrderConfirmPage extends ConsumerStatefulWidget {
  const OrderConfirmPage({super.key, this.addressId = 0, this.couponId = 0});

  /// 预选的收货地址 id。
  final int addressId;

  /// 预选的优惠券 id。
  final int couponId;

  @override
  ConsumerState<OrderConfirmPage> createState() => _OrderConfirmPageState();
}

class _OrderConfirmPageState extends ConsumerState<OrderConfirmPage> {
  int _addressId = 0;
  int _couponId = 0;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _addressId = widget.addressId;
    _couponId = widget.couponId;
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final addresses = ref.watch(addressesProvider);
    final coupons = ref.watch(userCouponsProvider);
    final preview = ref.watch(
      orderConfirmProvider((addressId: _addressId, couponId: _couponId)),
    );

    final items = cart.selectedItems;

    return Scaffold(
      appBar: AppBar(title: const Text('确认订单')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: items.isEmpty
                ? const EmptyState(
                    title: '没有待结算的商品',
                    subtitle: '去购物车勾选商品后再来下单吧',
                    icon: Icons.shopping_cart_outlined,
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
                    children: [
                      _AddressSection(
                        addressId: _addressId,
                        addresses: addresses.asData?.value ??
                            const <Address>[],
                        onSelect: (id) => setState(() => _addressId = id),
                      ),
                      const SizedBox(height: 12),
                      AppCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '商品清单',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            for (final item in items)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
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
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
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
                                          const SizedBox(height: 4),
                                          Text(
                                            item.specText.isEmpty
                                                ? '默认规格'
                                                : item.specText,
                                            style: const TextStyle(
                                                fontSize: 11,
                                                color: AppTheme.textTertiary),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      'x${item.quantity}',
                                      style: const TextStyle(
                                          fontSize: 12,
                                          color: AppTheme.textTertiary),
                                    ),
                                    const SizedBox(width: 8),
                                    PriceText(
                                        cents: item.subtotalCents, size: 14),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      _CouponSection(
                        couponId: _couponId,
                        coupons: coupons.asData?.value ?? const <UserCoupon>[],
                        onSelect: (id) => setState(() => _couponId = id),
                      ),
                      const SizedBox(height: 12),
                      AppCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          children: [
                            preview.when(
                              data: (data) => _AmountRows(data: data),
                              loading: () => const Center(
                                child: CircularProgressIndicator(),
                              ),
                              error: (error, stack) => _AmountRows(
                                data: CheckoutPreview(
                                  totalAmountCents: cart.selectedAmountCents,
                                  discountCents: cart.selectedDiscountCents,
                                  payableCents: cart.selectedPayableCents,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
          if (items.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                border: Border(
                  top: BorderSide(color: AppTheme.borderSubtle, width: 0.5),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '合计 ${Money.formatYuanWithSymbol(cart.selectedPayableCents)}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  FilledButton(
                    onPressed: _submitting ? null : () => _submit(context, ref),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(140, 44),
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('提交订单'),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final cart = ref.read(cartProvider);
    final ids = cart.selectedItems.map((item) => item.id).toList();
    if (ids.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请先勾选要结算的商品')),
      );
      return;
    }
    setState(() => _submitting = true);
    final result = await ref.read(orderActionsProvider).createOrder(
          fromCart: true,
          cartItemIds: ids,
          addressId: _addressId,
          couponId: _couponId,
        );
    if (!context.mounted) return;
    setState(() => _submitting = false);
    final error = result.value;
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    if (result.key > 0) {
      context.push('/payment/${result.key}');
    }
  }
}

/// 收货地址区块。
class _AddressSection extends StatelessWidget {
  const _AddressSection({
    required this.addressId,
    required this.addresses,
    required this.onSelect,
  });

  final int addressId;
  final List<Address> addresses;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/addresses'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                '收货地址',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              Text(
                addresses.isEmpty ? '请选择' : '更换',
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.brand),
              ),
              const Icon(Icons.chevron_right_rounded,
                  size: 16, color: AppTheme.textTertiary),
            ],
          ),
          const SizedBox(height: 10),
          if (addresses.isEmpty)
            const Text(
              '还没有收货地址，请先添加',
              style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
            )
          else
            RadioGroup<int>(
              groupValue: addressId == 0 ? addresses.first.id : addressId,
              onChanged: (value) => onSelect(value ?? 0),
              child: Column(
                children: [
                  for (final address in addresses)
                    // ListTile 的水波纹画在最近的 Material 上，
                    // 外层卡片已有背景色，必须自带一层 Material
                    // 否则水波纹不可见（Flutter 会断言告警）。
                    Material(
                      color: Colors.transparent,
                      child: RadioListTile<int>(
                        value: address.id,
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Row(
                          children: [
                            Text(
                              address.receiver,
                              style: const TextStyle(
                                  fontSize: 13, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              address.phone,
                              style: const TextStyle(
                                  fontSize: 12, color: AppTheme.textTertiary),
                            ),
                            if (address.isDefault) ...[
                              const SizedBox(width: 8),
                              const StatusTag(
                                  text: '默认', color: AppTheme.success),
                            ],
                          ],
                        ),
                        subtitle: Text(
                          address.fullAddress,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textTertiary),
                        ),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 优惠券区块。
class _CouponSection extends StatelessWidget {
  const _CouponSection({
    required this.couponId,
    required this.coupons,
    required this.onSelect,
  });

  final int couponId;
  final List<UserCoupon> coupons;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final usable = coupons
        .where((c) => c.status == UserCouponStatus.unused)
        .toList();
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '优惠券',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          if (usable.isEmpty)
            const Text(
              '暂无可用优惠券',
              style: TextStyle(fontSize: 13, color: AppTheme.textTertiary),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final coupon in usable)
                  ChoiceChip(
                    label: Text(coupon.name),
                    selected: coupon.couponId == couponId,
                    onSelected: (_) =>
                        onSelect(coupon.couponId == couponId ? 0 : coupon.couponId),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// 金额明细。
class _AmountRows extends StatelessWidget {
  const _AmountRows({required this.data});

  final CheckoutPreview data;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _row('商品金额', Money.formatYuanWithSymbol(data.totalAmountCents)),
        if (data.discountCents > 0)
          _row('优惠减免', '-${Money.formatYuan(data.discountCents)}'),
        if (data.couponDiscountCents > 0)
          _row('优惠券', '-${Money.formatYuan(data.couponDiscountCents)}'),
        if (data.pointsDiscountCents > 0)
          _row('积分抵扣', '-${Money.formatYuan(data.pointsDiscountCents)}'),
        _row('运费', Money.formatYuanWithSymbol(data.freightCents)),
        const Divider(height: 20),
        Row(
          children: [
            const Text(
              '应付金额',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const Spacer(),
            PriceText(cents: data.payableCents, size: 18),
          ],
        ),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
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
      ),
    );
  }
}
