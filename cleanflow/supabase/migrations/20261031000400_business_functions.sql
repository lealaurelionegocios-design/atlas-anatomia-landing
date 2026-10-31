-- Transactional business operations. Unless noted, functions run as the
-- caller (SECURITY INVOKER) so Row Level Security still applies.

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id from public.business_members m
  where m.user_id = (select auth.uid())
  order by m.created_at
  limit 1;
$$;

-- Creates the caller's business and owner membership (one per user in v1).
create or replace function public.create_business(
  p_name text,
  p_market text,
  p_currency text,
  p_date_format text,
  p_timezone text,
  p_owner_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address text default null,
  p_default_hourly_cost numeric default 0,
  p_default_target_margin numeric default 0.35
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if exists (select 1 from public.business_members m where m.user_id = v_uid) then
    raise exception 'You already have a business set up.' using errcode = 'P0001';
  end if;

  insert into public.businesses (
    owner_id, name, market, currency, date_format, timezone, owner_name, email,
    phone, address, default_hourly_cost, default_target_margin,
    quote_prefix
  ) values (
    v_uid, btrim(p_name), p_market, p_currency, p_date_format, p_timezone,
    nullif(btrim(p_owner_name), ''), nullif(btrim(p_email), ''),
    nullif(btrim(p_phone), ''), nullif(btrim(p_address), ''),
    coalesce(p_default_hourly_cost, 0), coalesce(p_default_target_margin, 0.35),
    case when p_market = 'UK' then 'QUO-' else 'EST-' end
  )
  returning id into v_id;

  insert into public.business_members (business_id, user_id, role)
  values (v_id, v_uid, 'owner');
  return v_id;
end;
$$;

-- Atomically reserves the next quote/invoice number for a business.
create or replace function public.next_document_number(p_business_id uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_n integer;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_kind = 'quote' then
    update public.businesses
      set next_quote_number = next_quote_number + 1
      where id = p_business_id
      returning quote_prefix, next_quote_number - 1 into v_prefix, v_n;
  elsif p_kind = 'invoice' then
    update public.businesses
      set next_invoice_number = next_invoice_number + 1
      where id = p_business_id
      returning invoice_prefix, next_invoice_number - 1 into v_prefix, v_n;
  else
    raise exception 'Unknown document kind %', p_kind using errcode = '22023';
  end if;
  return v_prefix || lpad(v_n::text, 4, '0');
end;
$$;

-- Validates a JSON array of line items: [{description, quantity, unit_price}].
create or replace function public.validate_line_items(p_items jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one line item.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'A document can have at most 50 line items.' using errcode = '22023';
  end if;
end;
$$;

-- Creates or updates a quote with its line items, and appends a version
-- snapshot on every save.
create or replace function public.save_quote(
  p_quote_id uuid,
  p_client_id uuid,
  p_service_type text,
  p_issue_date date,
  p_valid_until date,
  p_notes text,
  p_pricing jsonb,
  p_items jsonb,
  p_is_demo boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid := public.current_business_id();
  v_quote public.quotes;
  v_subtotal numeric(12, 2);
  v_id uuid;
begin
  if v_business is null then
    raise exception 'Set up your business first.' using errcode = '42501';
  end if;
  perform public.validate_line_items(p_items);

  select coalesce(sum(round((i ->> 'quantity')::numeric * (i ->> 'unit_price')::numeric, 2)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;

  if p_quote_id is null then
    insert into public.quotes (
      business_id, client_id, number, service_type, issue_date, valid_until,
      notes, pricing, subtotal, total, is_demo
    ) values (
      v_business, p_client_id, public.next_document_number(v_business, 'quote'),
      p_service_type, coalesce(p_issue_date, current_date), p_valid_until,
      nullif(btrim(p_notes), ''), p_pricing, v_subtotal, v_subtotal, coalesce(p_is_demo, false)
    )
    returning id into v_id;
  else
    select * into v_quote from public.quotes q
      where q.id = p_quote_id and q.business_id = v_business
      for update;
    if not found then
      raise exception 'Quote not found.' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.jobs j where j.quote_id = p_quote_id) then
      raise exception 'This quote has already been converted to a job and can no longer be edited.' using errcode = 'P0001';
    end if;
    if v_quote.status not in ('draft', 'sent') then
      raise exception 'Only draft or sent quotes can be edited. Move it back to Draft first.' using errcode = 'P0001';
    end if;

    update public.quotes set
      client_id = p_client_id,
      service_type = p_service_type,
      issue_date = coalesce(p_issue_date, issue_date),
      valid_until = p_valid_until,
      notes = nullif(btrim(p_notes), ''),
      pricing = coalesce(p_pricing, pricing),
      subtotal = v_subtotal,
      total = v_subtotal,
      version = version + 1
    where id = p_quote_id;

    delete from public.quote_items where quote_id = p_quote_id;
    v_id := p_quote_id;
  end if;

  insert into public.quote_items (business_id, quote_id, description, quantity, unit_price, position)
  select v_business, v_id, btrim(t.i ->> 'description'), (t.i ->> 'quantity')::numeric,
         (t.i ->> 'unit_price')::numeric, t.ord
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  -- Totals always come from the stored (rounded) line amounts.
  update public.quotes q set
    subtotal = s.amount, total = s.amount
  from (select coalesce(sum(qi.amount), 0) as amount from public.quote_items qi where qi.quote_id = v_id) s
  where q.id = v_id;

  insert into public.quote_versions (business_id, quote_id, version, snapshot)
  select q.business_id, q.id, q.version,
         jsonb_build_object(
           'quote', to_jsonb(q),
           'items', (select jsonb_agg(to_jsonb(qi) order by qi.position)
                     from public.quote_items qi where qi.quote_id = q.id))
  from public.quotes q where q.id = v_id;

  return v_id;
end;
$$;

-- Converts an accepted quote into a scheduled job with its checklist.
-- p_checklist: [{section, label}]
create or replace function public.convert_quote_to_job(
  p_quote_id uuid,
  p_scheduled_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_checklist_slug text,
  p_checklist jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote public.quotes;
  v_job_id uuid;
begin
  select * into v_quote from public.quotes q where q.id = p_quote_id for update;
  if not found then
    raise exception 'Quote not found.' using errcode = 'P0002';
  end if;
  if v_quote.status <> 'accepted' then
    raise exception 'Only accepted quotes can be converted into a job.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.jobs j where j.quote_id = p_quote_id) then
    raise exception 'This quote has already been converted into a job.' using errcode = 'P0001';
  end if;

  insert into public.jobs (
    business_id, client_id, quote_id, service_type, scheduled_date, start_time,
    duration_minutes, price, currency, checklist_slug, is_demo
  ) values (
    v_quote.business_id, v_quote.client_id, v_quote.id, v_quote.service_type,
    p_scheduled_date, p_start_time, p_duration_minutes, v_quote.total,
    v_quote.currency, p_checklist_slug, v_quote.is_demo
  )
  returning id into v_job_id;

  perform public.replace_job_checklist(v_job_id, p_checklist);
  return v_job_id;
end;
$$;

-- Creates a job directly (without a quote).
create or replace function public.create_job(
  p_client_id uuid,
  p_service_type text,
  p_scheduled_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_price numeric,
  p_execution_notes text,
  p_checklist_slug text,
  p_checklist jsonb,
  p_is_demo boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid := public.current_business_id();
  v_job_id uuid;
begin
  if v_business is null then
    raise exception 'Set up your business first.' using errcode = '42501';
  end if;
  insert into public.jobs (
    business_id, client_id, service_type, scheduled_date, start_time,
    duration_minutes, price, execution_notes, checklist_slug, is_demo
  ) values (
    v_business, p_client_id, p_service_type, p_scheduled_date, p_start_time,
    p_duration_minutes, p_price, nullif(btrim(p_execution_notes), ''),
    p_checklist_slug, coalesce(p_is_demo, false)
  )
  returning id into v_job_id;

  perform public.replace_job_checklist(v_job_id, p_checklist);
  return v_job_id;
end;
$$;

create or replace function public.replace_job_checklist(p_job_id uuid, p_checklist jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid;
begin
  select j.business_id into v_business from public.jobs j where j.id = p_job_id;
  if v_business is null then
    raise exception 'Job not found.' using errcode = 'P0002';
  end if;
  delete from public.job_checklist_items where job_id = p_job_id;
  if p_checklist is null or jsonb_typeof(p_checklist) <> 'array' then
    return;
  end if;
  if jsonb_array_length(p_checklist) > 150 then
    raise exception 'A checklist can have at most 150 items.' using errcode = '22023';
  end if;
  insert into public.job_checklist_items (business_id, job_id, section, label, position)
  select v_business, p_job_id, coalesce(nullif(btrim(t.i ->> 'section'), ''), 'General'),
         btrim(t.i ->> 'label'), t.ord
  from jsonb_array_elements(p_checklist) with ordinality as t(i, ord)
  where nullif(btrim(t.i ->> 'label'), '') is not null;
end;
$$;

-- Creates or updates an invoice with its line items. When p_job_id is given
-- the job must be completed and not already invoiced.
create or replace function public.save_invoice(
  p_invoice_id uuid,
  p_client_id uuid,
  p_job_id uuid,
  p_issue_date date,
  p_due_date date,
  p_status text,
  p_notes text,
  p_items jsonb,
  p_is_demo boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid := public.current_business_id();
  v_job public.jobs;
  v_subtotal numeric(12, 2);
  v_id uuid;
begin
  if v_business is null then
    raise exception 'Set up your business first.' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'issued') then
    raise exception 'Invalid invoice status.' using errcode = '22023';
  end if;
  perform public.validate_line_items(p_items);

  select coalesce(sum(round((i ->> 'quantity')::numeric * (i ->> 'unit_price')::numeric, 2)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;

  if p_job_id is not null then
    select * into v_job from public.jobs j where j.id = p_job_id;
    if not found then
      raise exception 'Job not found.' using errcode = 'P0002';
    end if;
    if v_job.status <> 'completed' then
      raise exception 'Mark the job as completed before invoicing it.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.invoices i
               where i.job_id = p_job_id and i.id is distinct from p_invoice_id) then
      raise exception 'This job already has an invoice.' using errcode = 'P0001';
    end if;
  end if;

  if p_invoice_id is null then
    insert into public.invoices (
      business_id, client_id, job_id, number, status, issue_date, due_date,
      currency, subtotal, total, notes, is_demo
    ) values (
      v_business, p_client_id, p_job_id, public.next_document_number(v_business, 'invoice'),
      p_status, p_issue_date, p_due_date,
      case when p_job_id is not null then v_job.currency else null end,
      v_subtotal, v_subtotal, nullif(btrim(p_notes), ''), coalesce(p_is_demo, false)
    )
    returning id into v_id;
  else
    update public.invoices set
      client_id = p_client_id,
      job_id = p_job_id,
      status = p_status,
      issue_date = p_issue_date,
      due_date = p_due_date,
      subtotal = v_subtotal,
      total = v_subtotal,
      notes = nullif(btrim(p_notes), '')
    where id = p_invoice_id and business_id = v_business and status <> 'void'
    returning id into v_id;
    if v_id is null then
      raise exception 'Invoice not found or void.' using errcode = 'P0002';
    end if;
    delete from public.invoice_items where invoice_id = v_id;
  end if;

  insert into public.invoice_items (business_id, invoice_id, description, quantity, unit_price, position)
  select v_business, v_id, btrim(t.i ->> 'description'), (t.i ->> 'quantity')::numeric,
         (t.i ->> 'unit_price')::numeric, t.ord
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  update public.invoices inv set
    subtotal = s.amount, total = s.amount
  from (select coalesce(sum(ii.amount), 0) as amount from public.invoice_items ii where ii.invoice_id = v_id) s
  where inv.id = v_id;

  return v_id;
end;
$$;

-- Permanently deletes a client and every record linked to them (privacy
-- erasure requests). The UI warns about record-keeping obligations first.
create or replace function public.delete_client_permanently(p_client_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'Client not found.' using errcode = 'P0002';
  end if;
  delete from public.payments where client_id = p_client_id
    or invoice_id in (select i.id from public.invoices i where i.client_id = p_client_id);
  delete from public.invoices where client_id = p_client_id;
  delete from public.jobs where client_id = p_client_id;
  delete from public.quotes where client_id = p_client_id;
  delete from public.clients where id = p_client_id;
end;
$$;

-- Removes every demo record of the caller's business. Real records are never
-- touched (records created for a demo client are flagged as demo by trigger).
create or replace function public.remove_demo_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_business uuid := public.current_business_id();
begin
  delete from public.payments where business_id = v_business and is_demo;
  delete from public.expenses where business_id = v_business and is_demo;
  delete from public.invoices where business_id = v_business and is_demo;
  delete from public.jobs where business_id = v_business and is_demo;
  delete from public.quotes where business_id = v_business and is_demo;
  delete from public.clients where business_id = v_business and is_demo;
end;
$$;

-- Deletes the caller's business data and their auth account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.businesses where owner_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

-- Licensing ---------------------------------------------------------------------
-- Links an active licence purchased with the caller's (confirmed) email to
-- their account. Returns the resulting licence status or 'none'.
create or replace function public.claim_my_license()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select lower(u.email), u.email_confirmed_at into v_email, v_confirmed
  from auth.users u where u.id = v_uid;

  if v_confirmed is not null then
    update public.licenses
      set user_id = v_uid, activated_at = coalesce(activated_at, now())
      where email = v_email and user_id is null and status = 'active';
  end if;

  select l.status into v_status from public.licenses l
  where l.user_id = v_uid
  order by (l.status = 'active') desc, l.created_at desc
  limit 1;
  return coalesce(v_status, 'none');
end;
$$;

create or replace function public.has_active_license()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.licenses l
    where l.user_id = (select auth.uid()) and l.status = 'active'
  );
$$;

grant execute on function
  public.current_business_id(),
  public.create_business(text, text, text, text, text, text, text, text, text, numeric, numeric),
  public.next_document_number(uuid, text),
  public.validate_line_items(jsonb),
  public.save_quote(uuid, uuid, text, date, date, text, jsonb, jsonb, boolean),
  public.convert_quote_to_job(uuid, date, time, integer, text, jsonb),
  public.create_job(uuid, text, date, time, integer, numeric, text, text, jsonb, boolean),
  public.replace_job_checklist(uuid, jsonb),
  public.save_invoice(uuid, uuid, uuid, date, date, text, text, jsonb, boolean),
  public.delete_client_permanently(uuid),
  public.remove_demo_data(),
  public.delete_my_account(),
  public.claim_my_license(),
  public.has_active_license()
to authenticated;
