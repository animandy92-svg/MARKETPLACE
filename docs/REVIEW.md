# Marketplace review

Reviewed the latest `main` branch and pulled with `git pull --ff-only` before changing the project.

## Findings addressed

| Finding | Result |
| --- | --- |
| Anyone could write to the public catalog | Firestore enforces an admin custom claim for adding, editing, marking sold, and deleting listings. Both admin interfaces use these same rules. |
| Profile roles could be edited by clients | New profiles are buyers; profile edits are limited to name/phone. Admin access uses signed Firebase claims. |
| Checkout trusted client totals and could record an unverified payment | The authenticated API calculates prices and stock from Firestore. Unpaid requests remain pending. Paystack verification checks owner, reference, currency, amount, and metadata before marking paid. |
| User synchronization trusted submitted identity | API identity now comes from a verified Firebase ID token. |
| Home and detail pages used static product data | Catalog and detail pages now read live Firestore listings and hide sold/hidden items. |
| Catalog browsing relied on missing composite indexes | Category/search/sort filters work on the shared catalog without additional composite indexes. |
| Wishlists stored IDs but displayed them as full products | Saved items now resolve their live product records. |
| Cart schema and account switching could mix user data | Shared carts store quantities under each account; the website joins product data and handles stale snapshots. Guest storage is separate. |
| Seller registration reported success without persistence | Applications are saved as pending; no automatic approval or fee is represented. |
| Missing PWA assets and broken migration entry point | Manifest assets are present; the legacy migration uses a trusted Admin SDK and skips nonempty catalogs. |
| Build outputs, dependencies, and database runtime files were tracked | Generated and local files are excluded from version control, retaining dependency locks and source. |
| Vite watched temporary Flutter build files on Windows | Mobile build directories are excluded from the web development watcher. |

## Added capabilities

The storefront now covers sixteen categories, including clothing, electrical appliances, school/office supplies, home goods, groceries, tools, and other items. Existing electronics categories and catalog identifiers are preserved.

The website and native Flutter Android/iOS app have an upper-right Admin entry. Approved admins can publish and edit listings, mark items sold, or remove them. `animandy92@gmail.com` is the first approved admin. No example stock was inserted into the production catalog.

The Flutter app includes catalog search/sort, product details, shared account login, carts, saved items, order history, and the admin panel. Android and iOS Firebase apps use `com.jackofalltrades.marketplace`.

## Verification

- Website production build completed.
- Three checkout/payment unit tests passed, including forged totals and invalid payment ownership.
- Six Firestore emulator authorization tests passed, including admin listing lifecycle, buyer denial, private account data, and role escalation prevention.
- Flutter analysis completed with no issues and five model/widget tests passed.
- Root and Functions dependency audits reported zero known vulnerabilities after dependency updates.
- Shared web/mobile category synchronization check passed.
- Browser checks confirmed the general storefront and the protected admin sign-in entry at phone width.

GitHub CI repeats web/API, rules, mobile analysis/tests, an Android debug build, and an unsigned iOS compile.

## Operational limits

Online payment needs a server-side Paystack secret; without it checkout accepts unpaid pending order requests. Live payment transactions were not performed. Inventory reservation, automatic webhooks, fulfillment/refunds, and business tax configuration remain operational work for a production store. Sold items can be managed manually through the admin panel.

iOS signing and distribution require macOS/Xcode and the owner's Apple team. The Windows workspace cannot produce a signed iOS package. The Android debug APK is a testing build, not a store release.

Firebase Hosting and Firestore rules were deployed successfully on October 4, 2026. Cloud Functions deployment was rejected because the project is on the Spark plan and Artifact Registry requires Blaze billing. Until billing is enabled and `api` is deployed, live checkout is unavailable. Storefront browsing and approved-admin listing management use Firebase directly and are deployed.
