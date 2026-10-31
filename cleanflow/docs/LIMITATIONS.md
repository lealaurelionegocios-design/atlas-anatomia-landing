# Limitations & pending work

Honest list of what v0.1 does **not** do, and what needs attention before or after launch.

## Not implemented (by design in v1)

| Area | Status |
| --- | --- |
| Card / online payments | Not implemented. Payments are recorded manually. No fake checkout exists. |
| Checkout & licence sales | Interfaces, database table, gate, admin CLI and webhook endpoint are ready, but **no provider is integrated** (`/api/licensing/webhook` returns 501). See `LICENSING.md`. |
| Taxes (sales tax / VAT) | Not calculated. Users can add a manual line item. Needs a verified, per-jurisdiction design before automating. |
| Calendar sync (Google/Outlook/iCal) | Not implemented. The app has its own list and month views only. |
| Sending email/SMS to clients | Not implemented. Quotes, invoices and confirmations are downloaded as PDF or printed; message templates are copy/paste. |
| Recurring job series | Not implemented. Each visit is booked individually ("Recurring" is a service type label). |
| Teams & staff accounts | The schema supports several members per business (`business_members`), but there is no invite/role UI. One owner per business. |
| Multiple businesses per user | One business per account. |
| Bulk currency conversion | Deliberately not done. Changing currency keeps historical amounts in their original currency, and the dashboard totals only the current currency. |
| Credit notes / refunds to clients | Not modelled. Remove the payment, or void an unpaid invoice. |
| Logo storage | Stored as a resized data URL in the database (max ~280 KB). Fine for a logo; Supabase Storage would be better for larger assets. |
| Offline mode / native apps | Not available. Responsive web app only. |
| Languages | English only (US and UK variants). |

## Known technical limitations

- **PDF character set**: PDFs use a vendored Latin subset of Inter. Names in non-Latin scripts (e.g. Chinese, Arabic) will not render correctly in PDFs (the HTML preview is fine). Extended-Latin characters beyond Latin-1 may also fall back.
- **Scale**: the dashboard and lists load up to a few thousand rows per query and aggregate in the server. That is ample for small businesses; move aggregation into SQL views before supporting large teams.
- **Time zones**: jobs store a local date + time in the business time zone (no UTC instant). Correct for a single-location business; a multi-time-zone team would need timestamptz scheduling.
- **Template wording edits** apply to paragraphs and messages. Form field labels and kit checklist items are fixed, and job checklists are created from the four built-in templates (items can be ticked but not added, removed or renamed per job yet).
- **Password reset email flow** is implemented (`/forgot-password` → `/auth/callback` → `/auth/update-password`) but was **not covered by automated tests** (it depends on email delivery). Verify it manually on staging with real SMTP.
- **Email confirmation** is disabled in the local config. Enable it in production (see `DEPLOYMENT.md`). The E2E suite assumes it is disabled.
- The `npm` 10 bundled with Node 22 hits an arborist bug with Vitest 4's optional peer dependencies. Use npm 11 (`npx npm@11 install`).
- Tested in Chromium only (desktop 1366×900 and phone 390×844). Firefox and Safari were not tested in this environment.

## Requires review before selling (⚖️)

- Terms of Service, Privacy Notice (template at `/privacy`), Data Processing Agreement. See `PRIVACY_AND_COMPLIANCE.md`.
- Document kit wording (estimate acceptance, cancellation policy, invoice requirements) for each US state you target and for the UK.
- Commercial policy: access term, hosting costs, updates, refunds, consumer cancellation rights. See `LICENSING.md`.
- Claims on the sales page: avoid “lifetime”, “unlimited updates”, “legally compliant”, “accounting-grade” or “bank-level security”.

## Suggested next steps

1. Integrate a merchant-of-record checkout (handles VAT/sales tax on your sales) and enable the licence gate.
2. Send documents by email (Resend/Postmark) with PDF attachments and a client-facing "accept quote" link.
3. Recurring bookings and team member invitations with roles.
4. Per-job checklist editing and custom checklist templates.
5. SQL views or materialized views for dashboard aggregates.
6. Error monitoring (Sentry or similar) and uptime checks.
