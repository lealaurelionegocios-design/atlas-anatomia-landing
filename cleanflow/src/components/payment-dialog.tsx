"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { recordPayment } from "@/app/(app)/invoices/actions";

export interface PayableInvoice {
  id: string;
  label: string;
  balance: number;
  balanceLabel: string;
}

/** Records a payment received (cash, check/cheque, transfer…). No card processing. */
export function PaymentDialog({
  invoices,
  today,
  methods,
  triggerLabel = "Record payment",
  variant = "primary",
}: {
  invoices: PayableInvoice[];
  today: string;
  methods: { value: string; label: string }[];
  triggerLabel?: string;
  variant?: "primary" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [invoiceId, setInvoiceId] = useState(invoices.length === 1 ? invoices[0].id : "");
  const selected = invoices.find((i) => i.id === invoiceId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErrors({});
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} disabled={invoices.length === 0}>
          <HandCoins /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent title="Record a payment" description="Record money you have received. CleanFlow does not process card payments.">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            const res = await recordPayment({ ...Object.fromEntries(fd.entries()), invoice_id: invoiceId });
            setPending(false);
            if (!res.ok) {
              setErrors(res.fieldErrors ?? {});
              return toast.error(res.error);
            }
            toast.success(res.message);
            setOpen(false);
            router.refresh();
          }}
        >
          <Field id="pay-invoice" label="Invoice" required error={errors.invoice_id} className="sm:col-span-2">
            {(p) => (
              <Select {...p} value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} disabled={invoices.length === 1}>
                <option value="">Select an invoice…</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label} — {i.balanceLabel} due
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="pay-amount" label="Amount received" required error={errors.amount} hint={selected ? `Outstanding: ${selected.balanceLabel}` : undefined}>
            {(p) => <Input {...p} key={invoiceId} name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" defaultValue={selected?.balance ?? ""} />}
          </Field>
          <Field id="pay-date" label="Date received" required error={errors.paid_on}>
            {(p) => <Input {...p} name="paid_on" type="date" defaultValue={today} />}
          </Field>
          <Field id="pay-method" label="Method" error={errors.method}>
            {(p) => (
              <Select {...p} name="method" defaultValue="bank_transfer">
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="pay-ref" label="Reference" error={errors.reference}>
            {(p) => <Input {...p} name="reference" placeholder="Optional" />}
          </Field>
          <Field id="pay-notes" label="Notes" error={errors.notes} className="sm:col-span-2">
            {(p) => <Textarea {...p} name="notes" rows={2} />}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending} disabled={!invoiceId}>
              Save payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
