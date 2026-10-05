import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../services/marketplace_service.dart';
import '../models/product.dart';
import '../models/categories.dart';
import '../widgets/product_tile.dart';
import 'admin_screen.dart';

class SellerScreen extends StatefulWidget {
  const SellerScreen(this.service, {super.key});
  final MarketplaceService service;
  @override
  State<SellerScreen> createState() => _SellerScreenState();
}

class _SellerScreenState extends State<SellerScreen> {
  late final uid = widget.service.auth.currentUser!.uid;
  late final profile = widget.service.db
      .doc('seller_profiles/$uid')
      .snapshots();
  late Future<Map<String, dynamic>> orders = widget.service.request(
    '/seller/dashboard',
  );
  void edit([Product? product]) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => ListingEditor(widget.service, product, admin: false),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Seller workspace')),
    body: StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: profile,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.data?.data()?['status'] != 'approved') {
          return SellerApplication(
            widget.service,
            status: snapshot.data?.data()?['status'] as String?,
          );
        }
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Hello, ${snapshot.data?.data()?['name'] ?? 'supplier'}.',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            const Text(
              'Submit actual photos, stock, and honest item details. Changes go through a listing check before publication.',
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => edit(),
              icon: const Icon(Icons.add),
              label: const Text('Add a find'),
            ),
            const SizedBox(height: 24),
            const Text(
              'Your listing submissions',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: widget.service.db
                  .collection('listing_submissions')
                  .where('seller_id', isEqualTo: uid)
                  .snapshots(),
              builder: (context, drafts) {
                if (!drafts.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Loading submissions…'),
                  );
                }
                return Column(
                  children: [
                    for (final doc in drafts.data!.docs)
                      Card(
                        child: ListTile(
                          leading: SizedBox(
                            width: 48,
                            height: 48,
                            child: ProductImage(
                              Product.fromMap(doc.id, doc.data()),
                            ),
                          ),
                          title: Text(doc.data()['name'] as String),
                          subtitle: Text(
                            '${doc.data()['status']} · ${doc.data()['stock']} submitted stock',
                          ),
                          trailing: IconButton(
                            tooltip: 'Edit submission',
                            onPressed: () =>
                                edit(Product.fromMap(doc.id, doc.data())),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                        ),
                      ),
                    if (drafts.data!.docs.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('Add your first item above.'),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            const Text(
              'Published listings',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
              stream: widget.service.db
                  .collection('products')
                  .where('seller_id', isEqualTo: uid)
                  .snapshots(),
              builder: (context, listings) => Column(
                children: [
                  for (final doc in listings.data?.docs ?? [])
                    Card(
                      child: ListTile(
                        title: Text(doc.data()['name'] as String),
                        subtitle: Text(
                          '${money(doc.data()['price'] as num)} · ${doc.data()['stock']} available',
                        ),
                        trailing: IconButton(
                          tooltip: 'Submit an inventory update',
                          onPressed: () =>
                              edit(Product.fromMap(doc.id, doc.data())),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Orders to prepare',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  tooltip: 'Refresh orders',
                  onPressed: () => setState(
                    () => orders = widget.service.request('/seller/dashboard'),
                  ),
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            FutureBuilder<Map<String, dynamic>>(
              future: orders,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return const Text(
                    'Order handling opens when the payment API is deployed. Listings and applications work now.',
                  );
                }
                if (!snapshot.hasData) return const Text('Checking orders…');
                final entries = snapshot.data!['orders'] as List? ?? [];
                return Column(
                  children: [
                    if (entries.isEmpty)
                      const Text('No paid orders to prepare yet.'),
                    for (final order in entries)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Order #${(order['id'] as String).substring(0, 8)} · ${order['status']}',
                              ),
                              for (final line in order['items'] as List)
                                Text('${line['name']} × ${line['quantity']}'),
                              TextButton(
                                onPressed:
                                    order['ready'] == true ||
                                        ![
                                          'paid',
                                          'processing',
                                        ].contains(order['status'])
                                    ? null
                                    : () async {
                                        try {
                                          await widget.service.request(
                                            '/seller/ready',
                                            {
                                              'orderId': order['id'],
                                              'customerId': order['uid'],
                                            },
                                          );
                                          if (mounted) {
                                            setState(
                                              () => orders = widget.service
                                                  .request('/seller/dashboard'),
                                            );
                                          }
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                                  SnackBar(
                                                    content: Text(e.toString()),
                                                  ),
                                                );
                                          }
                                        }
                                      },
                                child: Text(
                                  order['ready'] == true
                                      ? 'Ready for collection'
                                      : 'Mark ready for collection',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        );
      },
    ),
  );
}

class SellerApplication extends StatefulWidget {
  const SellerApplication(this.service, {super.key, this.status});
  final MarketplaceService service;
  final String? status;
  @override
  State<SellerApplication> createState() => _SellerApplicationState();
}

class _SellerApplicationState extends State<SellerApplication> {
  final name = TextEditingController(),
      phone = TextEditingController(),
      description = TextEditingController();
  String category = 'phone';
  bool busy = false, submitted = false;
  String? error;
  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (name.text.trim().isEmpty ||
        phone.text.trim().isEmpty ||
        description.text.trim().isEmpty) {
      setState(
        () => error = 'Complete your name, phone, and product description.',
      );
      return;
    }
    setState(() => busy = true);
    try {
      final user = widget.service.auth.currentUser!;
      await widget.service.db
          .collection('users')
          .doc(user.uid)
          .collection('seller_requests')
          .add({
            'fullName': name.text.trim(),
            'phone': phone.text.trim(),
            'description': description.text.trim(),
            'category': category,
            'email': user.email,
            'user_id': user.uid,
            'status': 'pending',
            'created_at': FieldValue.serverTimestamp(),
          });
      if (mounted) setState(() => submitted = true);
    } catch (_) {
      if (mounted) {
        setState(
          () => error = 'Could not submit the application. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => submitted
      ? const StatusView(
          'Application received. The team will review it before enabling your workspace.',
          icon: Icons.check_circle_outline,
        )
      : ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Join our supplier shortlist',
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              widget.status == null
                  ? 'Tell us about your goods. Suppliers and listings are reviewed before going live.'
                  : 'Your supplier status: ${widget.status}. Contact support if you need help.',
            ),
            const SizedBox(height: 20),
            TextField(
              controller: name,
              maxLength: 120,
              decoration: const InputDecoration(labelText: 'Full name'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: phone,
              maxLength: 40,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone number'),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: category,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Main product category',
              ),
              items: categories.entries
                  .where((e) => e.key != 'all')
                  .map(
                    (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                  )
                  .toList(),
              onChanged: (value) => setState(() => category = value!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: description,
              maxLength: 3000,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'What would you like to sell?',
                alignLabelWithHint: true,
              ),
            ),
            if (error != null) Text(error!),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: busy ? null : submit,
              child: Text(busy ? 'Submitting…' : 'Submit supplier application'),
            ),
          ],
        );
}
