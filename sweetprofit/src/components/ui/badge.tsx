import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium [&_svg]:size-3", {
  variants: {
    variant: {
      default: "bg-rose-light text-wine-dark",
      demo: "border border-dashed border-wine/40 bg-cream text-wine",
      good: "bg-sage text-sage-dark",
      warn: "bg-warn-soft text-warn",
      bad: "bg-danger-soft text-danger",
      neutral: "bg-beige text-ink-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export const Badge = ({ className, variant, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => (
  <span className={cn(badge({ variant }), className)} {...p} />
);
