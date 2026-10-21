import '../utils/json_util.dart';

/// 分页元数据，对应 shopstack.common.v1.PageMeta。
class PageMeta {
  const PageMeta({
    this.page = 1,
    this.pageSize = 20,
    this.total = 0,
    this.totalPages = 0,
  });

  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  static const PageMeta empty = PageMeta();

  factory PageMeta.fromJson(Map<String, dynamic> json) => PageMeta(
        page: JsonUtil.intOf(json, 'page', 1),
        pageSize: JsonUtil.intOf(
            json, 'page_size', JsonUtil.intOf(json, 'pageSize', 20)),
        total: JsonUtil.intOf(json, 'total'),
        totalPages: JsonUtil.intOf(
            json, 'total_pages', JsonUtil.intOf(json, 'totalPages')),
      );

  Map<String, dynamic> toJson() => {
        'page': page,
        'page_size': pageSize,
        'total': total,
        'total_pages': totalPages,
      };
}

/// 收货地址，对应 shopstack.common.v1.Address。
class Address {
  const Address({
    this.id = 0,
    this.receiver = '',
    this.phone = '',
    this.province = '',
    this.city = '',
    this.district = '',
    this.detail = '',
    this.postalCode = '',
    this.tag = '',
    this.isDefault = false,
  });

  final int id;
  final String receiver;
  final String phone;
  final String province;
  final String city;
  final String district;
  final String detail;
  final String postalCode;
  final String tag;
  final bool isDefault;

  String get fullAddress {
    final parts = [province, city, district].where((p) => p.isNotEmpty).toList();
    return parts.join(' ') + (detail.isEmpty ? '' : detail);
  }

  String get regionText {
    final parts = [province, city, district].where((p) => p.isNotEmpty).toList();
    return parts.join(' ');
  }

  factory Address.fromJson(Map<String, dynamic> json) => Address(
        id: JsonUtil.intOf(json, 'id'),
        receiver: JsonUtil.stringOf(json, 'receiver'),
        phone: JsonUtil.stringOf(json, 'phone'),
        province: JsonUtil.stringOf(json, 'province'),
        city: JsonUtil.stringOf(json, 'city'),
        district: JsonUtil.stringOf(json, 'district'),
        detail: JsonUtil.stringOf(json, 'detail'),
        postalCode: JsonUtil.stringOf(
            json, 'postal_code', JsonUtil.stringOf(json, 'postalCode')),
        tag: JsonUtil.stringOf(json, 'tag'),
        isDefault: JsonUtil.boolOf(
            json, 'is_default', JsonUtil.boolOf(json, 'isDefault')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'receiver': receiver,
        'phone': phone,
        'province': province,
        'city': city,
        'district': district,
        'detail': detail,
        'postal_code': postalCode,
        'tag': tag,
        'is_default': isDefault,
      };

  Address copyWith({
    int? id,
    String? receiver,
    String? phone,
    String? province,
    String? city,
    String? district,
    String? detail,
    String? postalCode,
    String? tag,
    bool? isDefault,
  }) =>
      Address(
        id: id ?? this.id,
        receiver: receiver ?? this.receiver,
        phone: phone ?? this.phone,
        province: province ?? this.province,
        city: city ?? this.city,
        district: district ?? this.district,
        detail: detail ?? this.detail,
        postalCode: postalCode ?? this.postalCode,
        tag: tag ?? this.tag,
        isDefault: isDefault ?? this.isDefault,
      );
}

/// 图片项，对应 shopstack.common.v1.ImageItem。
class ImageItem {
  const ImageItem({this.url = '', this.alt = '', this.sort = 0});

  final String url;
  final String alt;
  final int sort;

  factory ImageItem.fromJson(Map<String, dynamic> json) => ImageItem(
        url: JsonUtil.stringOf(json, 'url'),
        alt: JsonUtil.stringOf(json, 'alt'),
        sort: JsonUtil.intOf(json, 'sort'),
      );

  Map<String, dynamic> toJson() => {'url': url, 'alt': alt, 'sort': sort};
}

/// 通用操作结果，对应 shopstack.common.v1.OperationResult。
class OperationResult {
  const OperationResult({this.success = false, this.message = ''});

  final bool success;
  final String message;

  factory OperationResult.fromJson(Map<String, dynamic> json) => OperationResult(
        success: JsonUtil.boolOf(json, 'success'),
        message: JsonUtil.stringOf(json, 'message'),
      );
}

/// 分页响应包装：各接口数组字段名不同，统一收敛为 items + meta。
class PagedResult<T> {
  const PagedResult({required this.items, this.meta = PageMeta.empty});

  final List<T> items;
  final PageMeta meta;

  bool get isEmpty => items.isEmpty;
  int get total => meta.total;
}

/// 列表响应包装（无分页）。
class ListResult<T> {
  const ListResult(this.items);

  final List<T> items;

  bool get isEmpty => items.isEmpty;
}
