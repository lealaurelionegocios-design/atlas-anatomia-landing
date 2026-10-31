# Architecture & security model

## Overview

```
Browser ──► Next.js (Vercel / Node)
             ├─ proxy.ts            refreshes the Supabase session cookie, redirects signed-out users
             ├─ Server Components   read data with the user's session (RLS applies)
             ├─ Server Actions      validate input with Zod, then call Supabase (RLS applies)
             └─ Route handlers      PDFs, CSV/JSON export, licensing webhook
                       │
                       ▼
             Supabase: Auth (GoTrue) · PostgREST · PostgreSQL 17
                       └─ RLS on every tenant table, integrity triggers, transactional SQL functions
```

- The browser **never** talks to the database directly; it only holds the Supabase session cookie. All reads and writes happen on the server with the user's own session, so Row Level Security is the final authority even if application code has a bug.
- The **service-role key is not used by the application**. Only `scripts/*` and the integration tests use it. The licensing webhook would use it when a provider is configured.
- No `localStorage` is used for data.

## Data model

```
auth.users ─1:1─ businesses ─1:N─ business_members
                     │
                     ├─ clients ──┬─ quotes ── quote_items, quote_versions
                     │            ├─ jobs ──── job_checklist_items       (job.quote_id unique → 1 job per quote)
                     │            ├─ invoices ─ invoice_items             (invoice.job_id unique → 1 invoice per job)
                     │            └─ payments                             (payment → invoice)
                     ├─ expenses
                     └─ document_customizations (per template wording)
licenses (email, user_id, status) — written by the service role only
```

Key design decisions:

| Decision | Why |
| --- | --- |
| Every tenant row has `business_id`; references use **composite foreign keys** `(business_id, id)` | An FK check bypasses RLS. Composite keys make it impossible to link a quote to another business's client, even with a forged UUID (covered by an integration test). |
| Stable UUIDs everywhere; quote → job → invoice → payment linked by IDs | The same client/service is identified consistently across modules; no duplicate data is copied between modules except immutable snapshots (quote versions, pricing snapshot). |
| `unique (quote_id)` on jobs and `unique (job_id)` on invoices | A quote can only be converted once; a job can only be invoiced once. |
| Each money row stores its own `currency` | Changing the business currency never converts history. The dashboard only totals records in the current currency and reports how many were excluded. |
| Money is `numeric(12,2)`; line `amount` is a generated column; document totals are summed from stored line amounts | Totals always equal the sum of the visible lines (an integration test covers the rounding edge case). |
| Payment status is **derived** (`unpaid / partially_paid / paid / overdue`) from invoice total, payments and due date | It can never drift out of sync. |
| Demo records carry `is_demo`; records created for a demo client inherit the flag via trigger | Demo data stays separate and is removed in one call without touching real data. |

## Database rules (migrations)

| Migration | Contents |
| --- | --- |
| `…0100_core_schema.sql` | Tables, checks (lengths, ranges, enums as checks), composite FKs, indexes, `updated_at` triggers |
| `…0200_integrity_triggers.sql` | Currency defaults, demo-flag inheritance, client must match linked quote/job, status timestamps, converted quotes are locked, invoices with payments cannot be voided or reduced below what was paid, payments must target an *issued* invoice in the same currency and cannot exceed the balance (invoice row locked to serialise concurrent payments) |
| `…0300_rls_and_grants.sql` | RLS on every table, member-only policies, `anon` has no table access, column-level `UPDATE` grant on `businesses` (counters and ownership are not user-editable), append-only quote versions, read-only licences |
| `…0400_business_functions.sql` | `create_business`, `next_document_number` (atomic per-business numbering), `save_quote` (items + version snapshot), `convert_quote_to_job`, `create_job`, `save_invoice`, `delete_client_permanently`, `remove_demo_data`, `delete_my_account`, `claim_my_license`, `has_active_license` |

Functions run as `SECURITY INVOKER` (RLS applies) except a few narrowly scoped `SECURITY DEFINER` helpers that check `auth.uid()` themselves (membership lookup, business creation, numbering, account deletion, licence claim). All set `search_path = ''`.

## Request flow example: “Book as job”

1. The user clicks **Book as job** on an accepted quote.
2. The server action validates the input with Zod (`convertQuoteSchema`) and chooses the checklist for the market/service type.
3. It calls `convert_quote_to_job`, which locks the quote row, checks `status = 'accepted'` and that no job exists, inserts the job with the quote's client, price and currency, and inserts the checklist items, all in one transaction.
4. Triggers lock the quote against further status or total changes.
5. Paths are revalidated, so the dashboard, job list and quote page show the new state.

## Validation layers

1. **Browser**: React Hook Form + Zod, for immediate feedback and accessible error messages.
2. **Server actions**: the same Zod schemas re-validate. They are idempotent, so they accept their own output (a unit test guarantees this). The calculator result is recalculated on the server; the browser's numbers are never trusted.
3. **Database**: check constraints, composite FKs, triggers and transactional functions.

## Authentication & routes

- Supabase email + password with PKCE cookie sessions via `@supabase/ssr`.
- `src/proxy.ts` refreshes the session on every request and redirects signed-out users to `/login?next=…` (API routes get `401`). `next` is restricted to same-origin relative paths.
- `requireBusiness()` (server) redirects users without a business to `/onboarding`, and to `/license` when the licence gate is enabled.
- Password reset uses `/auth/callback` (code exchange) and `/auth/update-password`. The reset request returns the same response whether or not the account exists.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; the `X-Powered-By` header is disabled.

## PDFs

`@react-pdf/renderer` runs in Node route handlers (`/api/pdf/...`). Paper size follows the market (LETTER / A4). Fonts are vendored Inter (OFL) under `src/lib/pdf/fonts` (Latin subset) and are traced into the serverless bundle via `outputFileTracingIncludes`.

## CSV export

Every cell is escaped per RFC 4180 and protected against spreadsheet formula injection (`=`, `+`, `-`, `@` prefixes). Files include a UTF-8 BOM so Excel shows `£` correctly.
