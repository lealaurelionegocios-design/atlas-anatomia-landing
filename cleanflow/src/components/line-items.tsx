"use client";

import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { formatMoney, lineAmount, sumMoney } from "@/lib/money";

type ItemsForm = { items: { description: string; quantity: unknown; unit_price: unknown }[] };

/** Editable list of line items (description, quantity, unit price). */
export function LineItemsEditor({
  control: controlProp,
  register: registerProp,
  errors,
  currency,
  market,
}: {
  /** The parent form's control/register; the form must have an `items` array. */
  control: unknown;
  register: unknown;
  errors: FieldErrors<ItemsForm> | FieldErrors;
  currency: string;
  market: string;
}) {
  const control = controlProp as Control<ItemsForm>;
  const register = registerProp as UseFormRegister<ItemsForm>;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = (useWatch({ control, name: "items" }) ?? []) as ItemsForm["items"];
  const amounts = items.map((i) => {
    const q = Number(i?.quantity);
    const p = Number(i?.unit_price);
    return Number.isFinite(q) && Number.isFinite(p) ? lineAmount(q, p) : 0;
  });
  const total = sumMoney(amounts);
  const itemErrors = (errors as FieldErrors<ItemsForm>).items;

  return (
    <div>
      <div className="hidden grid-cols-[1fr_6rem_8rem_7rem_2.5rem] gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <ul className="space-y-3 sm:space-y-2">
        {fields.map((field, index) => {
          const e = Array.isArray(itemErrors) ? itemErrors[index] : undefined;
          return (
            <li key={field.id} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_6rem_8rem_7rem_2.5rem] sm:items-start sm:border-0 sm:p-0">
              <div className="col-span-2 sm:col-span-1">
                <label className="sr-only" htmlFor={`items.${index}.description`}>
                  Description, line {index + 1}
                </label>
                <Input
                  id={`items.${index}.description`}
                  placeholder="Description"
                  aria-invalid={e?.description ? true : undefined}
                  {...register(`items.${index}.description`)}
                />
                {e?.description && <p className="mt-1 text-xs text-danger">{e.description.message}</p>}
              </div>
              <div>
                <label className="text-xs text-muted sm:sr-only" htmlFor={`items.${index}.quantity`}>
                  Quantity
                </label>
                <Input
                  id={`items.${index}.quantity`}
                  type="number"
                  step="0.25"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={e?.quantity ? true : undefined}
                  {...register(`items.${index}.quantity`)}
                />
                {e?.quantity && <p className="mt-1 text-xs text-danger">{e.quantity.message}</p>}
              </div>
              <div>
                <label className="text-xs text-muted sm:sr-only" htmlFor={`items.${index}.unit_price`}>
                  Unit price
                </label>
                <Input
                  id={`items.${index}.unit_price`}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  aria-invalid={e?.unit_price ? true : undefined}
                  {...register(`items.${index}.unit_price`)}
                />
                {e?.unit_price && <p className="mt-1 text-xs text-danger">{e.unit_price.message}</p>}
              </div>
              <p className="self-center text-sm font-medium tabular-nums sm:pt-2 sm:text-right">{formatMoney(amounts[index], currency, market)}</p>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove line ${index + 1}`}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {itemErrors && !Array.isArray(itemErrors) && "message" in itemErrors && (
        <p className="mt-2 text-xs text-danger">{String(itemErrors.message)}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unit_price: 0 })} disabled={fields.length >= 50}>
          <Plus /> Add line
        </Button>
        <p className="text-base">
          <span className="text-muted">Total </span>
          <span className="font-semibold tabular-nums" data-testid="items-total">
            {formatMoney(total, currency, market)}
          </span>
        </p>
      </div>
    </div>
  );
}
