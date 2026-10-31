# Test report

**Date:** 2026-10-31 · **Commit scope:** `cleanflow/` · **Result: all suites passing**

## Environment

| | |
| --- | --- |
| OS / runtime | Linux container, Node.js 22.22, npm 11 |
| App | Next.js 16.4.3 production build (`next build && next start`) |
| Database | Local Supabase stack (PostgreSQL 17.11, GoTrue, PostgREST), all 4 migrations applied from a clean `supabase db reset` |
| Browser | Chromium (Playwright 1.63), desktop 1366×900 and phone 390×844 |

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| Type check | `npm run typecheck` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 problems |
| Unit | `npm test` | ✅ **70 / 70** tests, 5 files |
| Database integration | `npm run test:integration` | ✅ **25 / 25** tests |
| End-to-end | `npm run test:e2e` | ✅ **9 / 9** passed (licensing spec skipped in this run by design) |
| E2E licence gate | `E2E_LICENSE_URL=… npx playwright test licensing` (server with `CLEANFLOW_REQUIRE_LICENSE=true`) | ✅ **1 / 1** |
| Production build | `npm run build` | ✅ 37 routes + proxy |
| Dependency audit | `npx npm@11 audit --omit=dev` | ✅ 0 vulnerabilities in production dependencies. ⚠️ 16 *moderate* advisories remain in the dev-only ESLint toolchain (`minimatch` ReDoS via `eslint`); no fix available without a breaking downgrade. Not shipped to users. |

## Acceptance criteria coverage (brief §10)

| Criterion | Covered by |
| --- | --- |
| Sign-up & authentication | E2E: every spec signs up through the UI; wrong password, invalid email and short password errors (`isolation-and-errors`). Signed-out users are redirected to `/login?next=…` and APIs return 401. |
| Isolation between accounts | Integration: another user cannot read/update/delete/insert, cannot reference foreign clients through FKs, cannot reserve another business's numbers, anon reads nothing. E2E: account B gets 404 on account A's client/quote pages and PDF, and an empty export. |
| Create & edit clients | E2E main flow + validation spec; client history page; archive/erase via integration (`23503` protection, `delete_client_permanently`). |
| Price calculation | Unit (`pricing.test.ts`, 31 cases): formula, 0 % / 50 % / 95 % margins, margin = 1 rejected, negative/NaN/∞/strings rejected, rounding half-up, float drift, fractional hours, zero costs, manual price, below-cost and below-target warnings, no tax, extremes. E2E: $134.00 costs → $206.15 (US) and £115.38 (UK) in the browser. |
| Saving a quote | Integration: numbering `EST-0001`, line totals from stored rounded amounts, versioning and history. E2E: save from the calculator, edit to v2 with an extra line. |
| Quote → job conversion | Integration: refuses non-accepted quotes, converts once, copies client/price/currency, creates the checklist, locks the quote. E2E: “Book as job” with the market-specific default checklist. |
| Recording payments | Integration: partial + full payments, overpayment rejected, currency mismatch rejected, foreign invoice rejected, paid invoices cannot be voided or reduced, an invoiced job cannot be reopened. E2E: partial → overpayment error shown → full → status Paid, balance $0.00. |
| Dashboard updates | Unit (`finance.test.ts`): received / invoiced / quoted / outstanding / overdue / expenses / surplus kept separate, other-currency exclusion, monthly series. E2E: after payments and an expense the dashboard shows received $241.15, outstanding $0.00, surplus $200.00. |
| PDF generation | E2E: quote and invoice PDFs (`%PDF`, US Letter MediaBox 612×792), UK quote and kit PDFs (A4 595.28×841.89), edited kit document PDF. Visually inspected (see `docs/sample-pdfs`). |
| CSV export | Unit (`csv-documents.test.ts`): escaping, formula-injection protection, BOM. E2E: payments CSV content and full JSON export. |
| US/UK localisation | Unit: market config, service types, checklists, date/time/money formats. E2E (`uk-localisation`): GBP, DD/MM/YYYY, “Quote”, `QUO-0001`, End of Tenancy service and checklist, “Cancelled” spelling, A4 PDFs, no Move-In/Move-Out in the UK kit. |
| Mobile use | E2E (`mobile`): 390×844 viewport, menu drawer opens and navigates, **no horizontal scroll** on 10 screens. |
| Error states | E2E: field errors (client, signup), calculator invalid margin disables saving, server error “Choose a client”, empty states on 4 modules, 404 for unknown records and templates, overpayment error in dialog. |
| Accessibility (basic) | E2E with axe-core (WCAG 2.1 A/AA): **no serious or critical violations** on 15 app screens and 4 public pages. Labels wired with `aria-describedby`/`aria-invalid`, skip link, keyboard-operable dialogs (Radix). |
| Demo data separation | Integration: records of demo clients inherit `is_demo`; removal deletes only demo rows. E2E: load → flagged “Demo” → remove → real client remains. |
| Licensing | Integration: users cannot write licences; claim requires matching confirmed email; refunded → inactive. E2E: blocked → granted → activated → refunded → blocked. CLI tested manually (grant/status/refund). |
| Account deletion | Integration: `delete_my_account` removes business data and the auth user. |

## Defects found by the tests and fixed

| Defect | Found by | Fix |
| --- | --- | --- |
| Onboarding could not create the business: React Hook Form submits *transformed* values (`null` for empty optional fields) and the server re-validation rejected `null`. Affected every form with optional fields. | E2E main flow | All optional schema fields accept `null`; new unit test asserts every schema accepts its own output. Onboarding now also reports invalid fields from earlier steps and jumps back to them. |
| Quote total could differ from the sum of lines when a unit price had more than 2 decimals (`3 × 33.335`). | Integration test design | Totals are summed from stored, rounded line amounts. |
| PostgREST returned quote→job as an array (composite FK not unique), so “Booked” badges would always show. | Type check | Added `unique (business_id, quote_id)` and `unique (business_id, job_id)` for 1:1 embedding. |
| Success toasts covered the page header action buttons. | E2E screenshot | Toaster moved to bottom-right. |
| Horizontal scroll on phones (dashboard cards with long rows; an absolutely positioned screen-reader label escaping a table's scroll container). | Mobile E2E | `min-w-0` on cards and `relative` on table wrappers. |
| Overlapping large text in PDFs (inherited absolute line-height). | Visual PDF inspection | Explicit line heights on headings and amounts. |
| Inline link distinguishable only by colour on the sign-up page. | axe-core | Underlined. |

## Not covered by automated tests

- Password-reset and email-confirmation emails (need SMTP). Pages and server code exist; verify manually on staging.
- Browsers other than Chromium.
- Logo upload (manual check only: image is resized to ≤400 px and stored).
- Load/performance testing.

## Screenshots

Real screenshots captured by the E2E run are in [`docs/screenshots`](screenshots):
onboarding, pricing calculator, accepted estimate, job checklist, paid invoice, dashboard, client history, jobs calendar, UK document kit, invoices with demo data, document editor, and mobile dashboard, menu and calculator.
