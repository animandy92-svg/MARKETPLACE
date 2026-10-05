# Jack of All Trades mobile

Native Flutter Android and iOS storefront for the same Firebase catalog as the website. Browse all categories, search and sort listings, save favorites, manage your cart, submit orders, and access the approved-admin panel from the upper-right corner.

## Run and verify

Use Flutter 3.47.6 or a compatible newer SDK, Android Studio for Android, and macOS/Xcode for iOS.

```sh
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk --debug
```

The Android testing package is `build/app/outputs/flutter-apk/app-debug.apk`. It uses the development signing key. Store releases require your own signing configuration.

```sh
flutter build ios --no-codesign
flutter build ipa
```

iOS signing requires your Apple team. Firebase options are included for the registered bundle/application ID `com.jackofalltrades.marketplace`.

Sign in or create an account with **Continue with Google**. Android uses the Firebase web OAuth client as its server client ID, with the testing APK's signing certificate registered in Firebase. Register every other signing certificate (including Google Play app signing) before distributing a build using it. iOS client and callback configuration lives in `ios/Runner/Info.plist`.

The app icon and sign-in logo use the project's shopping bag mark. Regenerate all Android and iOS icon sizes from the website logo by running `npm run icons:mobile` from the repository root.

The production API defaults to the Firebase Hosting `/api` endpoint. Override it with `--dart-define=API_URL=https://your-api.example/api` if needed. For local Firebase emulators, pass `--dart-define=USE_EMULATORS=true --dart-define=EMULATOR_HOST=10.0.2.2` and the local Functions API URL described in the [project README](../README.md).

Admins sign in with a Firebase account carrying the `admin: true` custom claim. The panel supports adding/editing listings, marking sold, and removing listings. Firebase rules enforce this access on both platforms.

Categories are generated from the shared web JSON using `node scripts/sync-mobile-categories.mjs` from the repository root. See the [project README](../README.md) for deployment, admin provisioning, and payment configuration.
