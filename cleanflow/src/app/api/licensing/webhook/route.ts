import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyPurchaseEvent, getCheckoutProvider } from "@/lib/licensing";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint for a future checkout provider. Until one is configured it
// refuses every request, so nothing can grant access through it.
export async function POST(request: Request) {
  const provider = getCheckoutProvider();
  if (!provider) return NextResponse.json({ error: "No checkout provider is configured." }, { status: 501 });

  const event = await provider.parseWebhook(request).catch(() => null);
  if (!event) return NextResponse.json({ received: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server is not configured for licensing." }, { status: 500 });
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await applyPurchaseEvent(admin, event);
  return NextResponse.json({ received: true });
}
