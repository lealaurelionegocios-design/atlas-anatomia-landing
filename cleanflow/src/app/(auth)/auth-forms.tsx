"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(linkError ? "That link is invalid or has expired. Please try again." : null);
  const form = useForm<z.input<typeof signInSchema>>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await signIn(values, next);
        if (!res.ok) return setError(res.error);
        router.replace(res.data.redirectTo);
        router.refresh();
      })}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="email" label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field id="password" label="Password" error={errors.password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-brand hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  if (sent) {
    return (
      <Alert tone="success" title="Check your inbox">
        We sent a confirmation link to {form.getValues("email")}. Open it to finish setting up your account.
      </Alert>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await signUp(values);
        if (!res.ok) return setError(res.error);
        if (res.data.needsConfirmation) return setSent(true);
        toast.success("Account created");
        router.replace("/onboarding");
        router.refresh();
      })}
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <Field id="email" label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field id="password" label="Password" error={errors.password?.message} hint="At least 8 characters.">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Create account
      </Button>
      <p className="text-xs text-muted">
        By creating an account you agree to how we handle data, described in our{" "}
        <Link href="/privacy" className="text-brand underline">
          privacy notice
        </Link>
        .
      </p>
      <p className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-brand underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

const emailOnly = z.object({ email: z.email("Enter a valid email address.") });

export function ForgotPasswordForm() {
  const [done, setDone] = useState<string | null>(null);
  const form = useForm<z.input<typeof emailOnly>>({ resolver: zodResolver(emailOnly), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;
  if (done) return <Alert tone="success">{done}</Alert>;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await requestPasswordReset(values);
        if (res.ok) setDone(res.message ?? "Check your inbox.");
        else toast.error(res.error);
      })}
    >
      <Field id="email" label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Send reset link
      </Button>
      <Link href="/login" className="block text-center text-sm text-brand hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

const newPassword = z.object({ password: signUpSchema.shape.password });

export function UpdatePasswordForm() {
  const router = useRouter();
  const form = useForm<z.input<typeof newPassword>>({ resolver: zodResolver(newPassword), defaultValues: { password: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await updatePassword(values);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message);
        router.replace("/dashboard");
      })}
    >
      <Field id="password" label="New password" error={errors.password?.message} hint="At least 8 characters.">
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Save new password
      </Button>
    </form>
  );
}
