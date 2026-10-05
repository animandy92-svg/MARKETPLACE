import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';
import '../models/categories.dart';

class ProductGrid extends StatelessWidget {
  const ProductGrid(
    this.products, {
    super.key,
    required this.onOpen,
    required this.onAdd,
  });
  final List<Product> products;
  final void Function(Product) onOpen, onAdd;
  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: constraints.maxWidth >= 700
            ? 3
            : constraints.maxWidth < 340
            ? 1
            : 2,
        mainAxisExtent: 310,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: products.length,
      itemBuilder: (_, i) => ProductTile(
        product: products[i],
        onOpen: () => onOpen(products[i]),
        onAdd: () => onAdd(products[i]),
      ),
    ),
  );
}

class CatalogScreen extends StatefulWidget {
  const CatalogScreen(
    this.service, {
    super.key,
    required this.onOpen,
    required this.onAdd,
  });
  final MarketplaceService service;
  final void Function(Product) onOpen, onAdd;
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  late final stream = widget.service.products();
  String search = '', category = 'all', sort = 'name';
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xff176454), Color(0xff36836c)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dream it. Own it.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Phones, laptops, study essentials and more. Your everyday marketplace in Ghana.',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 20),
            TextField(
              onChanged: (value) => setState(() => search = value),
              decoration: const InputDecoration(
                hintText: 'Search the marketplace',
                prefixIcon: Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 0),
        child: Row(
          children: [
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: categories.entries
                      .map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(entry.value),
                            selected: category == entry.key,
                            onSelected: (_) =>
                                setState(() => category = entry.key),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            PopupMenuButton<String>(
              tooltip: 'Sort products',
              icon: const Icon(Icons.sort),
              onSelected: (value) => setState(() => sort = value),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'name', child: Text('Name')),
                PopupMenuItem(
                  value: 'price-low',
                  child: Text('Price: low to high'),
                ),
                PopupMenuItem(
                  value: 'price-high',
                  child: Text('Price: high to low'),
                ),
                PopupMenuItem(value: 'rating', child: Text('Top rated')),
              ],
            ),
          ],
        ),
      ),
      Expanded(
        child: StreamBuilder<List<Product>>(
          stream: stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return const StatusView(
                'Could not load products. Check your connection.',
                icon: Icons.wifi_off,
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final products = filterProducts(
              snapshot.data!,
              search: search,
              category: category,
              sort: sort,
            );
            if (products.isEmpty) {
              return const StatusView('No products found. Try another search.');
            }
            return ProductGrid(
              products,
              onOpen: widget.onOpen,
              onAdd: widget.onAdd,
            );
          },
        ),
      ),
    ],
  );
}
