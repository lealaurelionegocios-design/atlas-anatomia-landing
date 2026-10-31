import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Loads .env.local so integration tests talk to the local Supabase stack.
function loadEnv() {
  try {
    const raw = readFileSync(path.resolve(import.meta.dirname, "../../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // Rely on the environment.
  }
}
loadEnv();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Db = SupabaseClient<Database>;

export function adminClient(): Db {
  if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for integration tests");
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function anonClient(): Db {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createTestUser(label: string): Promise<{ db: Db; userId: string; email: string; password: string }> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "Test-password-123!";
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const db = anonClient();
  const { error: signInError } = await db.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { db, userId: data.user!.id, email, password };
}

export async function createBusiness(db: Db, market: "US" | "UK" = "US") {
  const { data, error } = await db.rpc("create_business", {
    p_name: market === "US" ? "Sparkle Homes LLC" : "Brightside Cleaning Ltd",
    p_market: market,
    p_currency: market === "US" ? "USD" : "GBP",
    p_date_format: market === "US" ? "MM/DD/YYYY" : "DD/MM/YYYY",
    p_timezone: market === "US" ? "America/New_York" : "Europe/London",
    p_default_hourly_cost: 20,
    p_default_target_margin: 0.35,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteUser(userId: string) {
  await adminClient().auth.admin.deleteUser(userId);
}
