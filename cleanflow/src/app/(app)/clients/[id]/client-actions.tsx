"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteClientPermanently, setClientArchived } from "../actions";

export function ClientDangerActions({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        trigger={
          <Button variant="outline">
            {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore" : "Archive"}
          </Button>
        }
        title={archived ? `Restore ${name}?` : `Archive ${name}?`}
        description={
          archived
            ? "The client will appear in lists and pickers again."
            : "Archived clients are hidden from lists and pickers. Their history is kept and you can restore them at any time."
        }
        confirmLabel={archived ? "Restore" : "Archive"}
        tone="primary"
        onConfirm={async () => {
          const res = await setClientArchived(id, !archived);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success(res.message);
          router.refresh();
        }}
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="text-danger">
            <Trash2 /> Delete permanently
          </Button>
        }
        title={`Permanently delete ${name}?`}
        description={
          <>
            <p>
              This erases the client and <strong>all linked estimates/quotes, jobs, invoices and payments</strong>. It cannot be undone.
            </p>
            <p className="mt-2">
              Use this for privacy erasure requests. You may be legally required to keep invoice and payment records for tax purposes —
              export them first from Settings → Data if needed.
            </p>
          </>
        }
        confirmLabel="Delete everything"
        onConfirm={async () => {
          const res = await deleteClientPermanently(id);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast.success(res.message);
          router.replace("/clients");
          router.refresh();
        }}
      />
    </div>
  );
}
