import Link from "next/link";
import { Calculator, CalendarDays, ClipboardCheck, FolderOpen, HandCoins, Users } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

const FEATURES = [
  { icon: Users, title: "Clients in one place", text: "Contact details, service preferences and full history for every home you clean." },
  { icon: Calculator, title: "Price jobs with confidence", text: "Turn your real costs and target margin into a suggested price — no guesswork." },
  { icon: FolderOpen, title: "Estimates & quotes", text: "Numbered, versioned documents with US Letter or A4 PDFs." },
  { icon: CalendarDays, title: "Bookings & calendar", text: "Turn an accepted estimate into a booked job in one click." },
  { icon: ClipboardCheck, title: "Checklists that get followed", text: "Standard, deep, move-in/move-out and end of tenancy checklists per job." },
  { icon: HandCoins, title: "Invoices & payments", text: "Invoice completed jobs, record payments and always know what's outstanding." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>
      <main>
        {deleted && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Alert tone="success">Your account and data have been deleted.</Alert>
          </div>
        )}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-3 inline-block rounded-full bg-mint px-3 py-1 text-xs font-medium text-forest">For house cleaners and small cleaning teams · US & UK</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Manage your cleaning business without complicated software.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            CleanFlow keeps clients, estimates, bookings, checklists, invoices, payments and a professional document kit together — so you can spend your time cleaning, not
            chasing paperwork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>
        <section aria-labelledby="features" className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="features" className="text-2xl font-semibold">
              Everything a small cleaning business needs
            </h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-xl border border-line p-5">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-mint text-brand">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-8 text-xs text-muted sm:px-6">
        <span>© CleanFlow Business Manager</span>
        <Link href="/privacy" className="hover:underline">
          Privacy notice
        </Link>
      </footer>
    </div>
  );
}
