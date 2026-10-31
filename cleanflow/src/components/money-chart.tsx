"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

export interface ChartPoint {
  label: string;
  received: number;
  expenses: number;
}

/** Received vs expenses by month. */
export function MoneyChart({ data, currency, market }: { data: ChartPoint[]; currency: string; market: string }) {
  const fmt = (n: number) => formatMoney(n, currency, market);
  const hasData = data.some((d) => d.received || d.expenses);
  if (!hasData) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted">No payments or expenses in this period yet.</p>;
  }
  return (
    <figure>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#DFE7E2" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#5B6E68" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#5B6E68" width={64} tickFormatter={(v: number) => fmt(v).replace(/\.00$/, "")} />
            <Tooltip formatter={(v) => fmt(Number(v))} cursor={{ fill: "#D8EDE0", opacity: 0.4 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="received" name="Received" fill="#22694E" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="expenses" name="Expenses" fill="#B9C9C1" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: received ${fmt(d.received)}, expenses ${fmt(d.expenses)}`).join("; ")}
      </figcaption>
    </figure>
  );
}
