"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DocPreview } from "@/components/doc-preview";
import { DOCUMENT_DISCLAIMER, PLACEHOLDERS, documentTemplate, editableSlots, renderDocument } from "@/lib/documents/templates";
import type { DocContext, DocOverrides } from "@/lib/documents/types";
import { resetDocumentCustomization, saveDocumentCustomization } from "../actions";

export function DocumentEditor({
  slug,
  title,
  ctx,
  saved,
  clients,
  clientId,
  jobId,
  paper,
}: {
  slug: string;
  title: string;
  ctx: DocContext;
  saved: DocOverrides;
  clients: { id: string; name: string }[];
  clientId: string | null;
  jobId: string | null;
  paper: "LETTER" | "A4";
}) {
  const router = useRouter();
  const template = documentTemplate(slug)!;
  const [overrides, setOverrides] = useState<DocOverrides>(saved);
  const [saving, setSaving] = useState(false);
  const slots = useMemo(() => editableSlots(template.build(ctx)), [template, ctx]);
  const blocks = useMemo(() => renderDocument(template, ctx, overrides), [template, ctx, overrides]);
  const dirty = JSON.stringify(overrides) !== JSON.stringify(saved);

  const query = new URLSearchParams({ ...(clientId ? { clientId } : {}), ...(jobId ? { jobId } : {}) }).toString();
  const pdfHref = `/api/pdf/document/${slug}${query ? `?${query}` : ""}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <div className="no-print space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Fill & export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.usesClient && !jobId && (
              <Field id="doc-client" label="Fill with client details" hint="Only the client you choose is added to the document.">
                {(p) => (
                  <Select
                    {...p}
                    value={clientId ?? ""}
                    onChange={(e) => router.replace(`/documents/${slug}${e.target.value ? `?clientId=${e.target.value}` : ""}`)}
                  >
                    <option value="">Blank (no client)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            {jobId && <p className="text-sm text-muted">Filled from the selected job.</p>}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={pdfHref} target="_blank" rel="noopener">
                  <Download /> Download PDF
                </a>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> Print
              </Button>
            </div>
            {dirty && <p className="text-xs text-warning">Save your edits to include them in the PDF.</p>}
          </CardContent>
        </Card>

        {slots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Edit text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted">
                Placeholders like <code>{"{{client_first_name}}"}</code> are filled in automatically. Available: {PLACEHOLDERS.map((p) => `{{${p}}}`).join(", ")}.
              </p>
              {slots.map((slot) => (
                <Field key={slot.id} id={`slot-${slot.id}`} label={slot.label.charAt(0).toUpperCase() + slot.label.slice(1)}>
                  {(p) => (
                    <Textarea
                      {...p}
                      rows={4}
                      maxLength={4000}
                      value={overrides[slot.id] ?? slot.text}
                      onChange={(e) => setOverrides((o) => ({ ...o, [slot.id]: e.target.value }))}
                    />
                  )}
                </Field>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  loading={saving}
                  disabled={!dirty}
                  onClick={async () => {
                    setSaving(true);
                    const res = await saveDocumentCustomization(slug, overrides);
                    setSaving(false);
                    if (!res.ok) return toast.error(res.error);
                    toast.success(res.message);
                    router.refresh();
                  }}
                >
                  <Save /> Save template
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" disabled={Object.keys(saved).length === 0 && !dirty}>
                      <RotateCcw /> Reset
                    </Button>
                  }
                  title="Reset to default text?"
                  description="Your saved wording for this document will be removed."
                  confirmLabel="Reset"
                  onConfirm={async () => {
                    const res = await resetDocumentCustomization(slug);
                    if (!res.ok) {
                      toast.error(res.error);
                      return false;
                    }
                    setOverrides({});
                    toast.success(res.message);
                    router.refresh();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <p className="no-print mb-2 text-sm font-medium text-muted">Preview</p>
        <DocPreview title={title} business={ctx.business} blocks={blocks} disclaimer={DOCUMENT_DISCLAIMER} paper={paper} />
      </div>
    </div>
  );
}
