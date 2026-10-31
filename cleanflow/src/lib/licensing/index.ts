import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

// Licensing is prepared for a future checkout provider (Stripe, Lemon Squeezy,
// Paddle, Gumroad, …). No provider is wired up and no payment is simulated.
// To integrate one, implement CheckoutProvider and return it from
// getCheckoutProvider(). See docs/LICENSING.md.

export type LicenseStatus = "pending" | "active" | "revoked" | "refunded";

export interface PurchaseEvent {
  type: "purchase" | "refund" | "revoke";
  email: string;
  /** Provider's order/subscription id — makes events idempotent. */
  externalRef: string;
  provider: string;
  reason?: string;
}

export interface CheckoutProvider {
  name: string;
  /** Verifies the webhook signature and maps the payload; returns null for ignored events. */
  parseWebhook(request: Request): Promise<PurchaseEvent | null>;
}

export function getCheckoutProvider(): CheckoutProvider | null {
  return null;
}

/** Applies a verified purchase event using a service-role client (server only). */
export async function applyPurchaseEvent(admin: SupabaseClient<Database>, event: PurchaseEvent) {
  const email = event.email.trim().toLowerCase();
  if (event.type === "purchase") {
    const { error } = await admin
      .from("licenses")
      .upsert({ email, external_ref: event.externalRef, source: event.provider, status: "active", revoked_at: null, revoke_reason: null }, { onConflict: "external_ref" });
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await admin
    .from("licenses")
    .update({ status: event.type === "refund" ? "refunded" : "revoked", revoked_at: new Date().toISOString(), revoke_reason: event.reason ?? event.type })
    .eq("external_ref", event.externalRef);
  if (error) throw new Error(error.message);
}
