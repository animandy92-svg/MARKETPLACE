import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../models/categories.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen(this.service, {super.key});
  final MarketplaceService service;
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  late final stream = widget.service.db.collection('products').snapshots();
  late Future<bool> access = allowed();
  String search = '';
  Future<bool> allowed() async =>
      (await widget.service.auth.currentUser?.getIdTokenResult(true))
          ?.claims?['admin'] ==
      true;
  void notice(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> sold(Product product) async {
    try {
      await widget.service.db.collection('products').doc(product.id).update({
        'active': false,
        'status': 'sold',
        'stock': 0,
        'updated_at': FieldValue.serverTimestamp(),
      });
      notice('Marked sold and removed from the storefront.');
    } catch (_) {
      notice('Could not update this item.');
    }
  }

  Future<void> remove(Product product) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove item?'),
        content: Text(
          'Remove ${product.name} from the marketplace? This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (approved != true) return;
    try {
      await widget.service.db.collection('products').doc(product.id).delete();
      notice('Item removed.');
    } catch (_) {
      notice('Could not remove this item.');
    }
  }

  void edit([Product? product]) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => ListingEditor(widget.service, product)),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Admin panel')),
    body: FutureBuilder<bool>(
      future: access,
      builder: (context, allowed) {
        if (allowed.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (allowed.data != true) {
          return StatusView(
            'This account needs an approved admin role to manage listings.',
            icon: Icons.admin_panel_settings,
            action: FilledButton(
              onPressed: () => setState(() => access = this.allowed()),
              child: const Text('Refresh access'),
            ),
          );
        }
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Manage your marketplace',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Add, edit, and remove goods across the website and app.',
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    onChanged: (value) => setState(() => search = value),
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search listings',
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: () => edit(),
                    icon: const Icon(Icons.add),
                    label: const Text('Add item'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
                stream: stream,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return const StatusView(
                      'Could not load listings. Please try again.',
                    );
                  }
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final products = snapshot.data!.docs
                      .map((doc) => Product.fromMap(doc.id, doc.data()))
                      .where(
                        (product) => product.name.toLowerCase().contains(
                          search.toLowerCase(),
                        ),
                      )
                      .toList();
                  if (products.isEmpty) {
                    return const StatusView(
                      'No items found. Add your first listing above.',
                    );
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: products.length,
                    itemBuilder: (context, i) {
                      final product = products[i];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  SizedBox(
                                    width: 64,
                                    height: 64,
                                    child: ProductImage(product),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '${money(product.price)} · ${product.stock} available',
                                        ),
                                        Text(
                                          product.active
                                              ? 'For sale'
                                              : 'Hidden / sold',
                                          style: TextStyle(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .primary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                children: [
                                  TextButton.icon(
                                    onPressed: () => edit(product),
                                    icon: const Icon(Icons.edit_outlined),
                                    label: const Text('Edit'),
                                  ),
                                  TextButton.icon(
                                    onPressed: product.active
                                        ? () => sold(product)
                                        : null,
                                    icon: const Icon(
                                      Icons.check_circle_outline,
                                    ),
                                    label: const Text('Sold'),
                                  ),
                                  TextButton.icon(
                                    onPressed: () => remove(product),
                                    icon: const Icon(Icons.delete_outline),
                                    label: const Text('Remove'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    ),
  );
}

class ListingEditor extends StatefulWidget {
  const ListingEditor(this.service, this.product, {super.key});
  final MarketplaceService service;
  final Product? product;
  @override
  State<ListingEditor> createState() => _ListingEditorState();
}

class _ListingEditorState extends State<ListingEditor> {
  final form = GlobalKey<FormState>();
  late final name = TextEditingController(text: widget.product?.name);
  late final price = TextEditingController(
    text: widget.product?.price.toString(),
  );
  late final stock = TextEditingController(
    text: widget.product?.stock.toString() ?? '1',
  );
  late final description = TextEditingController(
    text: widget.product?.description,
  );
  late final image = TextEditingController(text: widget.product?.image);
  late final specs = TextEditingController(
    text: widget.product?.specs.join('\n'),
  );
  late String category = widget.product?.category ?? 'fashion';
  late bool active = widget.product?.active ?? true;
  bool busy = false;
  String? error;
  @override
  void dispose() {
    for (final controller in [name, price, stock, description, image, specs]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = <String, dynamic>{
        'name': name.text.trim(),
        'category': category,
        'price': double.parse(price.text),
        'stock': int.parse(stock.text),
        'description': description.text.trim(),
        'image': image.text.trim(),
        'specs': specs.text
            .split('\n')
            .map((spec) => spec.trim())
            .where((spec) => spec.isNotEmpty)
            .toList(),
        'active': active,
        'status': active ? 'active' : 'sold',
        'updated_at': FieldValue.serverTimestamp(),
      };
      if (widget.product == null) {
        await widget.service.db.collection('products').add({
          ...data,
          'rating': 0,
          'created_at': FieldValue.serverTimestamp(),
        });
      } else {
        await widget.service.db
            .collection('products')
            .doc(widget.product!.id)
            .update(data);
      }
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Could not save this listing. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.product == null ? 'Add item' : 'Edit item'),
    ),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: name,
              maxLength: 180,
              decoration: const InputDecoration(labelText: 'Item name'),
              validator: (value) =>
                  (value?.trim().isEmpty ?? true) ? 'Enter an item name' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: category,
              decoration: const InputDecoration(labelText: 'Category'),
              isExpanded: true,
              items: [
                if (!categories.containsKey(category))
                  DropdownMenuItem(value: category, child: Text(category)),
                ...categories.entries
                    .where((entry) => entry.key != 'all')
                    .map(
                      (entry) => DropdownMenuItem(
                        value: entry.key,
                        child: Text(entry.value),
                      ),
                    ),
              ],
              onChanged: (value) => setState(() => category = value!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: price,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Price (Ghana cedis)',
              ),
              validator: (value) {
                final amount = double.tryParse(value ?? '');
                return amount == null || !amount.isFinite || amount <= 0
                    ? 'Enter a valid price'
                    : null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: stock,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Quantity available',
              ),
              validator: (value) {
                final quantity = int.tryParse(value ?? '');
                return quantity == null || quantity < 0
                    ? 'Enter a whole number, zero or more'
                    : null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: description,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                alignLabelWithHint: true,
              ),
              validator: (value) => (value?.trim().isEmpty ?? true)
                  ? 'Enter a description'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: image,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Image URL (optional)',
                hintText: 'https://…',
              ),
              validator: (value) =>
                  value != null &&
                      value.isNotEmpty &&
                      Uri.tryParse(value)?.scheme != 'https'
                  ? 'Use an HTTPS image URL'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: specs,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Item details (one per line)',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Show this item for sale'),
              value: active,
              onChanged: (value) => setState(() => active = value),
            ),
            if (error != null)
              Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: busy ? null : save,
              child: Text(busy ? 'Saving…' : 'Save item'),
            ),
          ],
        ),
      ),
    ),
  );
}
