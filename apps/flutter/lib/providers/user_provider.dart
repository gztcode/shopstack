import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/common.dart';
import '../models/marketing.dart';
import '../models/notification.dart';
import '../models/order.dart';
import '../models/user.dart';
import '../utils/enums.dart';
import 'core_providers.dart';

/// 当前用户资料。
final profileProvider = FutureProvider<User>((ref) async {
  try {
    return await ref.read(authApiProvider).profile();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return ref.read(tokenStoreProvider).cachedUser ?? MockData.demoUser;
  }
});

/// 收货地址列表。
final addressesProvider = FutureProvider<List<Address>>((ref) async {
  try {
    return await ref.read(authApiProvider).addresses();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.addresses();
  }
});

/// 我的收藏。
final favoritesProvider = FutureProvider<FavoritesResult>((ref) async {
  try {
    return await ref.read(authApiProvider).favorites();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockStore.instance.favorites();
    return FavoritesResult(
      products: list,
      meta: PageMeta(page: 1, pageSize: list.length, total: list.length, totalPages: 1),
    );
  }
});

/// 我的优惠券。
final userCouponsProvider = FutureProvider<List<UserCoupon>>((ref) async {
  try {
    return await ref.read(marketingApiProvider).userCoupons();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.userCoupons();
  }
});

/// 可用优惠券（结算页使用）。
final availableCouponsProvider = FutureProvider<List<UserCoupon>>((ref) async {
  try {
    return await ref.read(marketingApiProvider).userCoupons();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance
        .userCoupons()
        .where((coupon) => coupon.status == UserCouponStatus.unused)
        .toList();
  }
});

/// 站内消息。
final notificationsProvider =
    FutureProvider<NotificationListResult>((ref) async {
  try {
    return await ref.read(notificationApiProvider).list(pageSize: 50);
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    final list = MockStore.instance.notifications();
    return NotificationListResult(
      notifications: list,
      meta: PageMeta(page: 1, pageSize: list.length, total: list.length, totalPages: 1),
      unreadCount: list.where((n) => !n.read).length,
    );
  }
});

/// 未读消息数。
final unreadCountProvider = Provider<int>((ref) {
  return ref
      .watch(notificationsProvider)
      .maybeWhen(
        data: (result) => result.unreadCount,
        orElse: () => 0,
      );
});

/// 订单数量统计（我的页面角标）。
final orderCountProvider = FutureProvider<OrderCount>((ref) async {
  try {
    return await ref.read(orderApiProvider).count();
  } catch (_) {
    ref.read(demoModeProvider.notifier).enable();
    return MockStore.instance.orderCount();
  }
});

/// 用户相关写操作。
class UserActions {
  UserActions(this.ref);

  final Ref ref;

  /// 收藏 / 取消收藏，返回收藏后的状态。
  Future<bool> toggleFavorite(int productId) async {
    bool favorited;
    try {
      favorited = await ref.read(authApiProvider).toggleFavorite(productId);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      favorited = MockStore.instance.toggleFavorite(productId);
    }
    ref.invalidate(favoritesProvider);
    return favorited;
  }

  /// 保存地址。
  Future<Address> saveAddress({
    int id = 0,
    required String receiver,
    required String phone,
    required String province,
    required String city,
    required String district,
    required String detail,
    String postalCode = '',
    String tag = '',
    bool isDefault = false,
  }) async {
    Address address;
    try {
      address = await ref.read(authApiProvider).saveAddress(
            id: id,
            receiver: receiver,
            phone: phone,
            province: province,
            city: city,
            district: district,
            detail: detail,
            postalCode: postalCode,
            tag: tag,
            isDefault: isDefault,
          );
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      address = MockStore.instance.saveAddress(
        id: id,
        receiver: receiver,
        phone: phone,
        province: province,
        city: city,
        district: district,
        detail: detail,
        postalCode: postalCode,
        tag: tag,
        isDefault: isDefault,
      );
    }
    ref.invalidate(addressesProvider);
    return address;
  }

  /// 删除地址。
  Future<void> deleteAddress(int id) async {
    try {
      await ref.read(authApiProvider).deleteAddress(id);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.deleteAddress(id);
    }
    ref.invalidate(addressesProvider);
  }

  /// 设为默认地址。
  Future<void> setDefaultAddress(int id) async {
    try {
      await ref.read(authApiProvider).setDefaultAddress(id);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.setDefaultAddress(id);
    }
    ref.invalidate(addressesProvider);
  }

  /// 标记消息已读。
  Future<void> markRead(int id) async {
    try {
      await ref.read(notificationApiProvider).markRead(id);
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.markRead(id);
    }
    ref.invalidate(notificationsProvider);
  }

  /// 全部标记已读。
  Future<void> markAllRead() async {
    try {
      await ref.read(notificationApiProvider).markAllRead();
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      MockStore.instance.markAllRead();
    }
    ref.invalidate(notificationsProvider);
  }

  /// 发表评价。
  Future<String?> createReview({
    required int productId,
    required int skuId,
    required int rating,
    required String content,
  }) async {
    try {
      await ref.read(productApiProvider).createReview(
            productId: productId,
            skuId: skuId,
            rating: rating,
            content: content,
          );
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
    }
    return null;
  }
}

final userActionsProvider = Provider<UserActions>(UserActions.new);
