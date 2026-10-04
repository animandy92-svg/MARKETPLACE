import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/product.dart';
import '../services/marketplace_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen(this.service, this.lines, {super.key});
  final MarketplaceService service;
  final List<CartLine> lines;
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final address = TextEditingController();
  bool busy = false, ready = false, payments = false;
  String? error, reference;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    address.dispose();
    super.dispose();
  }

  Future<void> load() async {
    try {
      final data = await widget.service.request('/health');
      if (mounted) {
        setState(() {
          payments = data['paymentsEnabled'] == true;
          ready = true;
          error = null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Checkout is unavailable. Please try again.');
      }
    }
  }

  Future<void> submit() async {
    if (address.text.trim().length < 5) {
      setState(() => error = 'Enter your full shipping address.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final body = {
        'items': widget.lines.map((line) => line.toRequest()).toList(),
        'shippingAddress': address.text.trim(),
      };
      if (payments) {
        final data = await widget.service.request('/payments/initialize', body);
        reference = data['reference'] as String;
        final uri = Uri.parse(data['authorization_url'] as String);
        if (uri.scheme != 'https' ||
            !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          throw Exception('Could not open the payment page.');
        }
      } else {
        await widget.service.request('/orders', body);
        await widget.service.clearCart();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Unpaid order request submitted.')),
          );
          Navigator.pop(context, true);
        }
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
      await widget.service.request(
        '/payments/verify/${Uri.encodeComponent(reference!)}',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment verified. Your order is confirmed.'),
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
    final subtotal = widget.lines.fold<double>(
      0,
      (sum, line) => sum + line.total,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
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
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Subtotal'),
              trailing: Text(money(subtotal)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Tax (10%)'),
              trailing: Text(money(subtotal * .1)),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Estimated total'),
              trailing: Text(money(subtotal * 1.1)),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: address,
              maxLines: 3,
              enabled: reference == null && !busy,
              autofillHints: const [AutofillHints.fullStreetAddress],
              decoration: const InputDecoration(
                labelText: 'Shipping address',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              payments
                  ? 'Pay securely in your browser, then return here to verify your payment.'
                  : 'Submit an unpaid order request. Payment will be arranged after confirmation.',
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            if (!ready && error != null)
              TextButton(onPressed: load, child: const Text('Try again')),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: !ready || busy
                  ? null
                  : reference == null
                  ? submit
                  : verify,
              child: Text(
                busy
                    ? 'Please wait…'
                    : reference != null
                    ? 'I have paid — verify payment'
                    : payments
                    ? 'Continue to payment'
                    : 'Submit unpaid order',
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Final prices and availability are checked by the marketplace when you submit.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
