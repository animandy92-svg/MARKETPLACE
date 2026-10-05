# Marketplace review — October 5, 2026

## Implemented

- A responsive Ghana storefront with **Dream it. Own it.**, interactive category artwork, a budget finder, prominent phones/laptops, support **0594081604**, and the owner's WhatsApp community link.
- Admin-only catalog changes, explicit stock/photo/condition/price checks, private supplier applications, seller approval, private listing drafts, and camera/gallery JPEG uploads on web and Android. Legacy listings require an admin check before purchase.
- Server-priced checkout with configured delivery zones and tax, atomic inventory reservations, idempotent order/payment creation, hosted Paystack card/mobile money checkout, signed webhooks, and expired-stock reconciliation. No invented delivery timing, free shipping, or automatic 10% tax.
- Customer order history, delivery updates, payment rechecking, unpaid cancellation, help/return requests, full refund submission/reconciliation, and explicit restocking of physically checked returns. Late payments after stock release require support review.
- Purchase-backed product reviews. Products without recorded reviews show **No reviews yet** and do not qualify for rating filters.
- Private per-order costs and pilot reporting for completed deliveries, cancellations, refunds, repeat purchases, acquisition cost, and contribution after costs. Missing costs remain unknown. The report is bounded to 500 orders and flags truncation.
- Native Android seller submissions, order handling, support, delivery/return information, reviews, and an updated **1.1.0+2** testing APK. The full admin operations hub is available on the website.

## Verification

Local checks cover web type checking/build, six business/payment unit tests, nine Firestore authorization tests, an Auth/Firestore/Functions emulator purchase-through-refund workflow, Flutter analysis and six widget/model tests, and shared web/mobile categories.

The Android APK was built and inspected: package `com.jackofalltrades.marketplace`, version `1.1.0`, version code `2`, minimum Android API `24`, and ARM64/ARMv7/x86_64 support. Its v2 signature is valid and the signing certificate matches the previous testing APK.

The payment integration test uses a local provider stub. It verifies authoritative prices, card/mobile-money channel requests, concurrent final-stock purchases, duplicate charge handling, ownership, fulfillment, support, review restrictions, repeated refund reconciliation, reserved-stock edit protection, and expiry. It does not prove a real Paystack account or mobile network accepted payment.

GitHub CI repeats these checks and compiles an Android debug APK and unsigned iOS app. Windows cannot verify an iOS compile or produce a signed iOS release.

## Deployment and remaining operations

Cloud Functions deployment was attempted and rejected: the Firebase project is on Spark, and Artifact Registry requires Blaze billing. The API and scheduler explicitly bind `PAYSTACK_SECRET_KEY` through Firebase Secret Manager, ready for deployment after owner setup. Checkout remains closed while the API/payment configuration and delivery zones are unavailable.

Hosting and Firestore rules are deployable separately. The owner has authorized publishing the updated storefront and Android testing APK. Deployment status is recorded in the task's final response.

No real money was moved, no supplier was recruited, and no physical stock, delivery, return, or support response was verified. The initial return policy is editable and needs owner review. The owner must configure real delivery fees/timing, enable Blaze, activate Paystack, configure the secret/webhook, check stock/photos/condition/prices, and complete a real purchase-delivery-refund acceptance run. See [PILOT.md](PILOT.md).

The Android APK uses development signing and is a testing build. Store distribution needs the owner's production signing key. Photos are embedded as compressed JPEGs for this small pilot; larger catalogs need object storage and pagination. Support requests currently update order history; outbound email/SMS notifications and a custom-domain mailbox are not configured.
