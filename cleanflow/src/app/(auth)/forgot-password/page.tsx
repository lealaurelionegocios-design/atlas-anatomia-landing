import type { Metadata } from "next";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new password.</p>
      <ForgotPasswordForm />
    </>
  );
}
