import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const field =
  "w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-subtle transition-colors focus:border-wine/60 focus:outline-none focus:ring-2 focus:ring-wine/15 disabled:bg-beige disabled:text-ink-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-10", className)} {...p} />
));
Input.displayName = "Input";

/** Campo numerico: testo con tastiera decimale, accetta virgola o punto. */
export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { suffix?: string }>(
  ({ className, suffix, ...p }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn(field, "h-10 tabular-nums", suffix && "pr-10", className)}
        {...p}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-subtle">{suffix}</span>
      )}
    </div>
  ),
);
NumberInput.displayName = "NumberInput";

const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236E5F65' stroke-width='2' viewBox='0 0 24 24'><path d='m6 9 6 6 6-6'/></svg>\")";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, style, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(field, "h-10 cursor-pointer appearance-none pr-9", className)}
    style={{ backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.6rem center", backgroundSize: 16, ...style }}
    {...p}
  />
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[80px] py-2", className)} {...p} />
));
Textarea.displayName = "Textarea";
