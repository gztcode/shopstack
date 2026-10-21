import '../models/common.dart';
import '../models/user.dart';
import 'api_client.dart';

/// 认证与用户资料相关接口。
class AuthApi {
  AuthApi(this.client);

  final ApiClient client;

  /// 账号密码登录。
  Future<AuthSession> login(String username, String password) async {
    final data = await client.post('/auth/login', body: {
      'username': username,
      'password': password,
    });
    return AuthSession.fromJson(data);
  }

  /// 注册（注册成功即返回令牌）。
  Future<AuthSession> register({
    required String username,
    required String password,
    String phone = '',
    String nickname = '',
    String smsCode = '',
  }) async {
    final data = await client.post('/auth/register', body: {
      'username': username,
      'password': password,
      'phone': phone,
      'nickname': nickname,
      'sms_code': smsCode,
    });
    return AuthSession.fromJson(data);
  }

  /// 微信登录。
  Future<AuthSession> wechatLogin({
    required String code,
    String nickname = '',
    String avatar = '',
  }) async {
    final data = await client.post('/auth/wechat', body: {
      'code': code,
      'nickname': nickname,
      'avatar': avatar,
    });
    return AuthSession.fromJson(data);
  }

  /// 当前用户资料。
  Future<User> profile() async {
    final data = await client.get('/users/me');
    return User.fromJson(data);
  }

  /// 更新用户资料。
  Future<User> updateProfile({
    String? nickname,
    String? avatar,
    String? email,
    String? gender,
    String? birthday,
  }) async {
    final data = await client.put('/users/me', body: {
      'nickname': ?nickname,
      'avatar': ?avatar,
      'email': ?email,
      'gender': ?gender,
      'birthday': ?birthday,
    });
    return User.fromJson(data);
  }

  /// 收货地址列表。
  Future<List<Address>> addresses() async {
    final data = await client.get('/users/addresses');
    return _addressList(data);
  }

  List<Address> _addressList(Map<String, dynamic> data) {
    final raw = data['addresses'];
    if (raw is List) {
      return raw
          .map((e) => Address.fromJson(
              e is Map ? e.map((k, v) => MapEntry('$k', v)) : <String, dynamic>{}))
          .toList();
    }
    return const <Address>[];
  }

  /// 新增或更新地址（带 id 为更新）。
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
    final data = await client.post('/users/addresses', body: {
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
    });
    return Address.fromJson(data);
  }

  /// 删除地址。
  Future<void> deleteAddress(int id) async {
    await client.delete('/users/addresses/$id');
  }

  /// 设为默认地址。
  Future<void> setDefaultAddress(int id) async {
    await client.put('/users/addresses/$id/default');
  }

  /// 收藏列表。
  Future<FavoritesResult> favorites({int page = 1, int pageSize = 20}) async {
    final data = await client.get('/users/favorites', query: {
      'page.page': page,
      'page.page_size': pageSize,
    });
    return FavoritesResult.fromJson(data);
  }

  /// 收藏/取消收藏。
  Future<bool> toggleFavorite(int productId) async {
    final data = await client.post('/users/favorites/toggle',
        body: {'product_id': productId});
    final value = data['favorited'];
    return value is bool ? value : false;
  }
}
