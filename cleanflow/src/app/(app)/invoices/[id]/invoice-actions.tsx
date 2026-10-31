"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteInvoice, deletePayment, setInvoiceStatus } from "../actions";

export function IssueButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await setInvoiceStatus(id, "issued");
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message);
        router.refresh();
      }}
    >
      Issue invoice
    </Button>
  );
}

export function VoidInvoiceButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline">
          <Ban /> Void
        </Button>
      }
      title={`Void ${number}?`}
      description="A void invoice stays in your records but no longer counts as money owed. Invoices with payments cannot be voided."
      confirmLabel="Void invoice"
      onConfirm={async () => {
        const res = await setInvoiceStatus(id, "void");
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

export function DeleteInvoiceButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-danger">
          <Trash2 /> Delete draft
        </Button>
      }
      title={`Delete ${number}?`}
      description="This draft invoice will be permanently deleted."
      onConfirm={async () => {
        const res = await deleteInvoice(id);
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message);
        router.replace("/invoices");
        router.refresh();
      }}
    />
  );
}

export function DeletePaymentButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Remove payment ${label}`}>
          <Trash2 />
        </Button>
      }
      title="Remove this payment?"
      description={`The payment of ${label} will be deleted and the invoice balance will increase.`}
      confirmLabel="Remove"
      onConfirm={async () => {
        const res = await deletePayment(id);
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
