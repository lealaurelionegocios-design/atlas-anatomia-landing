import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Etichetta + controllo + suggerimento + errore, con collegamenti ARIA. */
export function Field({
  id, label, hint, error, optional, children, className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-subtle">({optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Proprietà ARIA da passare al controllo dentro <Field>. */
export const fieldAria = (id: string, error?: string | null, hint?: boolean) => ({
  id,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});
