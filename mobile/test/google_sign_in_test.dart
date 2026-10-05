import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:marketplace/screens/auth_screen.dart';
import 'package:marketplace/services/marketplace_service.dart';

class TestAuth extends Fake implements FirebaseAuth {}

class TestFirestore extends Fake implements FirebaseFirestore {}

class TestMarketplace extends MarketplaceService {
  TestMarketplace(this.googleAction)
    : super(auth: TestAuth(), db: TestFirestore());
  final Future<void> Function() googleAction;
  int googleAttempts = 0;

  @override
  Future<void> signInWithGoogle() async {
    googleAttempts++;
    await googleAction();
  }
}

Future<void> openAuth(WidgetTester tester, TestMarketplace service) async {
  await tester.pumpWidget(MaterialApp(home: AuthScreen(service)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'Google sign-in works from registration without email form validation',
    (tester) async {
      final pending = Completer<void>();
      final service = TestMarketplace(() => pending.future);
      await openAuth(tester, service);
      await tester.ensureVisible(find.text('Create an account'));
      await tester.tap(find.text('Create an account'));
      await tester.pumpAndSettle();
      expect(find.text('Full name'), findsOneWidget);
      await tester.ensureVisible(find.text('Continue with Google'));
      await tester.tap(find.text('Continue with Google'));
      await tester.pump();
      expect(service.googleAttempts, 1);
      expect(find.text('Enter a valid email'), findsNothing);
      expect(find.text('Use at least 6 characters'), findsNothing);
      expect(
        tester.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
        isNull,
      );
      pending.completeError(
        const GoogleSignInException(code: GoogleSignInExceptionCode.canceled),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
        isNotNull,
      );
      expect(find.textContaining('failed'), findsNothing);
    },
  );

  testWidgets(
    'an existing account conflict keeps the screen open and explains recovery',
    (tester) async {
      final service = TestMarketplace(() async {
        throw FirebaseAuthException(
          code: 'account-exists-with-different-credential',
        );
      });
      await openAuth(tester, service);
      await tester.ensureVisible(find.text('Continue with Google'));
      await tester.tap(find.text('Continue with Google'));
      await tester.pumpAndSettle();
      expect(
        find.text('Sign in with your existing account method for this email.'),
        findsOneWidget,
      );
      expect(find.byType(AuthScreen), findsOneWidget);
      expect(
        tester.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
        isNotNull,
      );
    },
  );

  testWidgets('Google success returns to the calling marketplace screen', (
    tester,
  ) async {
    final service = TestMarketplace(() async {});
    bool? signedIn;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                signedIn = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(builder: (_) => AuthScreen(service)),
                );
              },
              child: const Text('Open sign-in'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open sign-in'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Continue with Google'));
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();
    expect(signedIn, isTrue);
    expect(find.text('Open sign-in'), findsOneWidget);
  });
}
