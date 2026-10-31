# Licensing & commercial delivery

CleanFlow is ready for a checkout provider but **does not include one**, and no purchase is simulated. Pick the provider and the commercial policy first, then wire them up as described below.

## What exists today

| Piece | Where | What it does |
| --- | --- | --- |
| `licenses` table | migration `…0100` | `email`, `user_id`, `status` (`pending`/`active`/`revoked`/`refunded`), `source`, unique `external_ref` (order id), timestamps, `revoke_reason`. Users can **read** their own licence. Only the service role can write. |
| `claim_my_license()` | migration `…0400` | Links an active licence bought with the caller's email to their account, **only if the email is confirmed**. |
| `has_active_license()` | migration `…0400` | Used by the licence gate. |
| Licence gate | `CLEANFLOW_REQUIRE_LICENSE=true` | Every app page and API route requires an active licence. Users without one see `/license` (“Check my licence”). Refunded or revoked licences lose access on their next request. |
| Provider interface | `src/lib/licensing/index.ts` | `CheckoutProvider.parseWebhook(request) → PurchaseEvent` and `applyPurchaseEvent()` (idempotent upsert by `external_ref`). |
| Webhook endpoint | `POST /api/licensing/webhook` | Returns **501** until a provider is configured, so nothing can grant access through it. |
| Admin CLI | `npm run license -- grant/revoke/refund/status <email>` | Manual delivery and refunds while there is no integration. |

The end-to-end test `tests/e2e/licensing.spec.ts` covers: blocked → licence granted → activated → refunded → blocked again.

## Integrating a provider (Stripe, Lemon Squeezy, Paddle, Gumroad, …)

1. Implement `CheckoutProvider` in `src/lib/licensing/`:
   - Verify the webhook **signature** with the provider's secret (server-side environment variable).
   - Map `order_created` / `payment_succeeded` to `{ type: "purchase", email, externalRef }`, refunds to `{ type: "refund" }`, chargebacks or cancellations to `{ type: "revoke" }`.
   - Return `null` for events you ignore.
2. Return it from `getCheckoutProvider()`.
3. Set `SUPABASE_SERVICE_ROLE_KEY` (server only) and the provider secret in the hosting environment.
4. Point the provider's webhook at `https://your-domain/api/licensing/webhook`.
5. Set `CLEANFLOW_REQUIRE_LICENSE=true`.
6. In the checkout's “thank you” page or email, tell buyers to **sign up with the same email address** they used to pay.

Add a test with a recorded, signed sample payload before going live.

## Commercial policy: decide before selling

The code makes no promises. These points must be decided and written into your sales page and terms **before launch**:

- **Access term**: one-time purchase vs subscription. Avoid “lifetime access” unless you have budgeted hosting costs for that lifetime and defined what happens if the service shuts down (for example, a data export window).
- **Hosting & availability**: who pays for Supabase and Vercel, what uptime (if any) you commit to, and backup/restore expectations.
- **Updates**: which updates are included and for how long. Avoid “unlimited updates”.
- **Refunds**: refund window and process. Refunds revoke access automatically once the webhook is integrated (`refund` → `status = refunded`).
- **Consumer law**: the UK Consumer Contracts Regulations (14-day cancellation right for digital content unless the buyer expressly waives it when access starts) and US state consumer-protection and auto-renewal laws, if you sell subscriptions.
- **Taxes on your sales**: VAT/GST/sales tax on digital products. Merchant-of-record providers (Paddle, Lemon Squeezy) handle this for you; Stripe does not by default.
- **Bundled document kit**: present it as editable business templates, not legal or tax documents (see `PRIVACY_AND_COMPLIANCE.md`).
