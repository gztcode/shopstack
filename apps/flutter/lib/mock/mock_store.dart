import '../models/cart.dart';
import '../models/common.dart';
import '../models/invoice.dart';
import '../models/logistics.dart';
import '../models/marketing.dart';
import '../models/notification.dart';
import '../models/order.dart';
import '../models/payment.dart';
import '../models/points.dart';
import '../models/product.dart';
import '../models/user.dart';
import '../utils/enums.dart';
import 'mock_data.dart';

/// 演示模式下的内存数据仓库。
///
/// 后端不可用时，所有读写都落到这里，保证业务流程可完整走通。
class MockStore {
  MockStore._();

  static final MockStore instance = MockStore._();

  final List<CartItem> _cart = <CartItem>[];
  final List<Order> _orders = <Order>[];
  final List<OrderItem> _orderItems = <OrderItem>[];
  final List<Address> _addresses = <Address>[];
  final List<AppNotification> _notifications = <AppNotification>[];
  final List<UserCoupon> _userCoupons = MockData.userCoupons();
  final Set<int> _favoriteIds = <int>{1, 7};
  final Map<int, Payment> _payments = <int, Payment>{};
  final Map<int, int> _paymentPolls = <int, int>{};
  final List<PointsLog> _pointsLogs = List<PointsLog>.of(MockData.pointsLogs);
  final List<Invoice> _invoices = List<Invoice>.of(MockData.invoices);
  final Set<int> _receivedCouponIds = <int>{103};

  int _cartIdSeq = 1;
  int _orderIdSeq = 100;
  int _orderItemSeq = 100;
  int _paymentIdSeq = 500;
  int _addressIdSeq = 10;

  // ---------------------------------------------------------------- 商品

  /// 商品详情（演示数据）。
  ProductDetail productDetail(int id) {
    final product = MockData.products.firstWhere(
      (p) => p.id == id,
      orElse: () => MockData.products.first,
    );
    final skus = MockData.skus[product.id] ?? <ProductSku>[];
    final images = <ImageItem>[
      ImageItem(url: product.cover, alt: '${product.title} 1', sort: 1),
      if (skus.isNotEmpty && skus.first.image.isNotEmpty)
        ImageItem(url: skus.first.image, alt: '${product.title} 2', sort: 2),
    ];
    final related = MockData.products
        .where((p) => p.id != product.id && p.categoryId == product.categoryId)
        .take(4)
        .toList();
    final reviews =
        MockData.reviews.where((r) => r.productId == product.id).toList();
    final good = reviews.where((r) => r.rating >= 4).length;
    final medium = reviews.where((r) => r.rating == 3).length;
    final bad = reviews.where((r) => r.rating <= 2).length;
    final average = reviews.isEmpty
        ? 0.0
        : reviews.map((r) => r.rating).reduce((a, b) => a + b) /
            reviews.length;
    return ProductDetail(
      product: product,
      skus: skus,
      images: images,
      attributes: MockData.attributes[product.id] ?? const <ProductAttribute>[],
      reviews: ReviewSummary(
        total: reviews.length,
        good: good,
        medium: medium,
        bad: bad,
        average: average,
      ),
      reviewCount: reviews.length,
      reviewRating: average,
      related: related.isEmpty ? MockData.products.take(4).toList() : related,
    );
  }

  /// 商品列表（支持分类、关键字、排序、价格区间）。
  List<Product> products({
    int? categoryId,
    String keyword = '',
    String sort = 'default',
    int? minPriceCents,
    int? maxPriceCents,
  }) {
    var list = MockData.products.where((p) => p.onShelf).toList();
    if (categoryId != null && categoryId > 0) {
      final ids = <int>{categoryId};
      for (final category in MockData.subCategories) {
        if (category.parentId == categoryId) ids.add(category.id);
      }
      list = list.where((p) => ids.contains(p.categoryId)).toList();
    }
    if (keyword.isNotEmpty) {
      final key = keyword.toLowerCase();
      list = list
          .where((p) =>
              p.title.toLowerCase().contains(key) ||
              p.subtitle.toLowerCase().contains(key) ||
              p.tags.any((t) => t.toLowerCase().contains(key)))
          .toList();
    }
    if (minPriceCents != null) {
      list = list.where((p) => p.minPriceCents >= minPriceCents).toList();
    }
    if (maxPriceCents != null) {
      list = list.where((p) => p.minPriceCents <= maxPriceCents).toList();
    }
    switch (sort) {
      case 'sales':
        list.sort((a, b) => b.salesCount.compareTo(a.salesCount));
        break;
      case 'price_asc':
        list.sort((a, b) => a.minPriceCents.compareTo(b.minPriceCents));
        break;
      case 'price_desc':
        list.sort((a, b) => b.minPriceCents.compareTo(a.minPriceCents));
        break;
      case 'newest':
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
      default:
        break;
    }
    return list;
  }

  // ---------------------------------------------------------------- 购物车

  /// 当前购物车。
  Cart cart() {
    final selected = _cart.where((item) => item.selected).toList();
    final selectedAmount =
        selected.fold<int>(0, (sum, item) => sum + item.subtotalCents);
    return Cart(
      userId: MockData.demoUser.id,
      items: List<CartItem>.unmodifiable(_cart),
      totalCount: _cart.fold<int>(0, (sum, item) => sum + item.quantity),
      selectedCount: selected.fold<int>(0, (sum, item) => sum + item.quantity),
      selectedAmountCents: selectedAmount,
      selectedPayableCents: selectedAmount,
    );
  }

  int cartCount() => _cart.fold<int>(0, (sum, item) => sum + item.quantity);

  /// 加入购物车。
  Cart addToCart({
    required int productId,
    required int skuId,
    int quantity = 1,
  }) {
    final detail = productDetail(productId);
    ProductSku? sku;
    for (final s in detail.skus) {
      if (s.id == skuId) {
        sku = s;
        break;
      }
    }
    sku ??= detail.skus.isNotEmpty ? detail.skus.first : null;
    if (sku == null) {
      return cart();
    }
    final targetSku = sku;
    final existing = _cart.indexWhere(
        (item) => item.productId == productId && item.skuId == targetSku.id);
    if (existing >= 0) {
      final old = _cart[existing];
      _cart[existing] = old.copyWith(
        quantity: old.quantity + quantity,
        subtotalCents: old.priceCents * (old.quantity + quantity),
      );
    } else {
      _cart.add(CartItem(
        id: _cartIdSeq++,
        userId: MockData.demoUser.id,
        productId: productId,
        skuId: targetSku.id,
        productTitle: detail.product.title,
        specText: targetSku.specText,
        image: detail.product.cover,
        priceCents: targetSku.priceCents,
        quantity: quantity,
        stock: targetSku.stock,
        selected: true,
        available: sku.stock > 0,
        subtotalCents: targetSku.priceCents * quantity,
        createdAt: '2026-10-20T10:00:00Z',
      ));
    }
    return cart();
  }

  /// 更新购物车条目。
  Cart updateItem({required int id, int? quantity, bool? selected}) {
    final index = _cart.indexWhere((item) => item.id == id);
    if (index < 0) return cart();
    final item = _cart[index];
    final newQuantity = quantity ?? item.quantity;
    _cart[index] = item.copyWith(
      quantity: newQuantity,
      selected: selected ?? item.selected,
      subtotalCents: item.priceCents * newQuantity,
    );
    return cart();
  }

  /// 删除购物车条目。
  Cart removeItem(int id) {
    _cart.removeWhere((item) => item.id == id);
    return cart();
  }

  /// 全选 / 取消全选。
  Cart selectAll(bool selected) {
    for (var i = 0; i < _cart.length; i++) {
      _cart[i] = _cart[i].copyWith(selected: selected);
    }
    return cart();
  }

  /// 清空购物车。
  void clearCart() => _cart.clear();

  // ---------------------------------------------------------------- 订单

  List<Order> orders({int? status}) {
    if (_orders.isEmpty) {
      _orders.addAll(MockData.demoOrders());
    }
    if (status == null) return List<Order>.unmodifiable(_orders);
    return _orders
        .where((order) => order.status.code == status)
        .toList(growable: false);
  }

  Order? orderById(int id) {
    if (_orders.isEmpty) {
      _orders.addAll(MockData.demoOrders());
    }
    for (final order in _orders) {
      if (order.id == id) return order;
    }
    return null;
  }

  List<OrderItem> orderItems(int orderId) {
    final existing =
        _orderItems.where((item) => item.orderId == orderId).toList();
    if (existing.isNotEmpty) return existing;
    return MockData.demoOrderItems(orderId);
  }

  /// 创建订单。
  Order createOrder({
    List<Map<String, dynamic>> items = const <Map<String, dynamic>>[],
    bool fromCart = false,
    List<int> cartItemIds = const <int>[],
    int addressId = 0,
    int couponId = 0,
    String remark = '',
    String paymentMethod = 'wechat',
  }) {
    if (_orders.isEmpty) {
      _orders.addAll(MockData.demoOrders());
    }
    final address = _addresses.isNotEmpty
        ? _addresses.firstWhere((a) => a.id == addressId,
            orElse: () => _addresses.first)
        : MockData.addresses.first;

    final resolved = <OrderItem>[];
    if (fromCart) {
      for (final item in _cart.where((c) => cartItemIds.contains(c.id))) {
        resolved.add(OrderItem(
          id: _orderItemSeq++,
          productId: item.productId,
          skuId: item.skuId,
          productTitle: item.productTitle,
          specText: item.specText,
          image: item.image,
          priceCents: item.priceCents,
          quantity: item.quantity,
          subtotalCents: item.subtotalCents,
        ));
      }
      _cart.removeWhere((item) => cartItemIds.contains(item.id));
    } else {
      for (final raw in items) {
        final productId = raw['product_id'] as int? ?? 0;
        final skuId = raw['sku_id'] as int? ?? 0;
        final quantity = raw['quantity'] as int? ?? 1;
        final detail = productDetail(productId);
        ProductSku? sku;
        for (final s in detail.skus) {
          if (s.id == skuId) {
            sku = s;
            break;
          }
        }
        sku ??= detail.skus.isNotEmpty ? detail.skus.first : null;
        if (sku == null) continue;
        resolved.add(OrderItem(
          id: _orderItemSeq++,
          productId: productId,
          skuId: sku.id,
          productTitle: detail.product.title,
          specText: sku.specText,
          image: detail.product.cover,
          priceCents: sku.priceCents,
          quantity: quantity,
          subtotalCents: sku.priceCents * quantity,
        ));
      }
    }

    final total = resolved.fold<int>(0, (sum, item) => sum + item.subtotalCents);
    var discount = 0;
    UserCoupon? usedCoupon;
    for (final userCoupon in _userCoupons) {
      if (userCoupon.couponId == couponId &&
          userCoupon.status == UserCouponStatus.unused) {
        usedCoupon = userCoupon;
      }
    }
    if (usedCoupon != null) {
      switch (usedCoupon.type) {
        case CouponType.fixed:
          discount = usedCoupon.faceValueCents;
          break;
        case CouponType.percent:
          discount = (total * (100 - usedCoupon.percent) / 100).round();
          if (usedCoupon.maxDiscountCents > 0 &&
              discount > usedCoupon.maxDiscountCents) {
            discount = usedCoupon.maxDiscountCents;
          }
          break;
        case CouponType.shipping:
          discount = 0;
          break;
        case CouponType.unspecified:
          discount = 0;
          break;
      }
      if (discount > total) discount = total;
    }
    final payable = total - discount;

    final order = Order(
      id: _orderIdSeq++,
      orderNo: 'SS${DateTime.now().millisecondsSinceEpoch.toString().substring(4)}',
      userId: MockData.demoUser.id,
      userNickname: MockData.demoUser.nickname,
      status: OrderStatus.pendingPayment,
      totalAmountCents: total,
      discountCents: discount,
      freightCents: 0,
      payableCents: payable,
      itemCount: resolved.length,
      totalQuantity:
          resolved.fold<int>(0, (sum, item) => sum + item.quantity),
      address: address,
      remark: remark,
      paymentMethod: paymentMethod,
      createdAt: DateTime.now().toIso8601String(),
    );
    _orders.insert(0, order);
    for (final item in resolved) {
      _orderItems.add(OrderItem(
        id: item.id,
        orderId: order.id,
        productId: item.productId,
        skuId: item.skuId,
        productTitle: item.productTitle,
        specText: item.specText,
        image: item.image,
        priceCents: item.priceCents,
        quantity: item.quantity,
        subtotalCents: item.subtotalCents,
      ));
    }
    return order;
  }

  /// 取消订单。
  Order? cancelOrder(int id) => _updateOrder(
    id,
    OrderStatus.cancelled,
    cancelledAt: _now(),
  );

  /// 确认收货。
  Order? confirmOrder(int id) => _updateOrder(
    id,
    OrderStatus.completed,
    completedAt: _now(),
  );

  /// 申请退款。
  Order? refundOrder(int id) => _updateOrder(id, OrderStatus.refunding);

  /// 更新订单状态并保留其余字段。
  Order? _updateOrder(
    int id,
    OrderStatus status, {
    String? paidAt,
    String? shippedAt,
    String? completedAt,
    String? cancelledAt,
  }) {
    final index = _orders.indexWhere((order) => order.id == id);
    if (index < 0) return null;
    final order = _orders[index];
    _orders[index] = Order(
      id: order.id,
      orderNo: order.orderNo,
      userId: order.userId,
      userNickname: order.userNickname,
      status: status,
      totalAmountCents: order.totalAmountCents,
      discountCents: order.discountCents,
      freightCents: order.freightCents,
      payableCents: order.payableCents,
      paidCents: order.paidCents,
      refundedCents: order.refundedCents,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      address: order.address,
      remark: order.remark,
      paymentMethod: order.paymentMethod,
      paidAt: paidAt ?? order.paidAt,
      shippedAt: shippedAt ?? order.shippedAt,
      completedAt: completedAt ?? order.completedAt,
      cancelledAt: cancelledAt ?? order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: _now(),
      adminRemark: order.adminRemark,
      shipmentId: order.shipmentId,
    );
    return _orders[index];
  }

  /// 订单状态日志。
  List<OrderStatusLog> orderLogs(int orderId) {
    final order = orderById(orderId);
    if (order == null) return const <OrderStatusLog>[];
    final logs = <OrderStatusLog>[];
    logs.add(OrderStatusLog(
      id: 1,
      orderId: orderId,
      fromStatus: 0,
      toStatus: OrderStatus.pendingPayment.code,
      action: 'create',
      operator: '用户',
      remark: '订单创建成功',
      createdAt: order.createdAt,
    ));
    if (order.paidAt.isNotEmpty) {
      logs.add(OrderStatusLog(
        id: 2,
        orderId: orderId,
        fromStatus: OrderStatus.pendingPayment.code,
        toStatus: OrderStatus.paid.code,
        action: 'pay',
        operator: '用户',
        remark: '用户完成支付',
        createdAt: order.paidAt,
      ));
    }
    if (order.shippedAt.isNotEmpty) {
      logs.add(OrderStatusLog(
        id: 3,
        orderId: orderId,
        fromStatus: OrderStatus.paid.code,
        toStatus: OrderStatus.shipped.code,
        action: 'ship',
        operator: '商家',
        remark: '商品已发出',
        createdAt: order.shippedAt,
      ));
    }
    if (order.completedAt.isNotEmpty) {
      logs.add(OrderStatusLog(
        id: 4,
        orderId: orderId,
        fromStatus: OrderStatus.shipped.code,
        toStatus: OrderStatus.completed.code,
        action: 'confirm',
        operator: '用户',
        remark: '用户确认收货',
        createdAt: order.completedAt,
      ));
    }
    if (order.status == OrderStatus.cancelled) {
      logs.add(OrderStatusLog(
        id: 5,
        orderId: orderId,
        fromStatus: OrderStatus.pendingPayment.code,
        toStatus: OrderStatus.cancelled.code,
        action: 'cancel',
        operator: '用户',
        remark: '用户取消订单',
        createdAt: order.cancelledAt.isEmpty ? _now() : order.cancelledAt,
      ));
    }
    if (order.status == OrderStatus.refunding) {
      logs.add(OrderStatusLog(
        id: 6,
        orderId: orderId,
        fromStatus: OrderStatus.paid.code,
        toStatus: OrderStatus.refunding.code,
        action: 'refund',
        operator: '用户',
        remark: '用户申请退款，等待审核',
        createdAt: _now(),
      ));
    }
    return logs.reversed.toList();
  }

  /// 订单数量统计。
  OrderCount orderCount() {
    final list = orders();
    int count(OrderStatus status) =>
        list.where((order) => order.status == status).length;
    return OrderCount(
      pendingPayment: count(OrderStatus.pendingPayment),
      pendingShipment: count(OrderStatus.paid),
      pendingReceipt: count(OrderStatus.shipped),
      refunding: count(OrderStatus.refunding),
    );
  }

  // ---------------------------------------------------------------- 支付

  /// 创建支付单。
  Payment createPayment({required int orderId, required int channel}) {
    final order = orderById(orderId);
    final id = _paymentIdSeq++;
    final payment = Payment(
      id: id,
      paymentNo: 'PAY${DateTime.now().millisecondsSinceEpoch}',
      orderId: orderId,
      orderNo: order?.orderNo ?? '',
      userId: MockData.demoUser.id,
      amountCents: order?.payableCents ?? 0,
      status: PaymentStatus.pending,
      channel: PaymentChannel.values.firstWhere(
        (c) => c.code == channel,
        orElse: () => PaymentChannel.wechat,
      ),
      prepayId: 'prepay_${DateTime.now().millisecondsSinceEpoch}',
      createdAt: _now(),
    );
    _payments[id] = payment;
    _paymentPolls[id] = 0;
    return payment;
  }

  /// 查询支付状态：轮询两次后返回成功，模拟第三方回调。
  Payment queryPayment({int? paymentId, int? orderId}) {
    Payment? payment;
    if (paymentId != null) {
      payment = _payments[paymentId];
    }
    if (payment == null && orderId != null) {
      for (final item in _payments.values) {
        if (item.orderId == orderId) {
          payment = item;
          break;
        }
      }
    }
    if (payment == null) {
      final order = orderById(orderId ?? 0);
      return Payment(
        id: 0,
        orderId: orderId ?? 0,
        orderNo: order?.orderNo ?? '',
        amountCents: order?.payableCents ?? 0,
        status: PaymentStatus.pending,
        channel: PaymentChannel.wechat,
        createdAt: _now(),
      );
    }
    final polls = (_paymentPolls[payment.id] ?? 0) + 1;
    _paymentPolls[payment.id] = polls;
    if (polls >= 2) {
      final updated = Payment(
        id: payment.id,
        paymentNo: payment.paymentNo,
        orderId: payment.orderId,
        orderNo: payment.orderNo,
        userId: payment.userId,
        amountCents: payment.amountCents,
        refundedCents: payment.refundedCents,
        status: PaymentStatus.success,
        channel: payment.channel,
        transactionId: 'TXN${DateTime.now().millisecondsSinceEpoch}',
        prepayId: payment.prepayId,
        payParams: payment.payParams,
        failReason: payment.failReason,
        paidAt: _now(),
        createdAt: payment.createdAt,
        updatedAt: _now(),
      );
      _payments[payment.id] = updated;
      _markOrderPaid(payment.orderId);
      return updated;
    }
    return payment;
  }

  void _markOrderPaid(int orderId) {
    final index = _orders.indexWhere((order) => order.id == orderId);
    if (index < 0) return;
    final order = _orders[index];
    _orders[index] = Order(
      id: order.id,
      orderNo: order.orderNo,
      userId: order.userId,
      userNickname: order.userNickname,
      status: OrderStatus.paid,
      totalAmountCents: order.totalAmountCents,
      discountCents: order.discountCents,
      freightCents: order.freightCents,
      payableCents: order.payableCents,
      paidCents: order.payableCents,
      refundedCents: order.refundedCents,
      itemCount: order.itemCount,
      totalQuantity: order.totalQuantity,
      address: order.address,
      remark: order.remark,
      paymentMethod: order.paymentMethod,
      paidAt: _now(),
      shippedAt: order.shippedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: _now(),
      adminRemark: order.adminRemark,
      shipmentId: order.shipmentId,
    );
  }

  // ---------------------------------------------------------------- 用户

  List<Address> addresses() =>
      _addresses.isEmpty ? List<Address>.of(MockData.addresses) : _addresses;

  Address saveAddress({
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
  }) {
    if (_addresses.isEmpty) {
      _addresses.addAll(MockData.addresses);
    }
    final address = Address(
      id: id == 0 ? _addressIdSeq++ : id,
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
    final index = _addresses.indexWhere((a) => a.id == id);
    if (index >= 0) {
      _addresses[index] = address;
    } else {
      _addresses.add(address);
    }
    if (isDefault) {
      for (var i = 0; i < _addresses.length; i++) {
        if (_addresses[i].id != address.id) {
          _addresses[i] = _addresses[i].copyWith(isDefault: false);
        }
      }
    }
    return address;
  }

  void deleteAddress(int id) =>
      _addresses.removeWhere((address) => address.id == id);

  void setDefaultAddress(int id) {
    for (var i = 0; i < _addresses.length; i++) {
      _addresses[i] = _addresses[i].copyWith(isDefault: _addresses[i].id == id);
    }
  }

  /// 收藏列表。
  List<FavoriteProduct> favorites() => MockData.products
      .where((product) => _favoriteIds.contains(product.id))
      .map((product) => FavoriteProduct(
            id: product.id,
            productId: product.id,
            title: product.title,
            cover: product.cover,
            priceCents: product.minPriceCents,
            createdAt: product.createdAt,
          ))
      .toList();

  /// 收藏/取消收藏。
  bool toggleFavorite(int productId) {
    if (_favoriteIds.contains(productId)) {
      _favoriteIds.remove(productId);
      return false;
    }
    _favoriteIds.add(productId);
    return true;
  }

  bool isFavorite(int productId) => _favoriteIds.contains(productId);

  /// 我的优惠券。
  List<UserCoupon> userCoupons({int? status}) {
    if (status == null) return List<UserCoupon>.of(_userCoupons);
    return _userCoupons
        .where((coupon) => coupon.status.code == status)
        .toList(growable: false);
  }

  // ---------------------------------------------------------------- 积分

  /// 积分明细。
  List<PointsLog> pointsLogs() => List<PointsLog>.unmodifiable(_pointsLogs);

  /// 当前积分。
  int currentPoints() => MockData.demoCurrentPoints;

  // ---------------------------------------------------------------- 发票

  /// 发票申请列表。
  List<Invoice> invoices() => List<Invoice>.unmodifiable(_invoices);

  /// 申请开票。
  Invoice createInvoice({
    required String orderNo,
    required String title,
    String taxNo = '',
    String type = 'personal',
    String email = '',
    int amountCents = 0,
    String remark = '',
  }) {
    final invoice = Invoice(
      id: _addressIdSeq++,
      userId: MockData.demoUser.id,
      orderNo: orderNo,
      title: title,
      taxNo: taxNo,
      type: type,
      email: email,
      amountCents: amountCents,
      status: 0,
      invoiceUrl: '',
      remark: remark,
      createdAt: _now(),
    );
    _invoices.insert(0, invoice);
    return invoice;
  }

  // ---------------------------------------------------------------- 领券中心

  /// 可领取的优惠券。
  List<Coupon> couponCenterCoupons() =>
      List<Coupon>.unmodifiable(MockData.couponCenterCoupons);

  /// 已领取的优惠券 id。
  Set<int> receivedCouponIds() => Set<int>.unmodifiable(_receivedCouponIds);

  /// 领取优惠券，已领取时返回 null。
  UserCoupon? receiveCoupon(int couponId) {
    if (_receivedCouponIds.contains(couponId)) return null;
    _receivedCouponIds.add(couponId);
    Coupon? target;
    for (final coupon in MockData.couponCenterCoupons) {
      if (coupon.id == couponId) {
        target = coupon;
        break;
      }
    }
    if (target == null) return null;
    final userCoupon = UserCoupon(
      id: 900 + couponId,
      userId: MockData.demoUser.id,
      couponId: couponId,
      coupon: target,
      status: UserCouponStatus.unused,
      receivedAt: _now(),
    );
    _userCoupons.insert(0, userCoupon);
    return userCoupon;
  }

  // ---------------------------------------------------------------- 消息

  List<AppNotification> notifications() {
    if (_notifications.isEmpty) {
      _notifications.addAll(MockData.notifications);
    }
    return List<AppNotification>.of(_notifications);
  }

  void markRead(int id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index < 0) return;
    final item = _notifications[index];
    _notifications[index] = AppNotification(
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      content: item.content,
      link: item.link,
      bizId: item.bizId,
      read: true,
      createdAt: item.createdAt,
      readAt: _now(),
    );
  }

  void markAllRead() {
    for (var i = 0; i < _notifications.length; i++) {
      final item = _notifications[i];
      if (item.read) continue;
      _notifications[i] = AppNotification(
        id: item.id,
        userId: item.userId,
        type: item.type,
        title: item.title,
        content: item.content,
        link: item.link,
        bizId: item.bizId,
        read: true,
        createdAt: item.createdAt,
        readAt: _now(),
      );
    }
  }

  int unreadCount() =>
      notifications().where((n) => !n.read).length;

  // ---------------------------------------------------------------- 物流

  /// 订单物流。
  LogisticsResult orderLogistics(int orderId) => LogisticsResult(
        shipment: MockData.demoShipment(orderId),
        tracks: MockData.demoTracks(orderId),
      );

  String _now() => DateTime.now().toIso8601String();
}
