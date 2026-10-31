"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { addExpense, deleteExpense } from "./actions";

export function ExpenseDialog({ today, categories, currencySymbol }: { today: string; categories: { value: string; label: string }[]; currencySymbol: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus /> Add expense
        </Button>
      </DialogTrigger>
      <DialogContent title="Add an expense" description="Record business costs such as supplies, fuel or insurance.">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setPending(true);
            const res = await addExpense(Object.fromEntries(new FormData(form).entries()));
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
          <Field id="exp-desc" label="Description" required error={errors.description} className="sm:col-span-2">
            {(p) => <Input {...p} name="description" placeholder="e.g. Microfibre cloths" />}
          </Field>
          <Field id="exp-amount" label={`Amount (${currencySymbol})`} required error={errors.amount}>
            {(p) => <Input {...p} name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" />}
          </Field>
          <Field id="exp-date" label="Date" required error={errors.spent_on}>
            {(p) => <Input {...p} name="spent_on" type="date" defaultValue={today} />}
          </Field>
          <Field id="exp-cat" label="Category" error={errors.category} className="sm:col-span-2">
            {(p) => (
              <Select {...p} name="category" defaultValue="supplies">
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending}>
              Save expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Delete expense ${label}`}>
          <Trash2 />
        </Button>
      }
      title="Delete this expense?"
      description={`“${label}” will be permanently deleted.`}
      onConfirm={async () => {
        const res = await deleteExpense(id);
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
