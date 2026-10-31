#!/usr/bin/env node
// Manual licence administration until a checkout provider is integrated.
// Uses the service-role key: run only on a trusted machine, never in the browser.
//
//   npm run license -- grant  buyer@example.com [order-ref]
//   npm run license -- revoke buyer@example.com [reason]
//   npm run license -- refund buyer@example.com
//   npm run license -- status buyer@example.com

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* use the real environment */
  }
}
loadEnv();

const [cmd, rawEmail, extra] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!cmd || !rawEmail) {
  console.error("Usage: license-admin.mjs <grant|revoke|refund|status> <email> [ref|reason]");
  process.exit(1);
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase();
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  if (cmd === "grant") {
    const ref = extra ?? `manual-${email}-${Date.now()}`;
    const { error } = await db.from("licenses").upsert({ email, external_ref: ref, source: "manual", status: "active", revoked_at: null, revoke_reason: null }, { onConflict: "external_ref" });
    if (error) throw error;
    console.log(`Granted an active licence to ${email} (ref ${ref}). The buyer activates it by signing in with this email.`);
  } else if (cmd === "revoke" || cmd === "refund") {
    const { data, error } = await db
      .from("licenses")
      .update({ status: cmd === "refund" ? "refunded" : "revoked", revoked_at: new Date().toISOString(), revoke_reason: extra ?? cmd })
      .eq("email", email)
      .eq("status", "active")
      .select("id");
    if (error) throw error;
    console.log(`${cmd === "refund" ? "Refunded" : "Revoked"} ${data.length} licence(s) for ${email}.`);
  } else if (cmd === "status") {
    const { data, error } = await db.from("licenses").select("status, source, external_ref, user_id, purchased_at, activated_at, revoked_at").eq("email", email);
    if (error) throw error;
    console.table(data);
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
