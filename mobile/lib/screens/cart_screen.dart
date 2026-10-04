import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen(
    this.service,
    this.uid, {
    super.key,
    required this.onOrdered,
  });
  final MarketplaceService service;
  final String uid;
  final VoidCallback onOrdered;
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  late final stream = widget.service.cart(widget.uid);
  Future<void> update(Product product, int quantity) async {
    try {
      await widget.service.quantity(product, quantity);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => StreamBuilder<List<CartLine>>(
    stream: stream,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return const StatusView(
          'Could not load your cart. Check your connection.',
        );
      }
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final lines = snapshot.data!;
      if (lines.isEmpty) {
        return const StatusView(
          'Your cart is empty. Discover something you love.',
        );
      }
      final total = lines.fold<double>(0, (sum, line) => sum + line.total);
      return Column(
        children: [
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: lines.length,
              separatorBuilder: (_, i) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final line = lines[i];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 72,
                          height: 84,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: ProductImage(line.product),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                line.product.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(money(line.total)),
                              Row(
                                children: [
                                  IconButton(
                                    tooltip: 'Decrease quantity',
                                    onPressed: () =>
                                        update(line.product, line.quantity - 1),
                                    icon: const Icon(Icons.remove),
                                  ),
                                  Text('${line.quantity}'),
                                  IconButton(
                                    tooltip: 'Increase quantity',
                                    onPressed: () =>
                                        update(line.product, line.quantity + 1),
                                    icon: const Icon(Icons.add),
                                  ),
                                  const Spacer(),
                                  IconButton(
                                    tooltip: 'Remove item',
                                    onPressed: () => update(line.product, 0),
                                    icon: const Icon(Icons.delete_outline),
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
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal'),
                      Text(
                        money(total),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () async {
                        final ordered = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                CheckoutScreen(widget.service, lines),
                          ),
                        );
                        if (ordered == true && mounted) widget.onOrdered();
                      },
                      child: const Text('Continue to checkout'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    },
  );
}
