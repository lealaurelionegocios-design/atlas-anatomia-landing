import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { requireBusiness } from "@/lib/server/context";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { DemoBadge, Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import { formatter } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

function sanitizeSearch(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { supabase, business } = await requireBusiness();
  const { q = "", status = "active" } = await searchParams;
  const f = formatter(business);
  const search = sanitizeSearch(q);

  let query = supabase
    .from("clients")
    .select("id, name, email, phone, city, region, archived_at, is_demo, created_at")
    .order("name", { ascending: true })
    .limit(500);
  if (status === "active") query = query.is("archived_at", null);
  if (status === "archived") query = query.not("archived_at", "is", null);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
  const { data: clients, error } = await query;

  const { count: total } = await supabase.from("clients").select("id", { count: "exact", head: true });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Contact details, service preferences and history for every client."
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <Plus /> Add client
            </Link>
          </Button>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No clients yet"
          description="Add your first client to start creating estimates, bookings and invoices."
          action={
            <Button asChild>
              <Link href="/clients/new">
                <Plus /> Add your first client
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <form className="mb-4 flex flex-col gap-2 sm:flex-row" role="search" action="/clients">
            <label htmlFor="q" className="sr-only">
              Search clients
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input id="q" name="q" defaultValue={q} placeholder="Search by name, email, phone or city" className="pl-9" />
            </div>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <Select id="status" name="status" defaultValue={status} className="sm:w-40">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </Select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>

          {error ? (
            <p className="text-danger">Could not load clients.</p>
          ) : clients && clients.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clients/${c.id}`} className="font-medium text-forest hover:text-brand hover:underline">
                        {c.name}
                      </Link>
                      <span className="ml-2 inline-flex gap-1">
                        {c.is_demo && <DemoBadge />}
                        {c.archived_at && <Badge>Archived</Badge>}
                      </span>
                    </td>
                    <td className="text-muted">
                      <div>{c.email ?? "—"}</div>
                      <div>{c.phone}</div>
                    </td>
                    <td className="text-muted">{[c.city, c.region].filter(Boolean).join(", ") || "—"}</td>
                    <td className="text-muted">{f.date(c.created_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No matching clients" description="Try a different search or status filter." />
          )}
        </>
      )}
    </>
  );
}
