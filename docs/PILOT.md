# Ghana pilot launch

The storefront and APK use **Dream it. Own it.** The support phone is **0594081604**. The WhatsApp community is https://chat.whatsapp.com/CG8lsJOYGZHLoDQR5pH1Zx. Direct support and the group are separate links.

## What the owner must supply

1. Enable Firebase Blaze billing for `jack-of-all-trades-marketplace`. API deployment currently fails on Spark because Artifact Registry / Cloud Build cannot be enabled. Hosting and catalog administration can deploy separately.
2. Create and activate a Ghana Paystack merchant account, including mobile money. Complete provider test transactions before switching to a live key. A mocked provider test does not establish account activation or successful live money movement.
3. Set the private key through Secret Manager on your trusted machine. Do not put it in `.env`, a `VITE_` variable, Git, the APK, or chat:

   ```sh
   firebase functions:secrets:set PAYSTACK_SECRET_KEY --project jack-of-all-trades-marketplace
   firebase deploy --only functions --project jack-of-all-trades-marketplace
   ```

   The API and stock reconciliation scheduler explicitly bind the secret. A new secret version requires redeployment.

4. Set the Paystack webhook to `https://jack-of-all-trades-marketplace.web.app/api/payments/webhook`. Test-mode and live-mode webhook settings must both be checked in the provider dashboard. Use the storefront `/checkout` callback. Hosted checkout explicitly requests `card` and `mobile_money`.
5. In **Admin → Delivery & terms**, publish specific delivery areas, actual fees, delivery timing, support hours, and return terms. “Ghana” is the service focus; it does not imply nationwide coverage or free delivery. No zone or timing is fabricated. Checkout remains closed without a delivery zone and configured payments. The initial 7-day return window is editable; confirm it before opening checkout.
6. Recruit a few suppliers yourself. Use **Suppliers & checks** to record review notes and approve applications. Verify the actual stock, actual photos, condition, and price. Review existing legacy listings too. They cannot be purchased until an admin marks them checked through the editor. No stock was inserted, physically verified, or suppliers contacted by this change.

## First real purchase acceptance

Use a real checked low-value item and a delivery area you can serve. In the provider's test mode:

- Pay with a test card, then with the Ghana mobile money test flow. Confirm the hosted checkout offers mobile money and displays the provider's authorization instructions.
- Approve the phone prompt. Confirm the signed webhook marks payment paid even if the browser/app closes. Verify independently in the provider dashboard and in the customer's order history.
- Try two buyers for the final unit. Only one stock reservation should succeed. Retry the same checkout and duplicate a webhook; stock and payment must remain unchanged after the first successful update.
- Move a paid order through processing, out for delivery, and delivered. Add meaningful delivery notes. Have a seller mark their goods ready for collection where applicable.
- Receive a customer help/return request. Resolve it, physically receive any returned goods, and request a full refund. Confirm the provider status, then reconcile it in Admin. A submitted/pending refund is never shown as completed.
- Refund an order and only restock after all returned goods have been received and checked. A timed-out refund is `unknown`: use the provider dashboard's refund ID and **Reconcile refund**; do not submit another refund blindly.
- Review the item from the delivered buyer account. Undelivered orders and unrelated accounts cannot post a review.

Then switch to the live secret and repeat one authorized low-value real purchase, physical delivery, and refund, reconciling the actual fees and account settlement. Only the owner can establish that a real customer received the goods.

## Inventory and payment behavior

Stock decrements atomically at order creation. Each user's checkout ID maps to one order; retries reuse that reservation. The initial hold is 30 minutes. Every five minutes the deployed scheduler checks expired holds with Paystack before releasing them. Provider-pending authorizations may retain their hold for up to 24 hours. A late successful charge after release becomes `payment_review` for support and refund handling; it never sells released stock again. Admin edits/deletes of held listings are denied by security rules.

Delivery charges and prices come from the server. Tax is an owner-configured rate, initially zero rather than an invented automatic 10% charge. Order records retain the delivery and return policy they were placed under. Product costs and payment/operational costs live in private collections.

Seller edits are private review submissions. Sellers cannot approve themselves, directly publish catalog goods, change order/payment state, read another seller's drafts, or access customer costs. Supplier suspension blocks further edits; review published inventory separately when suspending a supplier. Support requests and order notes are shared through the customer's order history; no email/SMS notification service is configured.

## Photos and reporting

Web and Android camera/gallery photos become compressed JPEGs, up to approximately 350 KB, embedded in pilot listing documents. Order snapshots omit embedded images to stay within Firestore document limits. This keeps uploads working without a separate Storage bucket. Move photos to object storage and add pagination before expanding to a large catalog.

**Pilot metrics** counts completed deliveries, cancellations/expiry, refunds, unique delivered customers, repeat customers, acquisition cost, and contribution. Record actual supplier goods cost, payment fees, delivery cost, support cost, refund handling cost, and recovered goods value for each completed/refunded order. Enter explicit zeros for costs that did not occur. Missing costs remain unknown and do not count as profit. Acquisition spend must cover the same period as the orders. This pilot report is bounded to 500 orders and flags truncation.

Contribution = total collected − tax − refunded amount − supplier goods cost + recovered goods value − payment fees − actual delivery cost − support cost − refund handling cost. Delivery subsidies are therefore captured as actual delivery cost minus the customer delivery charge already included in collected revenue.

Completed delivery counts include orders later refunded. Repeat customers require more than one delivered purchase that has not been fully refunded.

## Android update

Version **1.1.0+2** updates the existing `com.jackofalltrades.marketplace` package. Build/test with:

```sh
cd mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

The debug APK uses the existing development signing key and is for pilot testing. It is not a Play Store release. A production release needs the owner's signing key. Website administration provides the full order/refund/metrics hub; the APK links to that hub and includes native catalog, seller photo submissions, checkout, order updates, help requests, and purchase reviews.

The APK is distributed through the public [GitHub testing release](https://github.com/animandy92-svg/MARKETPLACE/releases/tag/v1.1.0), and the website footer links directly to its download. Firebase Spark rejected APK hosting as an executable-file restriction. Generated APKs are excluded from Git and Firebase Hosting.

For an authorized future update, build and verify the APK, put the versioned APK/checksum and release notes in `artifacts`, update the release tag and filenames in `scripts/publish-apk.mjs`, commit/push the source, then run `node scripts/publish-apk.mjs --publish`. The script uses Git's existing credential manager without printing or saving the credential. `--inspect` is read-only.

## Custom support email

Own a domain, create a mailbox such as `support@yourdomain.com` with an email provider, and configure the provider's DNS records. Confirm receiving/replying works before publishing it under **Delivery & terms**. Adding the address in Admin does not create a mailbox. Domain purchase, DNS access, and a mailbox provider are not configured by this change.

## Provider references

- [Paystack payment channels](https://paystack.com/docs/payments/payment-channels/)
- [Paystack transaction API](https://paystack.com/docs/api/transaction/)
- [Paystack refund API](https://paystack.com/docs/api/refund/)
- [Paystack webhooks](https://paystack.com/docs/payments/webhooks/)
