import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { formatter } from "@/lib/format";
import { JOB_STATUSES, jobStatusLabel, serviceTypeLabel } from "@/lib/market";
import { addDays, addMonths, dayOfWeek, endOfMonth, formatDuration, monthTitle, startOfMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jobs & Bookings" };

type JobRow = {
  id: string;
  scheduled_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  service_type: string;
  price: number;
  currency: string;
  is_demo: boolean;
  clients: { name: string } | null;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; status?: string; when?: string }>;
}) {
  const { supabase, business, today } = await requireBusiness();
  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const status = sp.status ?? "all";
  const when = sp.when ?? "upcoming";
  const f = formatter(business);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? `${sp.month}-01` : startOfMonth(today);

  let query = supabase
    .from("jobs")
    .select("id, scheduled_date, start_time, duration_minutes, status, service_type, price, currency, is_demo, clients(name)")
    .order("scheduled_date", { ascending: view === "calendar" || when === "upcoming" })
    .order("start_time", { ascending: true })
    .limit(1000);
  if (view === "calendar") {
    // Include the visible leading/trailing days of the grid.
    query = query.gte("scheduled_date", addDays(month, -7)).lte("scheduled_date", addDays(endOfMonth(month), 7));
  } else {
    if (when === "upcoming") query = query.gte("scheduled_date", today);
    if (when === "past") query = query.lt("scheduled_date", today);
  }
  if ((JOB_STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  const { data } = await query;
  const jobs = (data ?? []) as JobRow[];
  const { count } = await supabase.from("jobs").select("id", { count: "exact", head: true });

  const params = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ view, status, when, month: month.slice(0, 7), ...patch });
    return `/jobs?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Jobs & Bookings"
        description="Your schedule. Times are in your business time zone."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="View">
              <Link
                href={params({ view: "list" })}
                aria-current={view === "list" ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "list" ? "bg-mint text-forest" : "text-muted")}
              >
                <List className="size-4" /> List
              </Link>
              <Link
                href={params({ view: "calendar" })}
                aria-current={view === "calendar" ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "calendar" ? "bg-mint text-forest" : "text-muted")}
              >
                <CalendarDays className="size-4" /> Calendar
              </Link>
            </div>
            <Button asChild>
              <Link href="/jobs/new">
                <Plus /> Book job
              </Link>
            </Button>
          </>
        }
      />

      {count === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No jobs booked yet"
          description={`Book a job directly, or mark an ${f.terms.quote.toLowerCase()} as accepted and use “Book as job”.`}
          action={
            <Button asChild>
              <Link href="/jobs/new">
                <Plus /> Book a job
              </Link>
            </Button>
          }
        />
      ) : view === "calendar" ? (
        <Calendar month={month} today={today} jobs={jobs} f={f} prev={params({ month: addMonths(month, -1).slice(0, 7) })} next={params({ month: addMonths(month, 1).slice(0, 7) })} />
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2" action="/jobs">
            <input type="hidden" name="view" value="list" />
            <label htmlFor="when" className="sr-only">
              Period
            </label>
            <Select id="when" name="when" defaultValue={when} className="w-40">
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All dates</option>
            </Select>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <Select id="status" name="status" defaultValue={status} className="w-44">
              <option value="all">All statuses</option>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {jobStatusLabel(s, f.market)}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          {jobs.length === 0 ? (
            <EmptyState title="No jobs match this filter" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Duration</th>
                  <th className="text-right">Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link href={`/jobs/${j.id}`} className="font-medium text-forest hover:text-brand hover:underline">
                        {f.date(j.scheduled_date)} · {f.time(j.start_time)}
                      </Link>{" "}
                      {j.is_demo && <DemoBadge />}
                    </td>
                    <td>{j.clients?.name}</td>
                    <td className="text-muted">{serviceTypeLabel(j.service_type, f.market)}</td>
                    <td className="text-muted">{formatDuration(j.duration_minutes)}</td>
                    <td className="text-right tabular-nums">{f.money(j.price, j.currency)}</td>
                    <td>
                      <StatusBadge status={j.status} label={jobStatusLabel(j.status, f.market)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </>
  );
}

function Calendar({
  month,
  today,
  jobs,
  f,
  prev,
  next,
}: {
  month: string;
  today: string;
  jobs: JobRow[];
  f: ReturnType<typeof formatter>;
  prev: string;
  next: string;
}) {
  const weekStartsMonday = f.market === "UK";
  const first = startOfMonth(month);
  const offset = (dayOfWeek(first) - (weekStartsMonday ? 1 : 0) + 7) % 7;
  const gridStart = addDays(first, -offset);
  const last = endOfMonth(month);
  const totalDays = Math.ceil((offset + Number(last.slice(8, 10))) / 7) * 7;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
  const byDay = new Map<string, JobRow[]>();
  for (const j of jobs) byDay.set(j.scheduled_date, [...(byDay.get(j.scheduled_date) ?? []), j]);
  const weekdays = weekStartsMonday ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthJobs = jobs.filter((j) => j.scheduled_date >= first && j.scheduled_date <= last);

  return (
    <section aria-label="Calendar">
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="outline" size="icon">
          <Link href={prev} aria-label="Previous month">
            <ChevronLeft />
          </Link>
        </Button>
        <h2 className="text-lg font-semibold">{monthTitle(month, f.market)}</h2>
        <Button asChild variant="outline" size="icon">
          <Link href={next} aria-label="Next month">
            <ChevronRight />
          </Link>
        </Button>
      </div>

      {/* Grid on tablet/desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-white sm:block">
        <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-semibold uppercase text-muted">
          {weekdays.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth = d >= first && d <= last;
            const list = byDay.get(d) ?? [];
            return (
              <div key={d} className={cn("min-h-28 border-b border-r border-line p-1.5 text-xs [&:nth-child(7n)]:border-r-0", !inMonth && "bg-canvas/60 text-muted")}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-full", d === today && "bg-brand font-semibold text-white")}>{Number(d.slice(8, 10))}</span>
                  {inMonth && (
                    <Link href={`/jobs/new?date=${d}`} className="rounded px-1 text-muted opacity-0 hover:bg-mint hover:text-forest focus:opacity-100 [div:hover>&]:opacity-100" aria-label={`Book a job on ${f.date(d)}`}>
                      +
                    </Link>
                  )}
                </div>
                <ul className="space-y-1">
                  {list.map((j) => (
                    <li key={j.id}>
                      <Link
                        href={`/jobs/${j.id}`}
                        className={cn(
                          "block truncate rounded px-1.5 py-1",
                          j.status === "completed" ? "bg-mint text-forest" : j.status === "cancelled" ? "bg-canvas text-muted line-through" : "bg-info-soft text-info",
                        )}
                        title={`${f.time(j.start_time)} ${j.clients?.name ?? ""}`}
                      >
                        {f.time(j.start_time)} {j.clients?.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda on phones */}
      <div className="sm:hidden">
        {monthJobs.length === 0 ? (
          <EmptyState title="No jobs this month" />
        ) : (
          <ul className="space-y-2">
            {monthJobs.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3">
                  <span>
                    <span className="block font-medium text-forest">
                      {f.date(j.scheduled_date)} · {f.time(j.start_time)}
                    </span>
                    <span className="text-sm text-muted">{j.clients?.name}</span>
                  </span>
                  <StatusBadge status={j.status} label={jobStatusLabel(j.status, f.market)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
