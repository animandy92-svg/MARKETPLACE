import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';
import '../widgets/product_tile.dart';
import 'help_screen.dart';

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
  Future<void> orderAction(String id, Map<String, dynamic> body) async {
    setState(() => verifying = id);
    try {
      await widget.service.request('/orders/$id/action', body);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your order was updated.')),
        );
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

  Future<void> help(String id) async {
    String message = '';
    final result = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, change) => AlertDialog(
          title: const Text('Ask for help or a return'),
          content: TextField(
            maxLength: 2000,
            maxLines: 4,
            onChanged: (value) => change(() => message = value),
            decoration: const InputDecoration(hintText: 'Describe the problem'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: message.trim().length < 5
                  ? null
                  : () => Navigator.pop(context, message.trim()),
              child: const Text('Send request'),
            ),
          ],
        ),
      ),
    );
    if (result != null) {
      await orderAction(id, {'action': 'help', 'message': result});
    }
  }

  Future<void> review(String id, List<dynamic> items) async {
    if (items.isEmpty) return;
    int rating = 5;
    String comment = '', productId = items.first['product_id'] as String;
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, change) => AlertDialog(
          title: const Text('Review your delivered purchase'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: productId,
                  isExpanded: true,
                  items: items
                      .map(
                        (line) => DropdownMenuItem(
                          value: line['product_id'] as String,
                          child: Text(line['name'] as String),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => change(() => productId = value!),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<int>(
                  initialValue: rating,
                  items: [
                    for (final n in [5, 4, 3, 2, 1])
                      DropdownMenuItem(value: n, child: Text('$n stars')),
                  ],
                  onChanged: (value) => change(() => rating = value!),
                ),
                const SizedBox(height: 16),
                TextField(
                  maxLength: 1000,
                  maxLines: 3,
                  onChanged: (value) => change(() => comment = value),
                  decoration: const InputDecoration(
                    hintText: 'How was the item?',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: comment.trim().length < 3
                  ? null
                  : () => Navigator.pop(context, {
                      'productId': productId,
                      'rating': rating,
                      'comment': comment.trim(),
                    }),
              child: const Text('Publish review'),
            ),
          ],
        ),
      ),
    );
    if (result == null) return;
    try {
      await widget.service.request('/reviews/${result['productId']}', {
        'orderId': id,
        'rating': result['rating'],
        'comment': result['comment'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verified purchase review published.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

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
                  await widget.service.signOut();
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
                        if (data['delivery_zone'] != null)
                          Text(
                            '${data['delivery_zone']} · ${data['delivery_timing'] ?? ''}',
                          ),
                        if (data['delivery_note'] != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'Update from the team: ${data['delivery_note']}',
                            ),
                          ),
                        if (data['refund_status'] != null)
                          Text('Refund: ${data['refund_status']}'),
                        for (final entry in data['history'] as List? ?? [])
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              '${entry['status']} · ${entry['note']}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
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
                        Wrap(
                          spacing: 8,
                          children: [
                            if (data['status'] == 'pending' &&
                                data['inventory_state'] == 'reserved')
                              TextButton(
                                onPressed: verifying == null
                                    ? () => orderAction(order.id, {
                                        'action': 'cancel',
                                      })
                                    : null,
                                child: const Text('Cancel unpaid order'),
                              ),
                            TextButton(
                              onPressed: verifying == null
                                  ? () => help(order.id)
                                  : null,
                              child: const Text('Help / return request'),
                            ),
                            TextButton(
                              onPressed: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => HelpScreen(widget.service),
                                ),
                              ),
                              child: const Text('Contact support'),
                            ),
                            if (data['status'] == 'delivered')
                              TextButton(
                                onPressed: () => review(
                                  order.id,
                                  data['items'] as List? ?? [],
                                ),
                                child: const Text('Review purchase'),
                              ),
                          ],
                        ),
                        if (data['help_request'] != null)
                          Text(
                            'Your help request is ${data['help_status'] ?? 'open'}.',
                            style: Theme.of(context).textTheme.bodySmall,
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
