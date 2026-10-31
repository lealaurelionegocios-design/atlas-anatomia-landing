import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-canvas text-muted border-line",
  brand: "bg-mint text-forest border-mint-strong",
  info: "bg-info-soft text-info border-info/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  success: "bg-mint text-brand border-mint-strong",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  declined: "danger",
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
  unpaid: "warning",
  partially_paid: "info",
  paid: "success",
  overdue: "danger",
  void: "neutral",
  issued: "info",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}

export function DemoBadge() {
  return (
    <Badge tone="warning" title="Demonstration record — remove it any time in Settings → Data">
      Demo
    </Badge>
  );
}
