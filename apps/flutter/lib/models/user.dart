import '../utils/enums.dart';
import '../utils/json_util.dart';
import 'common.dart';

/// 用户，对应 shopstack.user.v1.User。
class User {
  const User({
    this.id = 0,
    this.username = '',
    this.nickname = '',
    this.avatar = '',
    this.phone = '',
    this.email = '',
    this.gender = Gender.unspecified,
    this.birthday = '',
    this.points = 0,
    this.balanceCents = 0,
    this.status = UserStatus.active,
    this.wechatOpenid = '',
    this.createdAt = '',
    this.lastLoginAt = '',
  });

  final int id;
  final String username;
  final String nickname;
  final String avatar;
  final String phone;
  final String email;
  final Gender gender;
  final String birthday;
  final int points;
  final int balanceCents;
  final UserStatus status;
  final String wechatOpenid;
  final String createdAt;
  final String lastLoginAt;

  String get displayName => nickname.isNotEmpty ? nickname : username;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: JsonUtil.intOf(json, 'id'),
        username: JsonUtil.stringOf(json, 'username'),
        nickname: JsonUtil.stringOf(json, 'nickname'),
        avatar: JsonUtil.stringOf(json, 'avatar'),
        phone: JsonUtil.stringOf(json, 'phone'),
        email: JsonUtil.stringOf(json, 'email'),
        gender: parseEnumValue<Gender>(
          json['gender'],
          Gender.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        birthday: JsonUtil.stringOf(json, 'birthday'),
        points: JsonUtil.intOf(json, 'points'),
        balanceCents: JsonUtil.intOf(json, 'balance_cents',
            JsonUtil.intOf(json, 'balanceCents')),
        status: parseEnumValue<UserStatus>(
          json['status'],
          UserStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        wechatOpenid: JsonUtil.stringOf(json, 'wechat_openid',
            JsonUtil.stringOf(json, 'wechatOpenid')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        lastLoginAt: JsonUtil.stringOf(json, 'last_login_at',
            JsonUtil.stringOf(json, 'lastLoginAt')),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'nickname': nickname,
        'avatar': avatar,
        'phone': phone,
        'email': email,
        'gender': gender.wire,
        'birthday': birthday,
        'points': points,
        'balance_cents': balanceCents,
        'status': status.wire,
        'wechat_openid': wechatOpenid,
        'created_at': createdAt,
        'last_login_at': lastLoginAt,
      };
}

/// 登录结果，对应 shopstack.user.v1.AuthResponse。
class AuthSession {
  const AuthSession({
    this.accessToken = '',
    this.refreshToken = '',
    this.expiresIn = 0,
    this.tokenType = 'Bearer',
    this.user,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String tokenType;
  final User? user;

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
        accessToken: JsonUtil.stringOf(json, 'access_token',
            JsonUtil.stringOf(json, 'accessToken')),
        refreshToken: JsonUtil.stringOf(json, 'refresh_token',
            JsonUtil.stringOf(json, 'refreshToken')),
        expiresIn: JsonUtil.intOf(json, 'expires_in',
            JsonUtil.intOf(json, 'expiresIn')),
        tokenType: JsonUtil.stringOf(json, 'token_type', 'Bearer'),
        user: json['user'] == null
            ? null
            : User.fromJson(JsonUtil.asMap(json['user'])),
      );

  Map<String, dynamic> toJson() => {
        'access_token': accessToken,
        'refresh_token': refreshToken,
        'expires_in': expiresIn,
        'token_type': tokenType,
        'user': user?.toJson(),
      };
}

/// 收藏商品，对应 shopstack.user.v1.FavoriteProduct。
class FavoriteProduct {
  const FavoriteProduct({
    this.id = 0,
    this.productId = 0,
    this.title = '',
    this.cover = '',
    this.priceCents = 0,
    this.createdAt = '',
  });

  final int id;
  final int productId;
  final String title;
  final String cover;
  final int priceCents;
  final String createdAt;

  factory FavoriteProduct.fromJson(Map<String, dynamic> json) =>
      FavoriteProduct(
        id: JsonUtil.intOf(json, 'id'),
        productId: JsonUtil.intOf(json, 'product_id',
            JsonUtil.intOf(json, 'productId')),
        title: JsonUtil.stringOf(json, 'title'),
        cover: JsonUtil.stringOf(json, 'cover'),
        priceCents: JsonUtil.intOf(json, 'price_cents',
            JsonUtil.intOf(json, 'priceCents')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
      );
}

/// 收藏列表结果，对应 shopstack.user.v1.ListFavoritesResponse。
class FavoritesResult {
  const FavoritesResult({
    this.products = const <FavoriteProduct>[],
    this.meta = PageMeta.empty,
  });

  final List<FavoriteProduct> products;
  final PageMeta meta;

  factory FavoritesResult.fromJson(Map<String, dynamic> json) => FavoritesResult(
        products: JsonUtil.asMapList(json['products'])
            .map(FavoriteProduct.fromJson)
            .toList(),
        meta: PageMeta.fromJson(JsonUtil.asMap(json['meta'])),
      );
}
