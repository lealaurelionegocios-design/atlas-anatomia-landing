"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { fail, ok, parse, type ActionResult } from "@/lib/server/actions";
import { safeNext } from "@/lib/safe-redirect";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { z } from "zod";

export async function signIn(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = parse(signInSchema, input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return fail("Please confirm your email address first — check your inbox.");
    return fail("Incorrect email or password.");
  }
  return ok({ redirectTo: safeNext(next) });
}

export async function signUp(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = parse(signUpSchema, input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/onboarding` },
  });
  if (error) {
    if (error.code === "weak_password") return fail("Please choose a stronger password.");
    if (error.code === "user_already_exists") return fail("An account with this email already exists. Try signing in.");
    if (error.status === 429) return fail("Too many attempts. Please wait a moment and try again.");
    return fail("We couldn't create your account. Please try again.");
  }
  return ok({ needsConfirmation: !data.session });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = parse(z.object({ email: z.email("Enter a valid email address.") }), input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/auth/update-password`,
  });
  // Same response whether or not the account exists (no account enumeration).
  return ok(undefined, "If an account exists for that email, a reset link is on its way.");
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  const parsed = parse(z.object({ password: signUpSchema.shape.password }), input);
  if ("error" in parsed) return parsed.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("We couldn't update your password. The reset link may have expired.");
  return ok(undefined, "Password updated.");
}
