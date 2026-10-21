import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_store.dart';
import '../models/marketing.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

/// 领券中心状态。
class CouponCenterState {
  const CouponCenterState({
    this.coupons = const <Coupon>[],
    this.receivedIds = const <int>{},
    this.loadingIds = const <int>{},
    this.error,
  });

  /// 可领取的优惠券。
  final List<Coupon> coupons;

  /// 已领取的优惠券 id。
  final Set<int> receivedIds;

  /// 正在领取中的优惠券 id（用于禁用按钮，防止重复提交）。
  final Set<int> loadingIds;

  final String? error;

  bool isLoading(int couponId) => loadingIds.contains(couponId);

  bool isReceived(int couponId) => receivedIds.contains(couponId);

  CouponCenterState copyWith({
    List<Coupon>? coupons,
    Set<int>? receivedIds,
    Set<int>? loadingIds,
    String? error,
    bool clearError = false,
  }) =>
      CouponCenterState(
        coupons: coupons ?? this.coupons,
        receivedIds: receivedIds ?? this.receivedIds,
        loadingIds: loadingIds ?? this.loadingIds,
        error: clearError ? null : (error ?? this.error),
      );
}

/// 领券中心。
class CouponCenterNotifier extends Notifier<CouponCenterState> {
  @override
  CouponCenterState build() {
    Future.microtask(load);
    return const CouponCenterState();
  }

  /// 加载可领取的优惠券与已领取列表。
  Future<void> load() async {
    try {
      final marketing = ref.read(marketingApiProvider);
      final coupons = await marketing.availableCoupons();
      final userId = ref.read(currentUserIdProvider);
      final mine = await marketing.userCoupons(userId: userId);
      state = state.copyWith(
        coupons: coupons,
        receivedIds: mine.map((c) => c.couponId).toSet(),
        clearError: true,
      );
    } on ApiException catch (e) {
      ref.read(demoModeProvider.notifier).enable();
      state = state.copyWith(
        coupons: MockStore.instance.couponCenterCoupons(),
        receivedIds: MockStore.instance.receivedCouponIds(),
        error: e.message,
      );
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      state = state.copyWith(
        coupons: MockStore.instance.couponCenterCoupons(),
        receivedIds: MockStore.instance.receivedCouponIds(),
      );
    }
  }

  /// 领取优惠券。
  Future<String?> receive(int couponId) async {
    if (state.loadingIds.contains(couponId) || state.isReceived(couponId)) {
      return null;
    }
    state = state.copyWith(
      loadingIds: {...state.loadingIds, couponId},
      clearError: true,
    );
    try {
      final userId = ref.read(currentUserIdProvider);
      await ref
          .read(marketingApiProvider)
          .receiveCoupon(couponId: couponId, userId: userId);
      state = state.copyWith(
        receivedIds: {...state.receivedIds, couponId},
        loadingIds: {...state.loadingIds}..remove(couponId),
      );
      return null;
    } on ApiException catch (e) {
      state = state.copyWith(
        loadingIds: {...state.loadingIds}..remove(couponId),
        error: e.message,
      );
      return e.message;
    } catch (_) {
      ref.read(demoModeProvider.notifier).enable();
      final received = MockStore.instance.receiveCoupon(couponId);
      state = state.copyWith(
        receivedIds: received == null
            ? state.receivedIds
            : {...state.receivedIds, couponId},
        loadingIds: {...state.loadingIds}..remove(couponId),
      );
      return null;
    }
  }
}

final couponCenterProvider =
    NotifierProvider<CouponCenterNotifier, CouponCenterState>(
        CouponCenterNotifier.new);
