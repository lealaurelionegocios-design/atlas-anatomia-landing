-- Row Level Security: every tenant table is only visible to members of the
-- owning business. The anon role has no table access at all.

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_versions enable row level security;
alter table public.jobs enable row level security;
alter table public.job_checklist_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.document_customizations enable row level security;
alter table public.licenses enable row level security;

-- Businesses -----------------------------------------------------------------
create policy businesses_select on public.businesses
  for select to authenticated
  using (public.is_business_member(id));

create policy businesses_update on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy businesses_delete on public.businesses
  for delete to authenticated
  using (owner_id = (select auth.uid()));
-- Inserts go through public.create_business() only.

create policy business_members_select on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Tenant tables: identical member-only policies ------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'quotes', 'quote_items', 'quote_versions', 'jobs',
    'job_checklist_items', 'invoices', 'invoice_items', 'payments',
    'expenses', 'document_customizations'
  ] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (public.is_business_member(business_id))', t);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.is_business_member(business_id))', t);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))', t);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (public.is_business_member(business_id))', t);
  end loop;
end;
$$;

-- Quote versions are an append-only history.
drop policy quote_versions_update on public.quote_versions;
drop policy quote_versions_delete on public.quote_versions;

-- Licences: a user can read their own licence; only the service role writes.
create policy licenses_select_own on public.licenses
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Grants -----------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

revoke all on public.businesses from authenticated;
grant select, delete on public.businesses to authenticated;
-- Counters and ownership are not user-editable.
grant update (
  name, owner_name, email, phone, address, logo_data_url, market, currency,
  date_format, timezone, default_hourly_cost, default_target_margin,
  quote_prefix, invoice_prefix, invoice_footer, payment_terms_days,
  onboarding_completed_at
) on public.businesses to authenticated;

revoke all on public.business_members from authenticated;
grant select on public.business_members to authenticated;

revoke all on public.licenses from authenticated;
grant select on public.licenses to authenticated;

revoke all on public.quote_versions from authenticated;
grant select, insert on public.quote_versions to authenticated;

grant select, insert, update, delete on
  public.clients, public.quotes, public.quote_items, public.jobs,
  public.job_checklist_items, public.invoices, public.invoice_items,
  public.payments, public.expenses, public.document_customizations
to authenticated;

grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.business_currency(uuid) to authenticated;
grant execute on function public.touch_updated_at() to authenticated;
