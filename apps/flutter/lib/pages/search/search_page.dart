import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/catalog_provider.dart';
import '../../widgets/demo_banner.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/product_card.dart';
import '../../widgets/skeleton.dart';

/// 搜索页。
class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  static const String _historyKey = 'shopstack_search_history';

  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  String _keyword = '';
  List<String> _history = const <String>[];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _history = prefs.getStringList(_historyKey) ?? const <String>[];
    });
  }

  Future<void> _saveHistory(String keyword) async {
    final prefs = await SharedPreferences.getInstance();
    final history = <String>[keyword, ..._history.where((h) => h != keyword)];
    await prefs.setStringList(_historyKey, history.take(10).toList());
    if (!mounted) return;
    setState(() => _history = history.take(10).toList());
  }

  Future<void> _clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey);
    if (!mounted) return;
    setState(() => _history = const <String>[]);
  }

  void _search(String keyword) {
    final text = keyword.trim();
    if (text.isEmpty) return;
    _focusNode.unfocus();
    setState(() => _keyword = text);
    _saveHistory(text);
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(searchProductsProvider(_keyword));
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Container(
          height: 36,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: AppTheme.bgMuted,
            borderRadius: BorderRadius.circular(AppTheme.radiusPill),
          ),
          child: Row(
            children: [
              const SizedBox(width: 12),
              const Icon(Icons.search_rounded,
                  size: 18, color: AppTheme.textTertiary),
              const SizedBox(width: 6),
              Expanded(
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  textInputAction: TextInputAction.search,
                  onSubmitted: _search,
                  onChanged: (value) {
                    if (value.trim().isEmpty && _keyword.isNotEmpty) {
                      setState(() => _keyword = '');
                    }
                  },
                  decoration: const InputDecoration(
                    hintText: '搜索商品、品牌',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
              if (_controller.text.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 16),
                  onPressed: () {
                    _controller.clear();
                    setState(() => _keyword = '');
                  },
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => _search(_controller.text),
            child: const Text('搜索'),
          ),
        ],
      ),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: _keyword.isEmpty
                ? _HistoryView(
                    history: _history,
                    onSelect: (keyword) {
                      _controller.text = keyword;
                      _search(keyword);
                    },
                    onClear: _clearHistory,
                  )
                : results.when(
                    data: (result) => result.items.isEmpty
                        ? const EmptyState(
                            title: '没有找到相关商品',
                            subtitle: '换个关键词试试',
                            icon: Icons.search_off_rounded,
                          )
                        : GridView.builder(
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 16),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisSpacing: 10,
                              crossAxisSpacing: 10,
                              childAspectRatio: 0.62,
                            ),
                            itemCount: result.items.length,
                            itemBuilder: (context, index) {
                              final product = result.items[index];
                              return ProductCard(
                                product: product,
                                onTap: () =>
                                    context.push('/product/${product.id}'),
                              );
                            },
                          ),
                    loading: () => GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.62,
                      ),
                      itemCount: 4,
                      itemBuilder: (context, index) =>
                          const ProductCardSkeleton(),
                    ),
                    error: (error, stack) => const EmptyState(
                      title: '搜索失败',
                      subtitle: '请稍后重试',
                      icon: Icons.wifi_off_rounded,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

/// 搜索历史。
class _HistoryView extends StatelessWidget {
  const _HistoryView({
    required this.history,
    required this.onSelect,
    required this.onClear,
  });

  final List<String> history;
  final ValueChanged<String> onSelect;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) {
      return const EmptyState(
        title: '搜索你想买的东西',
        subtitle: '支持按商品名、品牌与标签搜索',
        icon: Icons.travel_explore_rounded,
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Row(
          children: [
            const Text(
              '搜索历史',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
            ),
            const Spacer(),
            GestureDetector(
              onTap: onClear,
              child: const Icon(Icons.delete_outline_rounded,
                  size: 18, color: AppTheme.textTertiary),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: history
              .map((keyword) => ActionChip(
                    label: Text(keyword),
                    onPressed: () => onSelect(keyword),
                    backgroundColor: AppTheme.bgMuted,
                    side: BorderSide.none,
                  ))
              .toList(),
        ),
        const SizedBox(height: 28),
        const Text(
          '热门搜索',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const ['手机', '笔记本', '炒锅', '车厘子', '耳机']
              .map((keyword) => ActionChip(
                    label: Text(keyword),
                    onPressed: null,
                    backgroundColor: AppTheme.bgSubtle,
                    side: BorderSide.none,
                  ))
              .toList(),
        ),
      ],
    );
  }
}
