import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

// Public client identifiers from the project's registered Firebase apps.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (defaultTargetPlatform == TargetPlatform.iOS) return ios;
    if (defaultTargetPlatform == TargetPlatform.android) return android;
    throw UnsupportedError('This app supports Android and iOS.');
  }

  static const android = FirebaseOptions(
    apiKey: 'AIzaSyAaeTc88BI0BOvbSlCgSveIZjYsg_9O0Bw',
    appId: '1:370501488724:android:14d32c4c910af4636fddc1',
    messagingSenderId: '370501488724',
    projectId: 'jack-of-all-trades-marketplace',
    storageBucket: 'jack-of-all-trades-marketplace.firebasestorage.app',
  );
  static const ios = FirebaseOptions(
    apiKey: 'AIzaSyBcX-yhbuKltuY_o0ptdf2cKG4jUOOqUHI',
    appId: '1:370501488724:ios:78384344e93958c46fddc1',
    messagingSenderId: '370501488724',
    projectId: 'jack-of-all-trades-marketplace',
    storageBucket: 'jack-of-all-trades-marketplace.firebasestorage.app',
    iosBundleId: 'com.jackofalltrades.marketplace',
  );
}
