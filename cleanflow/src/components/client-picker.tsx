"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select } from "@/components/ui/form";
import { ClientForm } from "@/app/(app)/clients/client-form";

export interface ClientOption {
  id: string;
  name: string;
}

/** Client <select> with an inline "Add client" dialog. */
export function ClientPicker({
  id,
  value,
  onChange,
  options,
  terms,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (id: string) => void;
  options: ClientOption[];
  terms: { postalCode: string; region: string };
  invalid?: boolean;
  describedBy?: string;
}) {
  const [extra, setExtra] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const all = [...options, ...extra.filter((e) => !options.some((o) => o.id === e.id))];
  return (
    <div className="flex gap-2">
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} aria-describedby={describedBy}>
        <option value="">Select a client…</option>
        {all.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="shrink-0">
            <UserPlus /> <span className="hidden sm:inline">New client</span>
            <span className="sr-only sm:hidden">New client</span>
          </Button>
        </DialogTrigger>
        <DialogContent title="Add client" className="max-w-2xl">
          <ClientForm
            terms={terms}
            submitLabel="Add and select"
            onSaved={(newId, name) => {
              setExtra((e) => [...e, { id: newId, name }]);
              onChange(newId);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
