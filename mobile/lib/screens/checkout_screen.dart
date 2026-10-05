import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';
import 'help_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen(this.service, this.lines, {super.key});
  final MarketplaceService service;
  final List<CartLine> lines;
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final address = TextEditingController(), phone = TextEditingController();
  bool busy = false, ready = false, payments = false, testMode = false;
  String? error, reference, zone, lastBody;
  String checkoutId =
      'mobile_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1000000)}';
  Map<String, dynamic> settings = {}, quote = {};
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    address.dispose();
    phone.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final config =
          (await widget.service.db.doc('shop/settings').get()).data() ?? {};
      final health = await widget.service.request('/health');
      if (mounted) {
        setState(() {
          settings = config;
          payments = health['paymentsEnabled'] == true;
          testMode = health['paymentMode'] == 'test';
          ready = true;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => error = 'Online checkout is being prepared. Contact support on 0594081604.',
        );
      }
    }
  }

  Map<String, dynamic> body() => {
    'items': widget.lines.map((line) => line.toRequest()).toList(),
    'shippingAddress': address.text.trim(),
    'phone': phone.text.trim(),
    'deliveryZone': zone,
  };
  Future<void> checkQuote() async {
    if (address.text.trim().length < 5 ||
        phone.text.trim().length < 7 ||
        zone == null) {
      setState(
        () => error =
            'Choose a delivery area and enter your full address and phone.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.service.request('/orders/quote', body());
      if (mounted) setState(() => quote = data);
    } catch (e) {
      if (mounted) {
        setState(() => error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final current = jsonEncode(body());
      if (lastBody != null && lastBody != current) {
        checkoutId =
            'mobile_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1000000)}';
      }
      lastBody = current;
      final data = await widget.service.request('/payments/initialize', {
        ...body(),
        'checkoutId': checkoutId,
        'acquisitionSource': 'android-app',
      });
      if (data['paid'] == true) {
        if (mounted) Navigator.pop(context, true);
        return;
      }
      reference = data['reference'] as String;
      final uri = Uri.parse(data['authorization_url'] as String);
      if (uri.scheme != 'https' ||
          uri.host != 'checkout.paystack.com' ||
          !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception(
          'Could not open payment. You can continue from order history on the website.',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> verify() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.service.request(
        '/payments/verify/${Uri.encodeComponent(reference!)}',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result['status'] == 'payment_review'
                  ? 'Payment received. Support will arrange your refund.'
                  : 'Payment confirmed. Follow your order in your account.',
            ),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final zones = settings['deliveryZones'] as List? ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Let’s get it to you')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          ...widget.lines.map(
            (line) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(line.product.name),
              subtitle: Text('Quantity: ${line.quantity}'),
              trailing: Text(money(line.total)),
            ),
          ),
          const Divider(height: 32),
          DropdownButtonFormField<String>(
            initialValue: zone,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Delivery area'),
            items: zones
                .map(
                  (z) => DropdownMenuItem(
                    value: z['id'] as String,
                    child: Text('${z['name']} · ${money(z['fee'] as num)}'),
                  ),
                )
                .toList(),
            onChanged: reference != null
                ? null
                : (value) => setState(() {
                    zone = value;
                    quote = {};
                  }),
          ),
          if (zone != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                zones.firstWhere((z) => z['id'] == zone)['timing'] as String,
              ),
            ),
          const SizedBox(height: 16),
          TextField(
            controller: address,
            maxLength: 1000,
            maxLines: 3,
            enabled: reference == null && !busy,
            onChanged: (_) => setState(() => quote = {}),
            decoration: const InputDecoration(
              labelText: 'Full address and landmark',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: phone,
            maxLength: 30,
            keyboardType: TextInputType.phone,
            enabled: reference == null && !busy,
            onChanged: (_) => setState(() => quote = {}),
            decoration: const InputDecoration(
              labelText: 'Delivery contact phone',
            ),
          ),
          if (!ready || !payments || zones.isEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Online checkout is being prepared. Delivery fees and timing must be confirmed before payment.',
            ),
          ],
          if (error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (ready && payments && zones.isNotEmpty && reference == null)
            OutlinedButton(
              onPressed: busy ? null : checkQuote,
              child: const Text('Check live stock & total'),
            ),
          if (quote.isNotEmpty) ...[
            for (final entry in {
              'Items': quote['subtotal'],
              'Tax': quote['tax'],
              'Delivery': quote['delivery'],
              'Total': quote['total'],
            }.entries)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(entry.key),
                trailing: Text(money(entry.value as num)),
              ),
          ],
          if (testMode && payments)
            const Text('Test payment mode · provider test details only'),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: busy || !ready || !payments || zones.isEmpty
                ? null
                : reference != null
                ? verify
                : quote.isEmpty
                ? null
                : submit,
            icon: const Icon(Icons.phone_android),
            label: Text(
              busy
                  ? 'Please wait…'
                  : reference != null
                  ? 'Check payment'
                  : 'Pay with mobile money or card',
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Pay securely with Paystack in your browser. Approve mobile money on your phone, then return here. Stock is held for 30 minutes while you pay; pending authorizations may take longer.',
          ),
          TextButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => HelpScreen(widget.service)),
            ),
            child: const Text('Delivery, returns & support'),
          ),
          if (!ready)
            TextButton(
              onPressed: busy ? null : load,
              child: const Text('Check service again'),
            ),
        ],
      ),
    );
  }
}
