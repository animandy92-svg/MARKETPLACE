# Jack of All Trades

An everyday marketplace for fashion, electrical appliances, school and office supplies, home goods, electronics, groceries, and more. The React website and Flutter Android/iOS app share Firebase Authentication, Firestore listings, carts, wishlists, and orders.

- Website: https://jack-of-all-trades-marketplace.web.app
- Repository: https://github.com/animandy92-svg/MARKETPLACE
- Android/iOS source: [mobile](mobile/)
- Review notes: [docs/REVIEW.md](docs/REVIEW.md)

## Admin panel

Tap **Admin** in the upper-right corner of the website or mobile app, then sign in with an approved account. The first approved admin is **animandy92@gmail.com**. If you were signed in before the role was granted, sign out and back in, or use **Refresh access**.

Admins can publish an item with its name, category, price in Ghana cedis, stock, description, photo URL, and item details. Edits appear in the shared catalog. **Sold** hides the item from storefronts and sets stock to zero. **Remove** permanently deletes the listing after confirmation. Existing order records retain their item snapshots.

An admin role is a Firebase Authentication custom claim (`admin: true`); editing a profile's `role` field does not grant access. To approve another existing account from a trusted operator machine with Google Application Default Credentials:

```sh
node scripts/grant-admin.cjs admin@example.com
# Revoke access:
node scripts/grant-admin.cjs admin@example.com --revoke
```

Do not share the admin account password. Additional admins should use individual accounts and be granted the same claim.

## Project structure

| Directory | Purpose |
| --- | --- |
| `src/` | React 18, TypeScript, Vite, Tailwind, and PWA website |
| `mobile/` | Flutter Android/iOS app with native marketplace and admin screens |
| `functions/src/` | Authenticated order/payment API, deployed as `api` |
| `firestore.rules` | Admin-only catalog writes and private account data |
| `scripts/` | Category synchronization, seeding, and trusted admin provisioning |
| `tests/` | Firestore authorization tests |
| `server/` | Legacy SQLite/Express prototype, not deployed to Firebase |

## Set up the website and API

Use Node.js 22, npm, Firebase CLI, and Java 21 for emulator tests.

```sh
npm ci
npm --prefix functions ci
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env`. Fill in the Firebase web app identifiers from Firebase Console → Project settings → Your apps. Firebase client identifiers are public configuration; server credentials and payment secret keys must remain private.

For the production Firebase API, use `VITE_API_URL=/api`. A development server must use a complete Cloud Functions URL or the emulators.

```sh
npm run dev:frontend     # Website using the configured Firebase project
npm run build           # Production website in dist/
npm run build:functions # Compile the API
```

For isolated local development:

```sh
npm run build:functions
npm run dev             # Vite and Auth, Firestore, Functions emulators
```

The emulator override is in `.env.emulator`. Its data is local and starts empty; production listings are not copied into it.

## Flutter Android and iOS

The native apps are registered in the same Firebase project as `com.jackofalltrades.marketplace`. Public Firebase options are included in `mobile/lib/firebase_options.dart`.

Use Flutter 3.47.6 / Dart 3.13.5 or a compatible newer SDK:

```sh
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk --debug
```

The debug APK is generated at `mobile/build/app/outputs/flutter-apk/app-debug.apk`. It is intended for testing and is not a Play Store release. Release builds need your own Android signing key; the generated development signing configuration must be replaced before store submission.

The Android app targets Android 7.0 (API 24) and later. GitHub Actions provides a downloadable `marketplace-debug-apk` artifact after a successful Android build.

iOS source is included. Build on macOS with Xcode and an Apple development team:

```sh
cd mobile
flutter build ios --no-codesign   # Compile validation
flutter build ipa               # Requires signing setup
```

For Android emulator development against local Firebase services:

```sh
flutter run --dart-define=USE_EMULATORS=true --dart-define=EMULATOR_HOST=10.0.2.2 --dart-define=API_URL=http://10.0.2.2:5001/jack-of-all-trades-marketplace/us-central1/api/api
```

Use your machine's reachable IP address on a physical test device. Production builds use HTTPS and the production API by default.

## Categories and listings

Category labels are maintained in `src/app/data/categories.json`. Existing phone/laptop/tablet/watch/accessory IDs are preserved. Calculators belong under **School & Office**; dresses under **Fashion & Clothing**; electrical household goods under **Electrical Appliances**. **More Finds** accommodates other goods.

After changing categories, update the Flutter labels:

```sh
node scripts/sync-mobile-categories.mjs
```

Listings are read from Firestore throughout the website and mobile app, including product details and the homepage. New stock should be added through the admin panel. No invented stock is automatically added to production.

The optional legacy SQLite migration requires an existing local SQLite catalog and trusted Google credentials. Install both dependency sets first, then use `npm run seed`. It skips migration if the target catalog is not empty.

## Orders and payments

The API validates quantities, stock, and shipping addresses, and calculates product prices and the 10% tax from Firestore. Client-submitted prices and totals are ignored.

Without Paystack configured, checkout submits an **unpaid pending order request**. With Paystack configured, the server initializes a hosted payment and verifies the reference, amount, currency, user, and order before setting `paid`. In the mobile app, return from the browser and tap **Verify payment**, or verify a pending payment from the account's order history.

For optional payments, create an ignored `functions/.env.jack-of-all-trades-marketplace` using `functions/.env.example`, set `PAYSTACK_SECRET_KEY` on the server, and redeploy. Never put the secret in a `VITE_` variable or in the mobile app. Restrict access to the deployment environment. The default storefront return URL can be changed with `STOREFRONT_URL`.

Inventory reservation, automatic payment webhooks, fulfillment, refunds, and tax compliance for a live business need a separate production operations pass. Admins can currently manage sold stock manually.

Seller applications are saved for review; submitting an application does not create an approved seller account or collect a fee.

## Verification and deployment

```sh
npm test
npm run test:rules
npm run test:api
npm audit
npm --prefix functions audit
node scripts/sync-mobile-categories.mjs --check
npm run build
firebase login
firebase use jack-of-all-trades-marketplace
firebase deploy --only functions,firestore,hosting
```

Cloud Functions deployment requires a Firebase project with billing enabled. Hosting and Firestore deploy independently if the Functions service cannot be enabled.

GitHub CI checks the web/API, security rules, Flutter analysis/tests, Android debug build, and an unsigned iOS compilation. Build products, installed dependencies, local environment files, and SQLite runtime files are excluded from Git.

The original design attribution is retained in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
