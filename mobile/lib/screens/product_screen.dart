import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../models/categories.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';

class ProductScreen extends StatelessWidget {
  const ProductScreen(
    this.product,
    this.service, {
    super.key,
    required this.onAdd,
    required this.onSave,
  });
  final Product product;
  final MarketplaceService service;
  final Future<void> Function(Product) onAdd;
  final Future<void> Function(Product, bool) onSave;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Product details'),
      actions: [
        if (service.auth.currentUser != null)
          StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
            stream: service
                .userCollection(service.auth.currentUser!.uid, 'wishlist')
                .doc(product.id)
                .snapshots(),
            builder: (context, snapshot) {
              final saved = snapshot.data?.exists ?? false;
              return IconButton(
                tooltip: saved ? 'Remove from saved items' : 'Save product',
                onPressed: () => onSave(product, !saved),
                icon: Icon(saved ? Icons.favorite : Icons.favorite_border),
              );
            },
          )
        else
          IconButton(
            tooltip: 'Save product',
            onPressed: () => onSave(product, true),
            icon: const Icon(Icons.favorite_border),
          ),
      ],
    ),
    body: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 310,
            child: ColoredBox(
              color: const Color(0xfff0f0f7),
              child: ProductImage(product),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (categories[product.category] ?? product.category)
                      .toUpperCase(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  product.name,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 12),
                Text(
                  money(product.price),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  product.reviewCount > 0
                      ? '★ ${product.rating.toStringAsFixed(1)} · ${product.reviewCount} verified reviews'
                      : 'No reviews yet',
                ),
                const SizedBox(height: 8),
                Text(
                  'Condition: ${product.condition.replaceAll('-', ' ')} · ${product.stock} available',
                ),
                const SizedBox(height: 24),
                Text(
                  product.description,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 24),
                ...product.specs.map(
                  (spec) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 18,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(spec)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: product.verified && product.stock > 0
              ? () => onAdd(product)
              : null,
          icon: const Icon(Icons.add_shopping_cart),
          label: Text(
            !product.verified
                ? 'Awaiting stock check'
                : product.stock > 0
                ? 'Add to cart'
                : 'Out of stock',
          ),
        ),
      ),
    ),
  );
}
