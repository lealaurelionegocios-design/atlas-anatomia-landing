import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getSessionUser } from "@/lib/server/context";
import { UpdatePasswordForm } from "@/app/(auth)/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  const { user } = await getSessionUser();
  if (!user) redirect("/login?error=link");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="mb-6 text-2xl font-semibold">Choose a new password</h1>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
