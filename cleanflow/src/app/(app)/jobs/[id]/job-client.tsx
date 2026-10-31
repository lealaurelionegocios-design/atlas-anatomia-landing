"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { createInvoiceFromJob, deleteJob, setJobStatus, toggleChecklistItem, updateJob } from "../actions";

export function JobStatusButtons({ id, status, invoiced, cancelledLabel }: { id: string; status: string; invoiced: boolean; cancelledLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const go = async (next: string) => {
    setPending(next);
    const res = await setJobStatus(id, next);
    setPending(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(next === "completed" ? "Job marked as completed" : res.message);
    router.refresh();
  };
  const buttons: Array<[string, string, "primary" | "outline"]> = [];
  if (status === "scheduled") buttons.push(["in_progress", "Start job", "outline"], ["completed", "Mark completed", "primary"], ["cancelled", `Mark ${cancelledLabel.toLowerCase()}`, "outline"]);
  if (status === "in_progress") buttons.push(["completed", "Mark completed", "primary"], ["scheduled", "Back to scheduled", "outline"]);
  if ((status === "completed" && !invoiced) || status === "cancelled") buttons.push(["scheduled", "Reopen", "outline"]);
  return (
    <>
      {buttons.map(([s, label, variant]) => (
        <Button key={s} variant={variant} onClick={() => go(s)} loading={pending === s} disabled={!!pending}>
          {label}
        </Button>
      ))}
    </>
  );
}

export function CreateInvoiceButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await createInvoiceFromJob(jobId);
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message);
        router.push(`/invoices/${res.data.id}`);
      }}
    >
      <Receipt /> Create invoice
    </Button>
  );
}

type Item = { id: string; section: string; label: string; done: boolean };

export function Checklist({ items, disabled }: { items: Item[]; disabled?: boolean }) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(items, (state, update: { id: string; done: boolean }) =>
    state.map((i) => (i.id === update.id ? { ...i, done: update.done } : i)),
  );
  const done = optimistic.filter((i) => i.done).length;
  const sections = [...new Set(optimistic.map((i) => i.section))];
  const pct = optimistic.length ? Math.round((done / optimistic.length) * 100) : 0;

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted">Progress</span>
          <span className="font-medium" aria-live="polite">
            {done} of {optimistic.length} done
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-mint" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress">
          <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="space-y-5">
        {sections.map((section) => (
          <fieldset key={section}>
            <legend className="mb-2 text-sm font-semibold text-forest">{section}</legend>
            <ul className="space-y-1">
              {optimistic
                .filter((i) => i.section === section)
                .map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-canvas">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 accent-[#22694E]"
                        checked={item.done}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          startTransition(async () => {
                            setOptimistic({ id: item.id, done: next });
                            const res = await toggleChecklistItem(item.id, next);
                            if (!res.ok) toast.error(res.error);
                          });
                        }}
                      />
                      <span className={item.done ? "text-muted line-through" : ""}>{item.label}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

export function EditJobDialog({
  id,
  defaults,
  currencySymbol,
  priceLocked,
}: {
  id: string;
  defaults: { scheduled_date: string; start_time: string; duration_minutes: number; price: number; execution_notes: string };
  currencySymbol: string;
  priceLocked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent title="Edit job">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            const res = await updateJob(id, Object.fromEntries(fd.entries()));
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
          <Field id="scheduled_date" label="Date" error={errors.scheduled_date}>
            {(p) => <Input {...p} name="scheduled_date" type="date" defaultValue={defaults.scheduled_date} />}
          </Field>
          <Field id="start_time" label="Start time" error={errors.start_time}>
            {(p) => <Input {...p} name="start_time" type="time" defaultValue={defaults.start_time.slice(0, 5)} />}
          </Field>
          <Field id="duration_minutes" label="Duration (minutes)" error={errors.duration_minutes}>
            {(p) => <Input {...p} name="duration_minutes" type="number" min={15} step={15} defaultValue={defaults.duration_minutes} />}
          </Field>
          <Field id="price" label={`Price (${currencySymbol})`} error={errors.price} hint={priceLocked ? "Locked: this job has an invoice." : undefined}>
            {(p) => <Input {...p} name="price" type="number" min={0} step="0.01" defaultValue={defaults.price} readOnly={priceLocked} />}
          </Field>
          <Field id="execution_notes" label="Notes" error={errors.execution_notes} className="sm:col-span-2">
            {(p) => <Textarea {...p} name="execution_notes" defaultValue={defaults.execution_notes} />}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteJobButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-danger">
          <Trash2 /> Delete job
        </Button>
      }
      title="Delete this job?"
      description="The booking and its checklist will be deleted. Jobs with an invoice cannot be deleted."
      onConfirm={async () => {
        const res = await deleteJob(id);
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message);
        router.replace("/jobs");
        router.refresh();
      }}
    />
  );
}
