import type { Metadata } from "next";
import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Set up takes about five minutes.</p>
      <SignupForm />
    </>
  );
}
