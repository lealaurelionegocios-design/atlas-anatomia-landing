"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { convertQuoteToJob, deleteQuote, setQuoteStatus } from "../actions";

export function QuoteStatusButtons({ id, status, converted }: { id: string; status: string; converted: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  if (converted) return null;
  const go = async (next: string) => {
    setPending(next);
    const res = await setQuoteStatus(id, next);
    setPending(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  };
  const options: Array<[string, string, "primary" | "outline"]> = [];
  if (status === "draft") options.push(["sent", "Mark as sent", "outline"]);
  if (status === "draft" || status === "sent") options.push(["accepted", "Mark accepted", "primary"], ["declined", "Mark declined", "outline"]);
  if (status === "accepted" || status === "declined" || status === "sent") options.push(["draft", "Back to draft", "outline"]);
  return (
    <>
      {options.map(([s, label, variant]) => (
        <Button key={s} variant={variant} onClick={() => go(s)} loading={pending === s} disabled={!!pending}>
          {label}
        </Button>
      ))}
    </>
  );
}

export function ConvertToJobDialog({
  quoteId,
  defaultDate,
  defaultDuration,
  checklists,
  defaultChecklist,
}: {
  quoteId: string;
  defaultDate: string;
  defaultDuration: number;
  checklists: { slug: string; title: string }[];
  defaultChecklist: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarDays /> Book as job
        </Button>
      </DialogTrigger>
      <DialogContent title="Book this job" description="Creates a scheduled job with the agreed price and a checklist.">
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            const res = await convertQuoteToJob({
              quote_id: quoteId,
              scheduled_date: fd.get("scheduled_date"),
              start_time: fd.get("start_time"),
              duration_minutes: fd.get("duration_minutes"),
              checklist_slug: fd.get("checklist_slug"),
            });
            setPending(false);
            if (!res.ok) {
              setErrors(res.fieldErrors ?? {});
              return toast.error(res.error);
            }
            toast.success(res.message);
            router.push(`/jobs/${res.data.id}`);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="scheduled_date" label="Date" required error={errors.scheduled_date}>
              {(p) => <Input {...p} name="scheduled_date" type="date" defaultValue={defaultDate} required />}
            </Field>
            <Field id="start_time" label="Start time" required error={errors.start_time}>
              {(p) => <Input {...p} name="start_time" type="time" defaultValue="09:00" required />}
            </Field>
            <Field id="duration_minutes" label="Duration (minutes)" required error={errors.duration_minutes}>
              {(p) => <Input {...p} name="duration_minutes" type="number" min={15} step={15} defaultValue={defaultDuration} />}
            </Field>
            <Field id="checklist_slug" label="Checklist">
              {(p) => (
                <Select {...p} name="checklist_slug" defaultValue={defaultChecklist}>
                  {checklists.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                  <option value="none">No checklist</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" loading={pending}>
              Book job
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteQuoteButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-danger">
          <Trash2 /> Delete
        </Button>
      }
      title={`Delete ${number}?`}
      description="This deletes the document and all of its versions. It cannot be undone."
      onConfirm={async () => {
        const res = await deleteQuote(id);
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(res.message);
        router.replace("/quotes");
        router.refresh();
      }}
    />
  );
}
