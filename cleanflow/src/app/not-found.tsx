import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">It may have been deleted, or the link is incorrect.</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to overview</Link>
      </Button>
    </main>
  );
}
