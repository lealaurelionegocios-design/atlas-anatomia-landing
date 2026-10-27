"use client";

import { CloudDownload, CloudUpload, Info, Save, Settings as SettingsIcon, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, fieldAria } from "@/components/ui/field";
import { Input, NumberInput, Select } from "@/components/ui/input";
import { Notice, PageHeader } from "@/components/ui/misc";
import { updateSettings } from "@/lib/domain/actions";
import { createDemoData, hasDemoData, removeDemoData } from "@/lib/domain/demo";
import type { AppData, RoundingMode, RoundingStep } from "@/lib/domain/types";
import { LOCALES } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n/format";
import { backupFileName, parseBackup, serializeBackup } from "@/lib/storage/backup";
import { useStore } from "@/lib/store/AppStore";
import { downloadText } from "@/lib/utils/csv";
import { centsToInput, numberToInput, parseEuroToCents, parseLocaleNumber } from "@/lib/utils/parse";

export function SettingsPage() {
  const { data, status, update, replaceAll, wipe, m } = useStore();
  const t = m.settings;
  const s = data.settings;
  const v = m.validation;

  const [name, setName] = useState(s.businessName);
  const [margin, setMargin] = useState(numberToInput(s.defaultMarginPercent));
  const [rate, setRate] = useState(centsToInput(s.defaultHourlyRateCents));
  const [fee, setFee] = useState(numberToInput(s.defaultFeePercent));
  const [vat, setVat] = useState(numberToInput(s.vatPercent));
  const [fixed, setFixed] = useState(centsToInput(s.defaultFixedCostPerBatchCents));
  const [step, setStep] = useState<RoundingStep>(s.roundingStepCents);
  const [mode, setMode] = useState<RoundingMode>(s.roundingMode);
  const [submitted, setSubmitted] = useState(false);

  const mN = parseLocaleNumber(margin);
  const rC = parseEuroToCents(rate);
  const fN = fee.trim() ? parseLocaleNumber(fee) : 0;
  const vN = vat.trim() ? parseLocaleNumber(vat) : 0;
  const xC = fixed.trim() ? parseEuroToCents(fixed) : 0;
  const errors = {
    margin: mN == null || mN < 0 || mN >= 100 ? v.percent : null,
    rate: rC == null ? v.number : rC < 0 ? v.nonNegative : null,
    fee: fN == null || fN < 0 || fN >= 100 ? v.percent : null,
    vat: vN == null || vN < 0 || vN > 100 ? v.vat : null,
    fixed: xC == null ? v.number : xC < 0 ? v.nonNegative : null,
  };
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    update((d) =>
      updateSettings(d, {
        businessName: name.trim(), defaultMarginPercent: mN!, defaultHourlyRateCents: rC!, defaultFeePercent: fN!, vatPercent: vN!,
        defaultFixedCostPerBatchCents: xC!, roundingStepCents: step, roundingMode: mode,
      }),
    );
    toast.success(t.saved);
  };

  // Backup
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ data: AppData; exportedAt: string } | null>(null);
  const exportBackup = () => {
    const now = new Date();
    const withDate = updateSettings(data, { lastBackupAt: now.toISOString() });
    downloadText(backupFileName(now), serializeBackup(withDate, now), "application/json");
    update((d) => updateSettings(d, { lastBackupAt: now.toISOString() }));
    toast.success(t.exported);
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = parseBackup(await file.text());
    if (!r.ok) {
      toast.error(t.importErrors[r.error], { description: r.detail });
      return;
    }
    setPendingImport({ data: r.data, exportedAt: r.exportedAt });
  };

  const [wipeOpen, setWipeOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const demoPresent = hasDemoData(data);

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} icon={SettingsIcon} />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px] [&>*]:min-w-0">
        {status !== "error" ? (
          <form onSubmit={save} noValidate className="space-y-6">
            <Card>
              <CardHeader><CardTitle>{t.business}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <Field id="s-name" label={t.businessName} optional={m.common.optional} className="sm:col-span-3">
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.businessNamePh} maxLength={120} />
                </Field>
                <Field id="s-cur" label={t.currency}>
                  <Input id="s-cur" value={t.currencyValue} disabled readOnly />
                </Field>
                <Field id="s-lang" label={t.language} hint={t.languageNote} className="sm:col-span-2">
                  <Select id="s-lang" value={s.locale} disabled aria-describedby="s-lang-hint">
                    {Object.entries(LOCALES).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.defaults}</CardTitle>
                <CardDescription>{t.defaultsHint}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="s-margin" label={t.defMargin} error={err("margin")}>
                  <NumberInput {...fieldAria("s-margin", err("margin"))} value={margin} onChange={(e) => setMargin(e.target.value)} suffix="%" />
                </Field>
                <Field id="s-rate" label={t.defRate} error={err("rate")}>
                  <NumberInput {...fieldAria("s-rate", err("rate"))} value={rate} onChange={(e) => setRate(e.target.value)} suffix="€/h" />
                </Field>
                <Field id="s-fee" label={t.defFee} error={err("fee")} hint={m.calculator.feesHint}>
                  <NumberInput {...fieldAria("s-fee", err("fee"), true)} value={fee} onChange={(e) => setFee(e.target.value)} suffix="%" />
                </Field>
                <Field id="s-vat" label={t.defVat} error={err("vat")} hint={t.defVatHint}>
                  <NumberInput {...fieldAria("s-vat", err("vat"), true)} value={vat} onChange={(e) => setVat(e.target.value)} suffix="%" />
                </Field>
                <Field id="s-fixed" label={t.defFixed} error={err("fixed")} hint={m.calculator.fixedHint} className="sm:col-span-2">
                  <NumberInput {...fieldAria("s-fixed", err("fixed"), true)} value={fixed} onChange={(e) => setFixed(e.target.value)} suffix="€" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.roundingTitle}</CardTitle>
                <CardDescription>{t.roundingNote}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="s-step" label={t.roundingStep}>
                  <Select id="s-step" value={step} onChange={(e) => setStep(Number(e.target.value) as RoundingStep)}>
                    {([1, 5, 10, 50, 100] as const).map((x) => <option key={x} value={x}>{m.rounding[x]}</option>)}
                  </Select>
                </Field>
                <Field id="s-mode" label={t.roundingMode}>
                  <Select id="s-mode" value={mode} onChange={(e) => setMode(e.target.value as RoundingMode)}>
                    <option value="up">{m.rounding.up}</option>
                    <option value="nearest">{m.rounding.nearest}</option>
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg"><Save /> {m.common.save}</Button>
            </div>
          </form>
        ) : (
          <div />
        )}

        <div className="space-y-6">
          <Card id="backup" className="scroll-mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><CloudDownload className="size-4 text-wine" aria-hidden />{t.backup}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Notice tone="warn" icon={Info}>{t.backupBody}</Notice>
              <p className="text-sm text-ink-muted">{t.lastBackup}: <strong className="text-ink">{formatDate(s.lastBackupAt)}</strong></p>
              <div className="flex flex-col gap-2">
                <Button type="button" onClick={exportBackup} disabled={status === "error"}><CloudDownload /> {t.export}</Button>
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><CloudUpload /> {t.import}</Button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-hidden tabIndex={-1} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-wine" aria-hidden />{t.demoTitle}</CardTitle></CardHeader>
            <CardContent>
              {demoPresent ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => setDemoOpen(true)}>{m.demo.remove}</Button>
              ) : (
                <Button
                  type="button" variant="outline" className="w-full"
                  onClick={() => {
                    const demo = createDemoData();
                    update((d) => ({ ...d, ingredients: [...d.ingredients, ...demo.ingredients.filter((i) => !d.ingredients.some((x) => x.id === i.id))], recipes: [...d.recipes, ...demo.recipes.filter((r) => !d.recipes.some((x) => x.id === r.id))] }));
                    toast.success(m.demo.loaded);
                  }}
                >
                  {m.demo.load}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-wine" aria-hidden />{t.privacy}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-ink-muted">{t.privacyBody}</p></CardContent>
          </Card>

          <Card className="border-danger/30">
            <CardHeader><CardTitle className="text-danger">{t.danger}</CardTitle></CardHeader>
            <CardContent>
              <Button type="button" variant="danger" className="w-full" onClick={() => setWipeOpen(true)}><Trash2 /> {t.deleteAll}</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingImport}
        onOpenChange={(o) => !o && setPendingImport(null)}
        title={t.importTitle}
        body={pendingImport && t.importBody(formatDate(pendingImport.exportedAt), pendingImport.data.recipes.length, pendingImport.data.ingredients.length)}
        confirmLabel={t.importDo}
        onConfirm={async () => {
          await replaceAll(pendingImport!.data);
          toast.success(t.imported);
          setTimeout(() => window.location.reload(), 400); // riallinea i moduli aperti ai nuovi dati
        }}
      />
      <ConfirmDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        title={t.deleteAllTitle}
        body={t.deleteAllBody}
        confirmLabel={t.deleteAll}
        typeToConfirm={t.deleteAllWord}
        typeLabel={t.deleteAllConfirmLabel(t.deleteAllWord)}
        onConfirm={async () => {
          await wipe();
          toast.success(t.deletedAll);
          setTimeout(() => window.location.reload(), 400);
        }}
      />
      <ConfirmDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        title={m.demo.removeTitle}
        body={m.demo.removeBody}
        confirmLabel={m.demo.remove}
        onConfirm={() => {
          const kept = removeDemoData(data).keptIngredients;
          update((d) => removeDemoData(d).data);
          toast.success(m.demo.removed, { description: kept ? m.demo.keptSome(kept) : undefined });
        }}
      />
    </>
  );
}
