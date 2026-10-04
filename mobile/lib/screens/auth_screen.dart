import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../services/marketplace_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen(this.service, {super.key});
  final MarketplaceService service;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(),
      password = TextEditingController(),
      name = TextEditingController();
  bool register = false, busy = false;
  String? error;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    name.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      if (register) {
        await widget.service.signUp(email.text, password.text, name.text);
      } else {
        await widget.service.signIn(email.text, password.text);
      }
      if (mounted) Navigator.pop(context, true);
    } on FirebaseAuthException catch (e) {
      if (mounted) setState(() => error = e.message ?? 'Could not sign in.');
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Could not connect. Please try again.');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> resetPassword() async {
    if (!email.text.contains('@')) {
      setState(() => error = 'Enter your email address first.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.service.auth.sendPasswordResetEmail(
        email: email.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password reset email sent.')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => error = 'Could not send the email. Please try again.');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(register ? 'Create account' : 'Welcome back')),
    body: Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Form(
            key: form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  Icons.storefront,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 24),
                Text(
                  register
                      ? 'Find your next favorite thing.'
                      : 'Your marketplace, wherever you go.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 28),
                if (register) ...[
                  TextFormField(
                    controller: name,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    textCapitalization: TextCapitalization.words,
                    validator: (v) =>
                        (v?.trim().isEmpty ?? true) ? 'Enter your name' : null,
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  validator: (v) =>
                      !RegExp(r'^\S+@\S+\.\S+$').hasMatch(v?.trim() ?? '')
                      ? 'Enter a valid email'
                      : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                  autofillHints: [
                    register
                        ? AutofillHints.newPassword
                        : AutofillHints.password,
                  ],
                  validator: (v) =>
                      (v?.length ?? 0) < 6 ? 'Use at least 6 characters' : null,
                  onFieldSubmitted: (_) {
                    if (!busy) submit();
                  },
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: busy ? null : submit,
                  child: Text(
                    busy
                        ? 'Please wait…'
                        : register
                        ? 'Create account'
                        : 'Sign in',
                  ),
                ),
                TextButton(
                  onPressed: busy
                      ? null
                      : () => setState(() {
                          register = !register;
                          error = null;
                        }),
                  child: Text(
                    register
                        ? 'Already have an account? Sign in'
                        : 'Create an account',
                  ),
                ),
                if (!register)
                  TextButton(
                    onPressed: busy ? null : resetPassword,
                    child: const Text('Forgot password?'),
                  ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
