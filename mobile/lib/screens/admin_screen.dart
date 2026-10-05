import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import 'dart:convert';

import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as image_codec;
import 'package:url_launcher/url_launcher.dart';

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
      await widget.service.db.runTransaction((tx) async {
        final ref = widget.service.db.collection('products').doc(product.id),
            snap = await tx.get(
              widget.service.db.collection('products').doc(product.id),
            );
        if ((snap.data()?['reserved'] as num? ?? 0) > 0) {
          throw Exception('Stock is reserved. Finish pending orders first.');
        }
        tx.update(ref, {
          'active': false,
          'status': 'hidden',
          'updated_at': FieldValue.serverTimestamp(),
        });
      });
      notice('Hidden from the storefront.');
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
      await widget.service.db.runTransaction((tx) async {
        final ref = widget.service.db.collection('products').doc(product.id),
            snap = await tx.get(
              widget.service.db.collection('products').doc(product.id),
            );
        if ((snap.data()?['reserved'] as num? ?? 0) > 0) {
          throw Exception('Stock is reserved');
        }
        tx.delete(ref);
      });
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
                  TextButton.icon(
                    onPressed: () async {
                      await launchUrl(
                        Uri.parse('${MarketplaceService.website}/admin'),
                        mode: LaunchMode.externalApplication,
                      );
                    },
                    icon: const Icon(Icons.open_in_new),
                    label: const Text(
                      'Open delivery, suppliers & order operations',
                    ),
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
                                    label: const Text('Hide'),
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
  const ListingEditor(
    this.service,
    this.product, {
    super.key,
    this.admin = true,
  });
  final MarketplaceService service;
  final Product? product;
  final bool admin;
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
  late String condition = widget.product?.condition ?? 'new';
  bool checked = false;
  Future<void> pickPhoto(ImageSource source) async {
    setState(() => busy = true);
    try {
      final file = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 75,
      );
      if (file == null) return;
      final decoded = image_codec.decodeImage(await file.readAsBytes());
      if (decoded == null) throw Exception('Could not read that photo');
      String? result;
      for (final quality in [75, 60, 45, 30]) {
        final candidate =
            'data:image/jpeg;base64,${base64Encode(image_codec.encodeJpg(decoded, quality: quality))}';
        if (candidate.length <= 460000) {
          result = candidate;
          break;
        }
      }
      if (result == null) throw Exception('Choose a smaller photo');
      if (mounted) setState(() => image.text = result!);
    } catch (e) {
      if (mounted) {
        setState(() => error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

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
    if (image.text.isEmpty || (widget.admin && !checked)) {
      setState(
        () => error = 'Add an actual product photo and confirm the checks.',
      );
      return;
    }
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
        'active': widget.admin && active,
        'status': widget.admin ? (active ? 'active' : 'hidden') : 'pending',
        'verified': widget.admin,
        'condition': condition,
        'seller_id': widget.service.auth.currentUser!.uid,
        'updated_at': FieldValue.serverTimestamp(),
      };
      final collection = widget.service.db.collection(
        widget.admin ? 'products' : 'listing_submissions',
      );
      final ref = widget.product == null
          ? collection.doc()
          : collection.doc(widget.product!.id);
      await widget.service.db.runTransaction((tx) async {
        final existing = (await tx.get(ref)).data();
        if (widget.admin && (existing?['reserved'] as num? ?? 0) > 0) {
          throw Exception('Stock is reserved. Finish pending orders first.');
        }
        tx.set(ref, {
          ...data,
          'seller_id': widget.admin
              ? (existing?['seller_id'] ?? widget.service.auth.currentUser!.uid)
              : widget.service.auth.currentUser!.uid,
          'rating': widget.admin ? (existing?['rating'] ?? 0) : 0,
          'review_count': widget.admin ? (existing?['review_count'] ?? 0) : 0,
          'review_sum': widget.admin ? (existing?['review_sum'] ?? 0) : 0,
          'created_at': existing?['created_at'] ?? FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      });
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
            const Text(
              'Actual product photo',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            if (image.text.isNotEmpty)
              SizedBox(
                height: 160,
                child: ProductImage(
                  Product.fromMap('preview', {'image': image.text}),
                ),
              ),
            Wrap(
              spacing: 10,
              children: [
                OutlinedButton.icon(
                  onPressed: busy ? null : () => pickPhoto(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Take photo'),
                ),
                OutlinedButton.icon(
                  onPressed: busy ? null : () => pickPhoto(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Choose photo'),
                ),
              ],
            ),
            const Text(
              'Photos are resized automatically. Show the actual item and any wear.',
              style: TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: condition,
              decoration: const InputDecoration(labelText: 'Condition'),
              items: const [
                DropdownMenuItem(value: 'new', child: Text('New')),
                DropdownMenuItem(value: 'like-new', child: Text('Like new')),
                DropdownMenuItem(value: 'used', child: Text('Used')),
              ],
              onChanged: (value) => setState(() => condition = value!),
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
            if (widget.admin)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Show this item for sale'),
                value: active,
                onChanged: (value) => setState(() => active = value),
              ),
            if (widget.admin)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'I checked stock, actual photo, condition, supplier reliability, and pricing.',
                ),
                value: checked,
                onChanged: (value) => setState(() => checked = value == true),
              ),
            if (error != null)
              Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: busy ? null : save,
              child: Text(
                busy
                    ? 'Saving…'
                    : widget.admin
                    ? 'Save checked item'
                    : 'Submit for review',
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
