import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Sign in to manage your cleaning business.</p>
      <LoginForm next={next} linkError={error === "link"} />
    </>
  );
}
