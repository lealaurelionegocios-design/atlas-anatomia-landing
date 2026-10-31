import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "../supabase/server";
import { licenseRequired } from "../env";
import { todayIn } from "../dates";

/** Auth + business lookup for API route handlers (returns a Response on failure). */
export async function apiContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) } as const;
  const { data: business } = await supabase.from("businesses").select("*").maybeSingle();
  if (!business) return { error: NextResponse.json({ error: "No business set up" }, { status: 403 }) } as const;
  if (licenseRequired()) {
    const { data: active } = await supabase.rpc("has_active_license");
    if (!active) return { error: NextResponse.json({ error: "Licence required" }, { status: 403 }) } as const;
  }
  return { supabase, user, business, today: todayIn(business.timezone) } as const;
}

export function fileResponse(body: string | Uint8Array, filename: string, contentType: string, inline = false) {
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
