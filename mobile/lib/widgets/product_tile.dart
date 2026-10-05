import 'package:flutter/material.dart';

import 'dart:convert';

import '../models/product.dart';

class ProductImage extends StatelessWidget {
  const ProductImage(this.product, {super.key});
  final Product product;
  @override
  Widget build(BuildContext context) => product.image.isEmpty
      ? const Center(child: Icon(Icons.devices, size: 48))
      : product.image.startsWith('data:image/jpeg;base64,')
      ? Image.memory(
          base64Decode(product.image.split(',').last),
          fit: BoxFit.cover,
          width: double.infinity,
          errorBuilder: (_, error, stack) =>
              const Center(child: Icon(Icons.devices, size: 48)),
        )
      : Image.network(
          product.image,
          fit: BoxFit.cover,
          width: double.infinity,
          errorBuilder: (_, error, stack) =>
              const Center(child: Icon(Icons.devices, size: 48)),
          loadingBuilder: (_, child, progress) => progress == null
              ? child
              : const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
}

class ProductTile extends StatelessWidget {
  const ProductTile({
    super.key,
    required this.product,
    required this.onOpen,
    required this.onAdd,
  });
  final Product product;
  final VoidCallback onOpen, onAdd;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onOpen,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ColoredBox(
              color: const Color(0xfff0f0f7),
              child: ProductImage(product),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  product.reviewCount > 0
                      ? '★ ${product.rating.toStringAsFixed(1)} · ${product.reviewCount} verified reviews'
                      : 'No reviews yet',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 6),
                Text(
                  product.verified
                      ? (product.stock > 0
                            ? '${product.stock} in stock'
                            : 'Sold out')
                      : 'Awaiting stock check',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        money(product.price),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    IconButton.filledTonal(
                      onPressed: product.verified && product.stock > 0
                          ? onAdd
                          : null,
                      tooltip: 'Add to cart',
                      icon: const Icon(Icons.add_shopping_cart, size: 19),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class StatusView extends StatelessWidget {
  const StatusView(
    this.message, {
    super.key,
    this.icon = Icons.shopping_bag_outlined,
    this.action,
  });
  final String message;
  final IconData icon;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          if (action != null) ...[const SizedBox(height: 20), action!],
        ],
      ),
    ),
  );
}
