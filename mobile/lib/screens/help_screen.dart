import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen(this.service, {super.key});
  final MarketplaceService service;
  Future<void> open(BuildContext context, String url) async {
    try {
      if (!await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      )) {
        throw Exception();
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Could not open this link. Call 0594081604 for support.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('A little help')),
    body: StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: service.settings(),
      builder: (context, snapshot) {
        final settings = snapshot.data?.data() ?? {},
            phone = settings['supportPhone'] as String? ?? '0594081604',
            email = settings['supportEmail'] as String? ?? '';
        final zones = settings['deliveryZones'] as List? ?? [],
            digits = phone.replaceAll(RegExp(r'\D'), '');
        final whatsapp = digits.startsWith('0')
            ? '233${digits.substring(1)}'
            : digits;
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'A little help. A lot of care.',
              style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'Talk to a real person about products, delivery, or returns. Include your order number.',
            ),
            const SizedBox(height: 20),
            if (phone.isNotEmpty) ...[
              FilledButton.icon(
                onPressed: () => open(context, 'tel:$phone'),
                icon: const Icon(Icons.phone_outlined),
                label: Text('Call $phone'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => open(context, 'https://wa.me/$whatsapp'),
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Message support on WhatsApp'),
              ),
            ],
            if (email.isNotEmpty)
              TextButton.icon(
                onPressed: () => open(context, 'mailto:$email'),
                icon: const Icon(Icons.email_outlined),
                label: Text(email),
              ),
            if ((settings['supportHours'] as String? ?? '').isNotEmpty)
              Text('Support hours: ${settings['supportHours']}'),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Join our WhatsApp community',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Marketplace updates and conversations. For an order problem, contact support directly.',
                    ),
                    TextButton.icon(
                      onPressed: () =>
                          open(context, MarketplaceService.communityUrl),
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('Join the group'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Delivery in ${settings['serviceArea'] ?? 'Ghana'}',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (zones.isEmpty)
              const Text(
                'Our Ghana pilot is being prepared. Delivery areas, charges, and timing will be published before online checkout opens.',
              ),
            for (final zone in zones)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.local_shipping_outlined),
                title: Text(zone['name'] as String),
                subtitle: Text(zone['timing'] as String),
                trailing: Text(money(zone['fee'] as num)),
              ),
            const SizedBox(height: 24),
            const Text(
              'Returns & refunds',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              'Request help within ${settings['returnDays'] ?? 7} days of delivery.',
            ),
            const SizedBox(height: 12),
            Text(
              settings['returnTerms'] as String? ?? 'Contact support for an incorrect, damaged, or misdescribed item. Keep the item and packaging. Support will confirm return and refund arrangements before you send it back.',
            ),
            const SizedBox(height: 12),
            const Text(
              'Approved refunds go through the original payment provider. Your order shows pending and confirmed refund updates. Processing time depends on the provider.',
            ),
          ],
        );
      },
    ),
  );
}
