"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasDemoData, removeDemoData } from "@/lib/domain/demo";
import { useStore } from "@/lib/store/AppStore";

export function DemoBanner() {
  const { data, update, m } = useStore();
  const [open, setOpen] = useState(false);
  if (!hasDemoData(data)) return null;
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-dashed border-wine/30 bg-rose-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-start gap-2.5 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden />
          <p>
            <span className="font-medium text-wine-dark">{m.demo.banner}</span>{" "}
            <span className="text-ink-muted">{m.demo.bannerHint}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="self-start sm:self-auto">{m.demo.remove}</Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={m.demo.removeTitle}
        body={m.demo.removeBody}
        confirmLabel={m.demo.remove}
        onConfirm={() => {
          const kept = removeDemoData(data).keptIngredients;
          update((d) => removeDemoData(d).data);
          toast.success(m.demo.removed, { description: kept ? m.demo.keptSome(kept) : undefined });
        }}
      />
    </>
  );
}
