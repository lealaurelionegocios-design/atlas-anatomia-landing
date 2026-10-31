"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { loadDemoData, removeDemoData } from "@/app/demo-actions";

export function DemoDataButton({ mode, onDone }: { mode: "load" | "remove"; onDone?: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (mode === "load") {
    return (
      <Button
        variant="outline"
        loading={pending}
        onClick={async () => {
          setPending(true);
          const res = await loadDemoData();
          setPending(false);
          if (!res.ok) return toast.error(res.error);
          toast.success(res.message);
          onDone?.();
          router.refresh();
        }}
      >
        <Sparkles /> Load demo data
      </Button>
    );
  }
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <Trash2 /> Remove demo data
        </Button>
      }
      title="Remove all demo data?"
      description="Every record marked “Demo” (clients, documents, jobs, invoices, payments and expenses) will be deleted. Your own records are not affected."
      confirmLabel="Remove demo data"
      onConfirm={async () => {
        const res = await removeDemoData();
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message);
        router.refresh();
      }}
    />
  );
}
