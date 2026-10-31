# Deployment guide

The recommended production setup is **Supabase (hosted)** for the database and authentication, and **Vercel** (or any Node 20+ host) for the Next.js app. Both have free tiers suitable for a pilot. Check their current pricing and limits before selling, because commercial use and growth may need paid plans.

> Nothing in this repository deploys automatically. No credentials are stored in the code.

## 1. Create the Supabase project

1. Create a project at supabase.com. Choose a region close to your customers: US East for the US, London (`eu-west-2`) for the UK. If you sell in both markets, consider data-residency expectations (see the privacy notes).
2. From **Project Settings → API**, note the **Project URL**, the **publishable (anon) key** and the **service-role key**. Keep the service-role key secret.
3. Apply the migrations from your machine:

   ```bash
   cd cleanflow
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

   ```bash
   npx supabase db push
   ```

   This applies everything in `supabase/migrations` in order. Never edit an applied migration. Add a new timestamped file instead.

4. **Authentication settings** (Dashboard → Authentication):
   - **Enable email confirmations.** They are off locally. In production they protect against fake sign-ups, and licence activation only trusts confirmed emails.
   - **Site URL**: `https://your-domain`.
   - **Redirect URLs**: `https://your-domain/auth/callback`.
   - **Minimum password length**: 8 or more. Consider enabling leaked-password protection.
   - **SMTP**: configure a real email provider (Resend, Postmark, SES…). Supabase's built-in sender is rate-limited and meant for testing only.
   - Review the rate limits for sign-ups and password resets.
5. **Backups**: check the backup and point-in-time-recovery options of your plan, and document the retention you promise customers.

## 2. Deploy the app (Vercel)

1. Import the GitHub repository in Vercel and set **Root Directory** to `cleanflow`.
2. Framework preset: Next.js. Install command: `npx npm@11 install` (or `npm install` if your Vercel image uses npm 11). Build command: `npm run build`.
3. Environment variables (Production and Preview):

   | Variable | Value | Exposed to browser? |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | yes (safe) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable / anon key | yes (safe, protected by RLS) |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain` | yes |
   | `CLEANFLOW_REQUIRE_LICENSE` | `false` until checkout is integrated, then `true` | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | Only if you enable a licensing webhook provider | **no — server only** |

4. Deploy, then add your custom domain and update the Supabase Site URL and redirect URLs to match.

### Other hosts

Any host that runs Node.js 20.9+ works: `npm run build && npm start`. The PDF routes need the Node runtime, not Edge, and read fonts from `src/lib/pdf/fonts`.

## 3. Post-deployment checklist

- [ ] Sign up with a new email → confirmation email arrives → link opens `/auth/callback` → onboarding.
- [ ] Complete onboarding for the US **and** UK markets with two test accounts.
- [ ] Run the main flow: client → calculator → quote → accept → job → checklist → complete → invoice → payment → dashboard.
- [ ] Download a quote and an invoice PDF (Letter for US, A4 for UK) and a CSV export.
- [ ] With account B, open a URL of account A's quote → must show “not found”.
- [ ] Request a password reset → email → set a new password.
- [ ] Delete a test account from Settings → Data.
- [ ] Optionally run the E2E suite against a **staging** deployment that has email confirmation disabled: `E2E_BASE_URL=https://staging… npm run test:e2e`. Never run it against production: it creates accounts.

## 4. Operations

- **Migrations**: `npx supabase db push` after adding new migration files. Regenerate types with `npm run db:types` against a local stack that has the same migrations.
- **Monitoring**: enable Vercel and Supabase logs and alerts. The app logs unexpected database errors as `[db] <code> <message>` without user data.
- **Dependency updates**: run `npx npm@11 audit` regularly and keep Next.js patched (security releases are frequent).
- **Costs**: Supabase and Vercel free tiers have limits (database size, bandwidth, inactivity pausing on Supabase free projects). Budget for paid plans before promising availability to customers.
