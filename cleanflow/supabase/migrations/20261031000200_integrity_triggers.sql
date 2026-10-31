-- Integrity rules enforced in the database so that the UI, the API and any
-- future integration all obey the same rules.

-- Currency defaults to the business currency at the time the record is
-- created. Historical records keep their own currency forever: changing the
-- business currency never converts existing amounts.
create or replace function public.business_currency(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.currency from public.businesses b
  where b.id = p_business_id and public.is_business_member(b.id);
$$;

-- Quotes: currency default + demo flag inherited from the client.
create or replace function public.quotes_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.currency := coalesce(new.currency, public.business_currency(new.business_id));
    new.is_demo := new.is_demo or coalesce((select c.is_demo from public.clients c where c.id = new.client_id), false);
  end if;

  if tg_op = 'UPDATE' then
    if exists (select 1 from public.jobs j where j.quote_id = old.id)
       and (new.status <> old.status or new.total <> old.total or new.client_id <> old.client_id) then
      raise exception 'This quote has already been converted to a job and is locked.'
        using errcode = 'P0001';
    end if;
    if new.currency <> old.currency then
      raise exception 'The currency of an existing quote cannot be changed.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'sent' and new.sent_at is null then new.sent_at := now(); end if;
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then new.accepted_at := now(); end if;
  if new.status = 'declined' and (tg_op = 'INSERT' or old.status <> 'declined') then new.declined_at := now(); end if;
  return new;
end;
$$;
create trigger quotes_before_write before insert or update on public.quotes
  for each row execute function public.quotes_before_write();

-- Jobs: currency default, demo flag, client must match the linked quote,
-- status timestamps.
create or replace function public.jobs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_quote_client uuid;
begin
  if tg_op = 'INSERT' then
    new.currency := coalesce(new.currency, public.business_currency(new.business_id));
    new.is_demo := new.is_demo or coalesce((select c.is_demo from public.clients c where c.id = new.client_id), false);
  elsif new.currency <> old.currency then
    raise exception 'The currency of an existing job cannot be changed.' using errcode = 'P0001';
  end if;

  if new.quote_id is not null then
    select q.client_id into v_quote_client from public.quotes q where q.id = new.quote_id;
    if v_quote_client is distinct from new.client_id then
      raise exception 'The job client must match the client on the linked quote.' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  if new.status = 'cancelled' and new.cancelled_at is null then
    new.cancelled_at := now();
  elsif new.status <> 'cancelled' then
    new.cancelled_at := null;
  end if;

  if tg_op = 'UPDATE' and new.status <> old.status
     and old.status = 'completed'
     and exists (select 1 from public.invoices i where i.job_id = old.id and i.status <> 'void') then
    raise exception 'This job has an invoice. Void the invoice before changing the job status.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

create or replace function public.checklist_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end;
$$;
create trigger checklist_before_write before insert or update on public.job_checklist_items
  for each row execute function public.checklist_before_write();

-- Invoices: currency default, demo flag, client must match the job, totals
-- can never drop below what has already been received.
create or replace function public.invoices_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_job_client uuid;
  v_paid numeric(12, 2);
begin
  if tg_op = 'INSERT' then
    new.currency := coalesce(new.currency, public.business_currency(new.business_id));
    new.is_demo := new.is_demo or coalesce((select c.is_demo from public.clients c where c.id = new.client_id), false);
  end if;

  if new.job_id is not null then
    select j.client_id into v_job_client from public.jobs j where j.id = new.job_id;
    if v_job_client is distinct from new.client_id then
      raise exception 'The invoice client must match the client on the linked job.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(p.amount), 0) into v_paid from public.payments p where p.invoice_id = old.id;
    if v_paid > 0 then
      if new.currency <> old.currency then
        raise exception 'The currency of an invoice with payments cannot be changed.' using errcode = 'P0001';
      end if;
      if new.total < v_paid then
        raise exception 'The invoice total cannot be lower than the % already received.', v_paid using errcode = 'P0001';
      end if;
      if new.status <> 'issued' then
        raise exception 'An invoice with recorded payments must stay issued. Remove the payments first.' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger invoices_before_write before insert or update on public.invoices
  for each row execute function public.invoices_before_write();

-- Payments: must target an issued invoice in the same currency and can never
-- exceed the outstanding balance. The invoice row is locked to serialise
-- concurrent payments.
create or replace function public.payments_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_paid numeric(12, 2);
begin
  if new.invoice_id is not null then
    select * into v_invoice from public.invoices i where i.id = new.invoice_id for update;
    if not found then
      raise exception 'Invoice not found.' using errcode = 'P0002';
    end if;
    if v_invoice.status <> 'issued' then
      raise exception 'Payments can only be recorded against issued invoices.' using errcode = 'P0001';
    end if;
    new.currency := coalesce(new.currency, v_invoice.currency);
    if new.currency <> v_invoice.currency then
      raise exception 'Payment currency (%) must match the invoice currency (%).', new.currency, v_invoice.currency using errcode = 'P0001';
    end if;
    new.client_id := v_invoice.client_id;
    new.is_demo := new.is_demo or v_invoice.is_demo;

    select coalesce(sum(p.amount), 0) into v_paid
    from public.payments p
    where p.invoice_id = new.invoice_id and (tg_op = 'INSERT' or p.id <> old.id);
    if v_paid + new.amount > v_invoice.total then
      raise exception 'This payment of % exceeds the outstanding balance of %.', new.amount, v_invoice.total - v_paid
        using errcode = 'P0001';
    end if;
  else
    new.currency := coalesce(new.currency, public.business_currency(new.business_id));
    if new.client_id is not null then
      new.is_demo := new.is_demo or coalesce((select c.is_demo from public.clients c where c.id = new.client_id), false);
    end if;
  end if;
  return new;
end;
$$;
create trigger payments_before_write before insert or update on public.payments
  for each row execute function public.payments_before_write();

create or replace function public.expenses_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.currency := coalesce(new.currency, public.business_currency(new.business_id));
  end if;
  return new;
end;
$$;
create trigger expenses_before_write before insert or update on public.expenses
  for each row execute function public.expenses_before_write();
