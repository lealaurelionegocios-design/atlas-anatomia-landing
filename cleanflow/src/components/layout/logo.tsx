import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className, light = false }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold", light ? "text-white" : "text-forest", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? "#22694E" : "#173F37"} />
        <path d="M9 17.5c2.5 4 11 4.5 14-2.5" stroke="#D8EDE0" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="21.5" cy="10" r="2.6" fill="#22694E" stroke="#D8EDE0" strokeWidth="1.4" />
      </svg>
      <span className="leading-tight">
        CleanFlow
        <span className={cn("block text-[11px] font-medium", light ? "text-mint/80" : "text-muted")}>Business Manager</span>
      </span>
    </Link>
  );
}
