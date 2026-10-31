# Privacy & compliance notes (US / UK)

> These notes are engineering guidance, **not legal advice**. Items marked ⚖️ need review by a qualified lawyer or compliance adviser before launch.

## Roles

- **You (the operator of CleanFlow)** are the controller of account data: owner email, business settings and billing. For the client data that cleaning businesses store, you act as a **processor / service provider** on their behalf.
- **Each cleaning business** is the controller of its own clients' personal data.

⚖️ Prepare: Terms of Service, a Privacy Notice (template at `/privacy` — complete the bracketed fields), and a **Data Processing Agreement** for business customers (needed under the UK GDPR, Art. 28).

## Data inventory

| Data | Purpose | Where |
| --- | --- | --- |
| Owner email, password hash (Supabase Auth) | Account access | `auth.users` |
| Business name, contact details, logo, settings | Documents and settings | `businesses` |
| Client name, email, phone, service address, preferences, notes | Delivering and administering cleaning services | `clients` |
| Quotes, jobs, checklists, invoices, payments, expenses | Business records | respective tables |
| Licence email and order reference | Access control | `licenses` |

**Not collected or stored**: payment card data (no card processing), alarm codes, key locations or passwords (forms warn against entering them), health data, government IDs, analytics or tracking cookies. The only cookies are the Supabase session cookies, which are strictly necessary.

## Technical safeguards implemented

- Row Level Security on every tenant table, composite foreign keys preventing cross-tenant links, and no `anon` table access (integration-tested).
- Server-side validation of every write. The service-role key is never used by the web app.
- TLS in transit (hosting providers) and encryption at rest (Supabase).
- Data minimisation prompts in client forms; preferences fields explicitly warn against storing access codes.
- **Export**: full JSON and per-module CSV (Settings → Data).
- **Erasure**: permanent client deletion with all linked records (Clients → Delete permanently), and full account deletion (Settings → Data → Delete account), which removes the auth user and all business data.
- Password-reset responses don't reveal whether an account exists.

## Retention (proposed defaults) ⚖️

| Data | Proposed retention |
| --- | --- |
| Active account data | While the account is active |
| Deleted account / client | Removed from the live database immediately. Removed from backups when they expire (state your provider's backup window, e.g. 7–30 days) |
| Licence records | For as long as needed to honour refunds, disputes and tax records on your own sales |

Remind cleaning businesses that **they** may have to keep invoices and payment records for tax purposes. In the UK HMRC generally expects 5–6 years; in the US the IRS generally expects 3–7 years depending on the circumstances. That is why the app warns before permanent deletion and recommends exporting first.

## United Kingdom ⚖️

- **UK GDPR & Data Protection Act 2018**: lawful basis (contract / legitimate interests), privacy notice, data subject rights (access, rectification, erasure, portability, all supported technically by export and deletion), a DPA with business customers, and a record of processing.
- **ICO registration / data protection fee**: the operator likely needs to pay it. Cleaning businesses that process client data electronically may also need to.
- **International transfers**: if Supabase/Vercel regions are outside the UK, rely on the UK adequacy regulations or the IDTA / UK Addendum to the SCCs.
- **PECR**: marketing messages (follow-up and review templates) need consent or a valid soft opt-in.
- **Consumer law** for your own sales: see `LICENSING.md`.
- **End of Tenancy checklist**: does not guarantee deposit return. Tenancy deposit disputes follow the deposit-protection schemes.

## United States ⚖️

- **State privacy laws** (California CCPA/CPRA, Virginia, Colorado, Connecticut, Texas, …): many have revenue or volume thresholds that a small operator may not meet at first. Track them as you grow. Provide a privacy notice and honour access/deletion requests regardless.
- **Data breach notification laws** exist in all 50 states. Have an incident-response plan.
- **FTC Act §5**: don't misrepresent security or features. Don't claim “bank-level security”, “lifetime access” or “legally compliant documents”.
- **Marketing**: CAN-SPAM for email, TCPA for texts/calls (prior express consent for automated texts). The review-request templates warn against incentivised reviews (FTC rule on consumer reviews and testimonials, 2024).
- **Sales tax on cleaning services** varies by state (some states tax residential cleaning). The app adds no tax. Businesses must add it themselves if required.

## Document kit disclaimer

Every kit document carries this footer:

> Business template for organisation purposes only. It is not a legally validated contract, tax document, insurance or safety certificate. Requirements differ by US state and locality and in the UK — review with a qualified adviser before relying on it.

⚖️ Before selling the kit, have the following reviewed: estimate/quote acceptance wording, cancellation and lockout policies, invoice content (UK VAT invoice rules if VAT-registered; US state requirements), intake-form consent wording, and any liability or damage clauses you add.
