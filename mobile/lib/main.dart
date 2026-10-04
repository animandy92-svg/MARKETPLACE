import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'firebase_options.dart';
import 'models/product.dart';
import 'services/marketplace_service.dart';
import 'screens/catalog_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/product_screen.dart';
import 'screens/cart_screen.dart';
import 'screens/admin_screen.dart';
import 'screens/account_screen.dart';
import 'widgets/product_tile.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    if (const bool.fromEnvironment('USE_EMULATORS')) {
      const host = String.fromEnvironment(
        'EMULATOR_HOST',
        defaultValue: '10.0.2.2',
      );
      await FirebaseAuth.instance.useAuthEmulator(host, 9099);
      FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
    }
    runApp(MarketplaceApp(service: MarketplaceService()));
  } catch (_) {
    runApp(
      const MaterialApp(
        home: Scaffold(
          body: StatusView(
            'Could not connect to the marketplace. Please reopen the app.',
            icon: Icons.wifi_off,
          ),
        ),
      ),
    );
  }
}

class MarketplaceApp extends StatelessWidget {
  const MarketplaceApp({super.key, required this.service});
  final MarketplaceService service;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Jack of All Trades',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff6366f1)),
      scaffoldBackgroundColor: const Color(0xfffafafe),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xffe2e2ef)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    ),
    home: MarketplaceShell(service),
  );
}

class MarketplaceShell extends StatefulWidget {
  const MarketplaceShell(this.service, {super.key});
  final MarketplaceService service;
  @override
  State<MarketplaceShell> createState() => _MarketplaceShellState();
}

class _MarketplaceShellState extends State<MarketplaceShell> {
  int page = 0;
  late final authStream = widget.service.auth.authStateChanges();
  Future<bool> login() async {
    if (widget.service.auth.currentUser != null) return true;
    final signedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => AuthScreen(widget.service)),
    );
    return signedIn == true;
  }

  void notice(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> add(Product product) async {
    if (!await login()) return;
    try {
      await widget.service.addToCart(product);
      notice('Added to cart.');
    } catch (e) {
      notice(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> save(Product product, bool saved) async {
    if (!await login()) return;
    try {
      await widget.service.saveProduct(product, saved);
      notice(saved ? 'Saved to your wishlist.' : 'Removed from saved items.');
    } catch (_) {
      notice('Could not update saved items.');
    }
  }

  void open(Product product) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) =>
          ProductScreen(product, widget.service, onAdd: add, onSave: save),
    ),
  );
  Future<void> admin() async {
    if (!await login() || !mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => AdminScreen(widget.service)),
    );
  }

  Widget signInPrompt(String message) => StatusView(
    message,
    icon: Icons.person_outline,
    action: FilledButton(onPressed: login, child: const Text('Sign in')),
  );
  @override
  Widget build(BuildContext context) => StreamBuilder<User?>(
    stream: authStream,
    builder: (context, snapshot) {
      final user = snapshot.data;
      return Scaffold(
        appBar: AppBar(
          title: const Text(
            'Jack of All Trades',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          actions: [
            TextButton.icon(
              onPressed: admin,
              icon: const Icon(Icons.admin_panel_settings_outlined, size: 20),
              label: const Text('Admin'),
            ),
          ],
        ),
        body: IndexedStack(
          index: page,
          children: [
            CatalogScreen(widget.service, onOpen: open, onAdd: add),
            user == null
                ? signInPrompt('Sign in to save your favorite finds.')
                : SavedScreen(
                    widget.service,
                    user.uid,
                    key: ValueKey('saved-${user.uid}'),
                    onOpen: open,
                    onAdd: add,
                  ),
            user == null
                ? signInPrompt(
                    'Sign in to keep your cart across the website and app.',
                  )
                : CartScreen(
                    widget.service,
                    user.uid,
                    key: ValueKey('cart-${user.uid}'),
                    onOrdered: () => setState(() => page = 3),
                  ),
            user == null
                ? signInPrompt('Your orders and account, all in one place.')
                : AccountScreen(
                    widget.service,
                    user,
                    key: ValueKey('account-${user.uid}'),
                  ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: page,
          onDestinationSelected: (index) => setState(() => page = index),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.storefront_outlined),
              selectedIcon: Icon(Icons.storefront),
              label: 'Shop',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border),
              selectedIcon: Icon(Icons.favorite),
              label: 'Saved',
            ),
            NavigationDestination(
              icon: Icon(Icons.shopping_cart_outlined),
              selectedIcon: Icon(Icons.shopping_cart),
              label: 'Cart',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Account',
            ),
          ],
        ),
      );
    },
  );
}

class SavedScreen extends StatefulWidget {
  const SavedScreen(
    this.service,
    this.uid, {
    super.key,
    required this.onOpen,
    required this.onAdd,
  });
  final MarketplaceService service;
  final String uid;
  final void Function(Product) onOpen, onAdd;
  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  late final stream = widget.service.wishlist(widget.uid);
  @override
  Widget build(BuildContext context) => StreamBuilder<List<Product>>(
    stream: stream,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return const StatusView(
          'Could not load saved items. Check your connection.',
        );
      }
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      if (snapshot.data!.isEmpty) {
        return const StatusView(
          'Save something you love. Tap the heart on any item.',
          icon: Icons.favorite_border,
        );
      }
      return ProductGrid(
        snapshot.data!,
        onOpen: widget.onOpen,
        onAdd: widget.onAdd,
      );
    },
  );
}
