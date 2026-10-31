"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/server/context";
import { dbError, fail, ok, type ActionResult } from "@/lib/server/actions";
import { documentOverridesSchema } from "@/lib/validation";
import { documentTemplate } from "@/lib/documents/templates";

export async function saveDocumentCustomization(slug: string, overrides: unknown): Promise<ActionResult> {
  if (!documentTemplate(slug)) return fail("Unknown document.");
  const parsed = documentOverridesSchema.safeParse(overrides);
  if (!parsed.success) return fail("Some text is too long.");
  const { supabase, business } = await requireBusiness();
  const { error } = await supabase
    .from("document_customizations")
    .upsert({ business_id: business.id, slug, content: parsed.data, updated_at: new Date().toISOString() });
  if (error) return dbError(error);
  revalidatePath(`/documents/${slug}`);
  return ok(undefined, "Template saved for your business");
}

export async function resetDocumentCustomization(slug: string): Promise<ActionResult> {
  const { supabase } = await requireBusiness();
  const { error } = await supabase.from("document_customizations").delete().eq("slug", slug);
  if (error) return dbError(error);
  revalidatePath(`/documents/${slug}`);
  return ok(undefined, "Reset to the default text");
}
