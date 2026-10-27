"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Dialog({
  open, onOpenChange, title, description, children, footer, className, closeLabel = "Chiudi",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] animate-overlay-in" />
        <D.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-lift animate-dialog-in focus:outline-none",
            className,
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
            <div>
              <D.Title className="font-serif text-lg font-semibold text-ink">{title}</D.Title>
              {description && <D.Description className="mt-1 text-sm text-ink-muted">{description}</D.Description>}
            </div>
            <D.Close className="rounded-lg p-1.5 text-ink-muted hover:bg-beige hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine/40" aria-label={closeLabel}>
              <X className="size-4" />
            </D.Close>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
