import type { DocBlock, DocBusiness } from "@/lib/documents/types";

function Lines({ count }: { count: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-6 border-b border-line" />
      ))}
    </div>
  );
}

/** HTML rendering of a kit document — mirrors the PDF layout and prints cleanly. */
export function DocPreview({ title, business, blocks, disclaimer, paper }: { title: string; business: DocBusiness; blocks: DocBlock[]; disclaimer: string; paper: "LETTER" | "A4" }) {
  return (
    <article
      className="print-sheet mx-auto w-full rounded-lg border border-line bg-white p-6 text-[13px] leading-relaxed text-ink shadow-sm sm:p-10"
      style={{ maxWidth: paper === "A4" ? "210mm" : "8.5in" }}
      aria-label={`${title} preview`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          {business.logo_data_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_data_url} alt="" className="size-14 object-contain" />
          )}
          <div>
            <p className="text-lg font-bold text-forest">{business.name}</p>
            {business.address && <p className="whitespace-pre-line text-xs text-muted">{business.address}</p>}
            <p className="text-xs text-muted">{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <h2 className="text-right text-2xl font-bold">{title}</h2>
      </header>
      <div className="mb-5 h-1 rounded bg-brand" />
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h3 key={i} className="mb-1 mt-4 text-sm font-bold">
                {b.text}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i} className="mb-3 whitespace-pre-line">
                {b.text}
              </p>
            );
          case "notice":
            return (
              <p key={i} className="my-3 border-l-4 border-brand bg-canvas px-3 py-2 text-xs text-muted">
                {b.text}
              </p>
            );
          case "fields":
            return (
              <section key={i} className="mb-3">
                {b.title && <h3 className="mb-2 mt-4 text-sm font-bold">{b.title}</h3>}
                <div className="space-y-2">
                  {b.fields.map((f) => (
                    <div key={f.label} className="break-inside-avoid">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{f.label}</p>
                      {f.value ? <p className="whitespace-pre-line">{f.value}</p> : <Lines count={f.lines ?? 1} />}
                    </div>
                  ))}
                </div>
              </section>
            );
          case "checklist":
            return (
              <section key={i} className="mb-2 break-inside-avoid">
                <h3 className="mb-1.5 mt-4 text-sm font-bold">{b.title}</h3>
                <ul className="space-y-1">
                  {b.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 inline-block size-3 shrink-0 rounded-sm border border-muted" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          case "table": {
            const rows = [...b.rows, ...Array.from({ length: b.blankRows ?? 0 }, () => b.columns.map(() => ""))];
            return (
              <section key={i} className="mb-3 overflow-x-auto">
                {b.title && <h3 className="mb-2 mt-4 text-sm font-bold">{b.title}</h3>}
                <table className="w-full min-w-[420px] border-collapse text-left">
                  <thead>
                    <tr className="bg-canvas">
                      {b.columns.map((c) => (
                        <th key={c} className="border-b border-line px-2 py-1.5 text-[11px] font-semibold uppercase text-muted">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className="h-8 border-b border-line">
                        {r.map((cell, ci) => (
                          <td key={ci} className="px-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          }
          case "messages":
            return (
              <section key={i} className="space-y-3">
                {b.items.map((m) => (
                  <div key={m.id} className="break-inside-avoid rounded-lg border border-line p-3">
                    <p className="mb-1 font-semibold text-forest">{m.title}</p>
                    <p className="whitespace-pre-line">{m.body}</p>
                  </div>
                ))}
              </section>
            );
          case "signature":
            return (
              <div key={i} className="mt-8 grid grid-cols-2 gap-6 break-inside-avoid">
                {b.labels.map((l) => (
                  <div key={l}>
                    <div className="h-8 border-b border-muted" />
                    <p className="text-xs text-muted">{l}</p>
                  </div>
                ))}
              </div>
            );
        }
      })}
      <footer className="mt-8 border-t border-line pt-2 text-[10px] text-muted">{disclaimer}</footer>
    </article>
  );
}
