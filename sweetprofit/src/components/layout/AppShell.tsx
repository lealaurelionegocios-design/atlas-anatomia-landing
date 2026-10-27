"use client";

import {
  BookOpen, Calculator, ChefHat, CircleAlert, CloudOff, LayoutDashboard, Loader2, Menu, ScrollText, Settings, Wheat, X, Check,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useStore } from "@/lib/store/AppStore";
import { Logo } from "./Logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { m, status, saveState, data } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = [
    { href: "/", label: m.nav.dashboard, icon: LayoutDashboard },
    { href: "/ingredienti/", label: m.nav.ingredients, icon: Wheat },
    { href: "/ricette/", label: m.nav.recipes, icon: ChefHat },
    { href: "/calcolatore/", label: m.nav.calculator, icon: Calculator },
    { href: "/report/", label: m.nav.reports, icon: ScrollText },
    { href: "/impostazioni/", label: m.nav.settings, icon: Settings },
    { href: "/guida/", label: m.nav.guide, icon: BookOpen },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label={m.nav.menu} className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-3 px-5 pb-6 pt-6">
        <Logo />
        <span>
          <span className="block font-serif text-xl font-semibold leading-none text-white">{m.app.name}</span>
          <span className="mt-1 block text-[11px] text-rose-light/80">{m.app.tagline}</span>
        </span>
      </Link>
      <ul className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-light/70",
                isActive(href) ? "bg-white/95 text-wine shadow-sm" : "text-rose-light/90 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="m-3 rounded-xl bg-white/10 p-3 text-[11px] leading-relaxed text-rose-light/90">
        <div className="mb-1 flex items-center gap-1.5 font-medium text-white">
          <CloudOff className="size-3.5" aria-hidden />
          {m.app.localOnly}
        </div>
        {data.settings.businessName && <div className="truncate">{data.settings.businessName}</div>}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-wine focus:shadow-lift">
        {m.app.skip}
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-wine to-wine-dark lg:block print:hidden">{sidebar}</aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-cream/90 px-4 backdrop-blur lg:hidden print:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="font-serif text-lg font-semibold text-wine">{m.app.name}</span>
        </Link>
        <div className="flex items-center gap-2">
          <SaveIndicator state={saveState} m={m} compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-ink hover:bg-beige focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine/40"
            aria-label={m.nav.menu}
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={m.nav.menu}>
          <div className="absolute inset-0 bg-ink/40 animate-overlay-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-gradient-to-b from-wine to-wine-dark shadow-lift animate-fade-in">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-rose-light hover:bg-white/10"
              aria-label={m.nav.close}
              autoFocus
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="hidden h-12 items-center justify-end px-8 pt-4 lg:flex print:hidden">
        <SaveIndicator state={saveState} m={m} />
      </div>

      <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-2">
        {status === "loading" ? (
          <div className="flex min-h-[50vh] items-center justify-center gap-2 text-ink-muted" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> {m.app.loading}
          </div>
        ) : status === "error" ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-danger/20 bg-danger-soft p-6 text-danger" role="alert">
            <CircleAlert className="mb-2 size-6" aria-hidden />
            <p className="font-medium">{m.app.loadError}</p>
            <p className="mt-1 text-sm">{m.app.loadErrorHint}</p>
            {!pathname.startsWith("/impostazioni") && (
              <Link href="/impostazioni/" className="mt-3 inline-block text-sm font-medium underline">
                {m.nav.settings}
              </Link>
            )}
            {pathname.startsWith("/impostazioni") && <div className="mt-4">{children}</div>}
          </div>
        ) : (
          <div className="animate-fade-in">{children}</div>
        )}
      </main>
    </div>
  );
}

function SaveIndicator({ state, m, compact }: { state: ReturnType<typeof useStore>["saveState"]; m: ReturnType<typeof useStore>["m"]; compact?: boolean }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: Loader2, text: m.app.saving, cls: "text-ink-muted", spin: true },
    saved: { icon: Check, text: m.app.saved, cls: "text-sage-dark", spin: false },
    error: { icon: CircleAlert, text: m.app.saveError, cls: "text-danger", spin: false },
  } as const;
  const { icon: Icon, text, cls, spin } = map[state];
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", cls)} role="status" aria-live="polite">
      <Icon className={cn("size-3.5", spin && "animate-spin")} aria-hidden />
      <span className={compact ? "sr-only" : undefined}>{text}</span>
    </span>
  );
}
