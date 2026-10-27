import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({ title, subtitle, actions, icon: Icon }: { title: string; subtitle?: string; actions?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-light text-wine sm:flex">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, className }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream/60 px-6 py-12 text-center", className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-rose-light text-wine">
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>
      {body && <p className="mt-1.5 max-w-md text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon: Icon, tone = "wine",
}: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: "wine" | "sage" | "rose" | "beige" }) {
  const tones = {
    wine: "bg-wine text-white",
    sage: "bg-sage text-sage-dark",
    rose: "bg-rose-light text-wine",
    beige: "bg-beige text-wine-dark",
  };
  return (
    <div className="animate-fade-in rounded-2xl border border-line/70 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-serif text-[26px] font-semibold leading-tight tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "info", icon: Icon, children, className }: { tone?: "info" | "warn" | "bad" | "good"; icon?: LucideIcon; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-rose-light bg-cream text-ink",
    warn: "border-warn/20 bg-warn-soft text-warn",
    bad: "border-danger/20 bg-danger-soft text-danger",
    good: "border-sage-dark/20 bg-sage text-sage-dark",
  };
  return (
    <div role={tone === "bad" || tone === "warn" ? "alert" : undefined} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm", tones[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Indicatore visivo del margine con soglie: rosso < 0, ambra < obiettivo, verde ≥ obiettivo. */
export function MarginPill({ value, target, label }: { value: number | null; target?: number; label: string }) {
  if (value == null) return <span className="text-ink-subtle">—</span>;
  const tone = value < 0 ? "bg-danger-soft text-danger" : target != null && value < target - 0.05 ? "bg-warn-soft text-warn" : "bg-sage text-sage-dark";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", tone)}>{label}</span>;
}
