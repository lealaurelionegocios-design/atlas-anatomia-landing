import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PERIODS, PERIOD_LABELS, type Period } from "@/lib/dates";

/** GET form for choosing a reporting period (works without JavaScript). */
export function PeriodFilter({
  action,
  period,
  from,
  to,
  hidden,
}: {
  action: string;
  period: Period;
  from?: string;
  to?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div>
        <label htmlFor="period" className="mb-1 block text-xs font-medium text-muted">
          Period
        </label>
        <Select id="period" name="period" defaultValue={period} className="w-44">
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="from" className="mb-1 block text-xs font-medium text-muted">
          From (custom)
        </label>
        <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
      </div>
      <div>
        <label htmlFor="to" className="mb-1 block text-xs font-medium text-muted">
          To (custom)
        </label>
        <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
      </div>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}

export function parsePeriod(value: string | undefined, fallback: Period = "this_month"): Period {
  return (PERIODS as readonly string[]).includes(value ?? "") ? (value as Period) : fallback;
}
