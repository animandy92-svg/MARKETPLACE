import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import '../models/product.dart';

class MarketplaceService {
  static const communityUrl =
      'https://chat.whatsapp.com/CG8lsJOYGZHLoDQR5pH1Zx';
  static const website = 'https://jack-of-all-trades-marketplace.web.app';
  Stream<DocumentSnapshot<Map<String, dynamic>>> settings() =>
      db.doc('shop/settings').snapshots();
  MarketplaceService({FirebaseAuth? auth, FirebaseFirestore? db})
    : auth = auth ?? FirebaseAuth.instance,
      db = db ?? FirebaseFirestore.instance;
  final FirebaseAuth auth;
  final FirebaseFirestore db;
  static Future<void>? _googleInitialization;
  static Future<void> initializeGoogleSignIn() =>
      _googleInitialization ??= GoogleSignIn.instance.initialize(
        serverClientId: '370501488724-pvps4gsdo2t8ske80rcdaogmjr2ictlo.apps.googleusercontent.com',
      );
  static const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://jack-of-all-trades-marketplace.web.app/api',
  );

  CollectionReference<Map<String, dynamic>> userCollection(
    String uid,
    String name,
  ) => db.collection('users').doc(uid).collection(name);
  Stream<List<Product>> products() => db
      .collection('products')
      .snapshots()
      .map(
        (snapshot) => snapshot.docs
            .map((doc) => Product.fromMap(doc.id, doc.data()))
            .where((product) => product.active)
            .toList(),
      );
  Stream<List<CartLine>> cart(String uid) =>
      userCollection(uid, 'cart').snapshots().asyncMap((snapshot) async {
        final lines = await Future.wait(
          snapshot.docs.map((entry) async {
            final doc = await db.collection('products').doc(entry.id).get();
            return doc.exists
                ? CartLine(
                    Product.fromMap(doc.id, doc.data()!),
                    (entry.data()['quantity'] as num? ?? 1).toInt(),
                  )
                : null;
          }),
        );
        return lines.whereType<CartLine>().toList();
      });
  Stream<List<Product>> wishlist(String uid) =>
      userCollection(uid, 'wishlist').snapshots().asyncMap((snapshot) async {
        final products = await Future.wait(
          snapshot.docs.map(
            (entry) => db.collection('products').doc(entry.id).get(),
          ),
        );
        return products
            .where((doc) => doc.exists)
            .map((doc) => Product.fromMap(doc.id, doc.data()!))
            .toList();
      });
  Stream<QuerySnapshot<Map<String, dynamic>>> orders(String uid) =>
      userCollection(
        uid,
        'orders',
      ).orderBy('created_at', descending: true).snapshots();

  Future<void> signIn(String email, String password) async {
    final result = await auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    await syncProfile(result.user!);
  }

  Future<void> signUp(String email, String password, String name) async {
    final result = await auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    await result.user!.updateDisplayName(name.trim());
    await syncProfile(result.user!);
  }

  Future<void> signInWithGoogle() async {
    await initializeGoogleSignIn();
    final account = await GoogleSignIn.instance.authenticate();
    final idToken = account.authentication.idToken;
    if (idToken == null) {
      throw FirebaseAuthException(
        code: 'invalid-credential',
        message: 'Google could not verify your account. Please try again.',
      );
    }
    final result = await auth.signInWithCredential(
      GoogleAuthProvider.credential(idToken: idToken),
    );
    await syncProfile(result.user!);
  }

  Future<void> signOut() async {
    await auth.signOut();
    if (_googleInitialization != null) {
      await _googleInitialization;
      await GoogleSignIn.instance.signOut();
    }
  }

  Future<void> syncProfile(User user) async {
    final ref = db.collection('users').doc(user.uid);
    if (!(await ref.get()).exists) {
      await ref.set({
        'firebase_uid': user.uid,
        'email': user.email,
        'name': user.displayName ?? user.email?.split('@').first ?? '',
        'phone': '',
        'role': 'buyer',
        'created_at': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<void> addToCart(Product product) async {
    if (!product.verified) {
      throw Exception('This item needs a stock check before ordering.');
    }
    final uid = auth.currentUser!.uid;
    final ref = userCollection(uid, 'cart').doc(product.id);
    await db.runTransaction((transaction) async {
      final existing = await transaction.get(ref);
      final live = await transaction.get(
        db.collection('products').doc(product.id),
      );
      final quantity = (existing.data()?['quantity'] as num? ?? 0).toInt() + 1;
      if (!live.exists ||
          quantity > (live.data()?['stock'] as num? ?? 0) ||
          quantity > 99) {
        throw Exception('No more stock is available for this product.');
      }
      transaction.set(ref, {'quantity': quantity});
    });
  }

  Future<void> quantity(Product product, int value) async {
    final ref = userCollection(auth.currentUser!.uid, 'cart').doc(product.id);
    if (value <= 0) {
      await ref.delete();
      return;
    }
    if (value > product.stock || value > 99) {
      throw Exception('Requested quantity is unavailable.');
    }
    await ref.set({'quantity': value});
  }

  Future<void> saveProduct(Product product, bool saved) async {
    final ref = userCollection(
      auth.currentUser!.uid,
      'wishlist',
    ).doc(product.id);
    if (saved) {
      await ref.set({
        'product_id': product.id,
        'created_at': FieldValue.serverTimestamp(),
      });
    } else {
      await ref.delete();
    }
  }

  Future<void> clearCart() async {
    final snapshot = await userCollection(auth.currentUser!.uid, 'cart').get();
    final batch = db.batch();
    for (final doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  Future<Map<String, dynamic>> request(
    String path, [
    Map<String, dynamic>? body,
  ]) async {
    final token = await auth.currentUser?.getIdToken();
    final uri = Uri.parse('${apiUrl.replaceAll(RegExp(r'/$'), '')}$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final response =
        await (body == null
                ? http.get(uri, headers: headers)
                : http.post(uri, headers: headers, body: jsonEncode(body)))
            .timeout(const Duration(seconds: 30));
    if (response.headers['content-type']?.contains('application/json') !=
        true) {
      throw Exception(
        'The order service is being prepared. Contact support on 0594081604.',
      );
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data['error'] ?? 'Could not complete the request.');
    }
    return data;
  }
}
