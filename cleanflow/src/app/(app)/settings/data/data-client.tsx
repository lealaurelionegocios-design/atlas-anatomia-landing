"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { deleteAccount } from "../actions";

export function DeleteAccount({ businessName }: { businessName: string }) {
  const [confirm, setConfirm] = useState("");
  return (
    <ConfirmDialog
      trigger={
        <Button variant="danger">
          <Trash2 /> Delete account and all data
        </Button>
      }
      title="Delete your account?"
      description={
        <>
          This permanently deletes your login, business settings and <strong>every</strong> client, document, job, invoice, payment and expense. Export your data first —
          you may need invoice records for tax purposes.
        </>
      }
      confirmLabel="Delete permanently"
      onConfirm={async () => {
        const res = await deleteAccount(confirm);
        if (res && !res.ok) {
          toast.error(res.error);
          return false;
        }
      }}
    >
      <label htmlFor="confirm-name" className="mt-4 block text-sm font-medium">
        Type <span className="font-semibold">{businessName}</span> to confirm
      </label>
      <Input id="confirm-name" className="mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
    </ConfirmDialog>
  );
}
