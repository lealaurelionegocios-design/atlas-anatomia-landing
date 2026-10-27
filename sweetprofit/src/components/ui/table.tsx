import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const TableWrap = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("overflow-x-auto rounded-2xl border border-line/70 bg-white shadow-card", className)} {...p} />
);
export const Table = ({ className, ...p }: HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full border-collapse text-sm", className)} {...p} />
);
export const Th = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" className={cn("whitespace-nowrap border-b border-line bg-cream/70 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted", className)} {...p} />
);
export const Td = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("border-b border-line/60 px-4 py-3 align-middle text-ink", className)} {...p} />
);
export const Tr = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-colors hover:bg-cream/50 [&:last-child>td]:border-b-0", className)} {...p} />
);
