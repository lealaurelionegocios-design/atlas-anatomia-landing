"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RecipeSummary } from "@/lib/calc/analytics";
import { formatEUR } from "@/lib/i18n/format";
import { useMessages } from "@/lib/store/AppStore";
import { AXIS, COST_COLORS } from "./palette";

type Key = "ingredients" | "waste" | "labor" | "packaging" | "other";
const KEYS: Key[] = ["ingredients", "waste", "labor", "packaging", "other"];

/** Costo per unità di ogni ricetta, impilato per voce. */
export function CostStackChart({ summaries, height = 300 }: { summaries: RecipeSummary[]; height?: number }) {
  const m = useMessages();
  const rows = summaries
    .filter((s) => s.cost.unitCost != null)
    .map((s) => {
      const y = s.cost.yieldQuantity;
      return {
        name: s.recipe.name,
        ingredients: s.cost.ingredientsCost.div(y).toNumber(),
        waste: s.cost.wasteCost.div(y).toNumber(),
        labor: s.cost.laborCost.div(y).toNumber(),
        packaging: s.cost.packagingCost.div(y).toNumber(),
        other: s.cost.otherCost.div(y).toNumber(),
        total: s.cost.unitCost!.toNumber(),
      };
    });
  const used = KEYS.filter((k) => rows.some((r) => r[k] > 0));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={AXIS.grid} />
          <XAxis dataKey="name" tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: AXIS.grid }} interval={0} tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)} />
          <YAxis tick={{ fill: AXIS.tick, fontSize: 12 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => formatEUR(v)} />
          <Tooltip
            cursor={{ fill: "rgba(132,42,66,0.06)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lift">
                  <p className="mb-1 font-semibold text-ink">{label}</p>
                  {[...payload].reverse().map((p) => (
                    <p key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-ink-muted">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
                      <span className="tabular-nums text-ink">{formatEUR(Number(p.value))}</span>
                    </p>
                  ))}
                  <p className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold text-ink">
                    <span>{m.recipes.unitCost}</span>
                    <span className="tabular-nums">{formatEUR((payload[0].payload as { total: number }).total)}</span>
                  </p>
                </div>
              ) : null
            }
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS.tick, paddingTop: 8 }} />
          {used.map((k, i) => (
            <Bar isAnimationActive={false} key={k} dataKey={k} name={m.costParts[k]} stackId="c" fill={COST_COLORS[k]} stroke="#fff" strokeWidth={1}
              radius={i === used.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={56} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
