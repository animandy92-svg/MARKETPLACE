import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen(this.service, this.user, {super.key});
  final MarketplaceService service;
  final User user;
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late final stream = widget.service.orders(widget.user.uid);
  String? verifying;
  Future<void> verify(String reference) async {
    setState(() => verifying = reference);
    try {
      await widget.service.request(
        '/payments/verify/${Uri.encodeComponent(reference)}',
      );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Payment verified.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => verifying = null);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              child: Text(
                (widget.user.displayName?.isNotEmpty == true
                        ? widget.user.displayName!
                        : widget.user.email ?? 'U')
                    .substring(0, 1)
                    .toUpperCase(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.user.displayName ?? 'Your account',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(widget.user.email ?? ''),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Sign out',
              onPressed: () async {
                try {
                  await widget.service.auth.signOut();
                } catch (_) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Could not sign out. Please try again.'),
                      ),
                    );
                  }
                }
              },
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
      ),
      const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'Your orders',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
        ),
      ),
      Expanded(
        child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: stream,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return const StatusView(
                'Could not load your orders. Check your connection.',
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final orders = snapshot.data!.docs;
            if (orders.isEmpty) {
              return const StatusView(
                'Your next great find is waiting. Orders will appear here.',
                icon: Icons.receipt_long_outlined,
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              itemBuilder: (context, i) {
                final order = orders[i], data = order.data();
                final date = (data['created_at'] as Timestamp?)?.toDate();
                final reference = data['paystack_ref'] as String?;
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Order #${order.id.substring(0, 8)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(money(data['total'] as num? ?? 0)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${data['status'] ?? 'pending'}${date == null ? '' : ' · ${date.day}/${date.month}/${date.year}'}',
                        ),
                        const SizedBox(height: 8),
                        Text(data['shipping_address'] as String? ?? ''),
                        for (final item in data['items'] as List? ?? [])
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '${item['name']} × ${item['quantity']}',
                            ),
                          ),
                        if (data['status'] == 'pending' && reference != null)
                          TextButton(
                            onPressed: verifying == null
                                ? () => verify(reference)
                                : null,
                            child: Text(
                              verifying == reference
                                  ? 'Verifying…'
                                  : 'Verify payment',
                            ),
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
}
