// Creates a ready-to-explore demo account on a LOCAL or staging Supabase
// project: a confirmed user, a business and fictional demo records.
//
//   npm run seed:demo -- [US|UK]
//
// Requires SUPABASE_SERVICE_ROLE_KEY (server-side only). Refuses to run
// against a non-local URL unless ALLOW_REMOTE_SEED=true.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { generateDemoData } from "../src/lib/demo/generate";
import { MARKET_CONFIG, type Market } from "../src/lib/market";
import { todayIn } from "../src/lib/dates";

try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* use the real environment */
}

const market: Market = process.argv[2]?.toUpperCase() === "UK" ? "UK" : "US";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anon || !service) throw new Error("Supabase URL, publishable key and service role key are required.");
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_REMOTE_SEED !== "true") {
  throw new Error("Refusing to seed a non-local project. Set ALLOW_REMOTE_SEED=true to override.");
}

const email = `demo-${market.toLowerCase()}@cleanflow.local`;
const password = `Demo-${market}-password-1`;

async function main() {
  const admin = createClient<Database>(url, service, { auth: { persistSession: false } });
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
  const { error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) throw createError;

  const db = createClient<Database>(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const cfg = MARKET_CONFIG[market];
  const { data: businessId, error } = await db.rpc("create_business", {
    p_name: market === "UK" ? "Brightside Cleaning (Demo)" : "Sparkle Homes (Demo)",
    p_market: market,
    p_currency: cfg.defaultCurrency,
    p_date_format: cfg.defaultDateFormat,
    p_timezone: cfg.defaultTimezone,
    p_owner_name: market === "UK" ? "Sophie Clarke" : "Dana Rivera",
    p_email: email,
    p_default_hourly_cost: market === "UK" ? 14 : 20,
    p_default_target_margin: 0.35,
  });
  if (error) throw error;
  await db.from("businesses").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", businessId);
  await generateDemoData(db, { businessId, market, today: todayIn(cfg.defaultTimezone) });
  console.log(`Demo account ready (${market}):\n  email:    ${email}\n  password: ${password}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
