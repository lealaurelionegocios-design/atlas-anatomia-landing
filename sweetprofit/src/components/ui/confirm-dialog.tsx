"use client";

import { useState, type ReactNode } from "react";
import { useMessages } from "@/lib/store/AppStore";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Input } from "./input";

/** Conferma per azioni distruttive. Con `typeToConfirm` richiede di digitare una parola. */
export function ConfirmDialog({
  open, onOpenChange, title, body, confirmLabel, onConfirm, danger = true, typeToConfirm, typeLabel, hideConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  danger?: boolean;
  typeToConfirm?: string;
  typeLabel?: string;
  hideConfirm?: boolean;
}) {
  const m = useMessages();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = typeToConfirm ? typed.trim().toUpperCase() !== typeToConfirm : false;
  const close = (o: boolean) => {
    if (!o) setTyped("");
    onOpenChange(o);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={title}
      closeLabel={m.common.close}
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>
            {hideConfirm ? m.common.close : m.common.cancel}
          </Button>
          {!hideConfirm && (
            <Button
              variant={danger ? "danger" : "default"}
              disabled={blocked || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm?.();
                  close(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel ?? m.common.confirm}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-muted">
        {body}
        {typeToConfirm && (
          <label className="block space-y-1.5">
            <span className="font-medium text-ink">{typeLabel}</span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        )}
      </div>
    </Dialog>
  );
}
