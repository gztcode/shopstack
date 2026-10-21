import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'api/token_store.dart';
import 'providers/core_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final tokenStore = TokenStore(prefs);
  runApp(
    ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(tokenStore)],
      child: const ShopStackApp(),
    ),
  );
}

/// ShopStack 消费者端 App。
class ShopStackApp extends ConsumerWidget {
  const ShopStackApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'ShopStack',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
