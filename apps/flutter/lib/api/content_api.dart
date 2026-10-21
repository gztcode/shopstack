import '../models/expansion.dart';
import '../utils/json_util.dart';
import 'api_client.dart';

/// 内容类接口：帮助中心文章与行政区域。
class ContentApi {
  ContentApi(this.client);

  final ApiClient client;

  /// 帮助文章列表。
  Future<List<HelpArticle>> helpArticles({String? category}) async {
    final data = await client.get('/help/articles', query: {
      'category': ?category,
    });
    return JsonUtil.asMapList(data['articles'])
        .map(HelpArticle.fromJson)
        .toList();
  }

  /// 帮助文章详情。
  Future<HelpArticle> helpArticle(int id) async {
    final data = await client.get('/help/articles/$id');
    return HelpArticle.fromJson(data);
  }

  /// 行政区域列表。
  Future<List<Region>> regions({int parentId = 0}) async {
    final data = await client.get('/regions', query: {'parent_id': parentId});
    return JsonUtil.asMapList(data['regions']).map(Region.fromJson).toList();
  }
}
