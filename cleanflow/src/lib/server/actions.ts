import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Validates untrusted input with a Zod schema (server-side). */
export function parse<S extends z.ZodType>(schema: S, input: unknown): { data: z.output<S> } | { error: ActionResult<never> } {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: fail("Please check the highlighted fields.", fieldErrors) };
}

/** Turns database errors into messages that are safe and useful to show. */
export function dbError(error: PostgrestError | null | undefined, fallback = "Something went wrong. Please try again."): ActionResult<never> {
  if (!error) return fail(fallback);
  switch (error.code) {
    case "P0001": // raised by our own business rules — written for users
    case "P0002":
    case "22023":
      return fail(error.message);
    case "23505":
      return fail("This record already exists.");
    case "23503":
      return fail("This record is linked to other records and cannot be changed this way.");
    case "23514":
      return fail("Some values are out of the allowed range.");
    case "42501":
      return fail("You don't have permission to do that.");
    default:
      console.error("[db]", error.code, error.message);
      return fail(fallback);
  }
}
