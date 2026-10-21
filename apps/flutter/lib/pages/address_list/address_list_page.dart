import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../models/address_draft.dart';
import '../../models/common.dart';
import '../../providers/user_provider.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';

/// 地址管理页。
class AddressListPage extends ConsumerWidget {
  const AddressListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(addressesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('收货地址')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: addresses.when(
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    title: '还没有收货地址',
                    subtitle: '添加地址后即可下单',
                    icon: Icons.location_off_outlined,
                    actionText: '新增地址',
                    onAction: () => context.push(AppRoutes.addressEdit),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
                  itemCount: list.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _AddressTile(address: list[index]),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => const EmptyState(
                title: '地址加载失败',
                subtitle: '请下拉重试',
                icon: Icons.wifi_off_rounded,
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.addressEdit),
        backgroundColor: AppTheme.brand,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('新增地址'),
      ),
    );
  }
}

class _AddressTile extends ConsumerWidget {
  const _AddressTile({required this.address});

  final Address address;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        boxShadow: AppTheme.shadowSm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                address.receiver,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                address.phone,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSecondary),
              ),
              if (address.tag.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppTheme.brand50,
                    borderRadius: BorderRadius.circular(AppTheme.radiusXs),
                  ),
                  child: Text(
                    address.tag,
                    style: TextStyle(fontSize: 10, color: AppTheme.brand600),
                  ),
                ),
              ],
              const Spacer(),
              if (address.isDefault)
                const Text(
                  '默认',
                  style: TextStyle(fontSize: 12, color: AppTheme.brand),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            address.fullAddress,
            style: const TextStyle(
                fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),
          Row(
            children: [
              if (!address.isDefault)
                TextButton.icon(
                  onPressed: () async {
                    await ref
                        .read(userActionsProvider)
                        .setDefaultAddress(address.id);
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('已设为默认地址')),
                    );
                  },
                  icon: const Icon(Icons.check_circle_outline_rounded,
                      size: 16),
                  label: const Text('设为默认'),
                ),
              const Spacer(),
              TextButton.icon(
                onPressed: () => context.push(
                  AppRoutes.addressEdit,
                  extra: AddressDraft(
                    id: address.id,
                    receiver: address.receiver,
                    phone: address.phone,
                    province: address.province,
                    city: address.city,
                    district: address.district,
                    detail: address.detail,
                    postalCode: address.postalCode,
                    tag: address.tag,
                    isDefault: address.isDefault,
                  ),
                ),
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('编辑'),
              ),
              TextButton.icon(
                onPressed: () => _delete(context, ref),
                icon: const Icon(Icons.delete_outline_rounded,
                    size: 16, color: AppTheme.danger600),
                label: const Text('删除',
                    style: TextStyle(color: AppTheme.danger600)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除地址'),
        content: const Text('确定删除该收货地址吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.danger),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(userActionsProvider).deleteAddress(address.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('地址已删除')));
  }
}
