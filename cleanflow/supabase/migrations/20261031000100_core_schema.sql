-- CleanFlow Business Manager — core schema
-- Every tenant-owned row carries business_id. Cross-table references use
-- composite foreign keys (business_id, id) so a row can never point at a row
-- that belongs to another business, even though FK checks bypass RLS.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Businesses and membership
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  owner_name text check (char_length(owner_name) <= 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  address text check (char_length(address) <= 400),
  logo_data_url text check (
    logo_data_url is null
    or (char_length(logo_data_url) <= 400000
        and logo_data_url ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')
  ),
  market text not null check (market in ('US', 'UK')),
  currency text not null check (currency in ('USD', 'GBP')),
  date_format text not null check (date_format in ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
  timezone text not null default 'America/New_York' check (char_length(timezone) <= 64),
  default_hourly_cost numeric(10, 2) not null default 0 check (default_hourly_cost >= 0 and default_hourly_cost <= 10000),
  default_target_margin numeric(5, 4) not null default 0.35 check (default_target_margin >= 0 and default_target_margin < 1),
  quote_prefix text not null default 'Q-' check (quote_prefix ~ '^[A-Za-z0-9/_-]{0,12}$'),
  invoice_prefix text not null default 'INV-' check (invoice_prefix ~ '^[A-Za-z0-9/_-]{0,12}$'),
  invoice_footer text check (char_length(invoice_footer) <= 600),
  payment_terms_days integer not null default 14 check (payment_terms_days between 0 and 120),
  next_quote_number integer not null default 1 check (next_quote_number > 0),
  next_invoice_number integer not null default 1 check (next_invoice_number > 0),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_touch before update on public.businesses
  for each row execute function public.touch_updated_at();

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

-- Membership check used by every RLS policy. SECURITY DEFINER so policies on
-- business_members itself do not recurse.
create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  address_line1 text check (char_length(address_line1) <= 200),
  address_line2 text check (char_length(address_line2) <= 200),
  city text check (char_length(city) <= 100),
  region text check (char_length(region) <= 100),
  postal_code text check (char_length(postal_code) <= 20),
  service_preferences text check (char_length(service_preferences) <= 2000),
  notes text check (char_length(notes) <= 4000),
  is_demo boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index clients_business_idx on public.clients (business_id, archived_at);
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Quotes / estimates
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  service_type text not null check (service_type in ('standard', 'deep', 'move_in_out', 'end_of_tenancy', 'recurring', 'other')),
  issue_date date not null default current_date,
  valid_until date,
  notes text check (char_length(notes) <= 4000),
  currency text not null check (currency in ('USD', 'GBP')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  pricing jsonb,
  version integer not null default 1 check (version > 0),
  is_demo boolean not null default false,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, number),
  check (valid_until is null or valid_until >= issue_date),
  foreign key (business_id, client_id) references public.clients (business_id, id)
);
create index quotes_business_idx on public.quotes (business_id, status, issue_date desc);
create index quotes_client_idx on public.quotes (client_id);
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  quote_id uuid not null,
  description text not null check (char_length(btrim(description)) between 1 and 300),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 10000),
  unit_price numeric(12, 2) not null check (unit_price >= 0 and unit_price <= 1000000),
  amount numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  position integer not null default 0,
  foreign key (business_id, quote_id) references public.quotes (business_id, id) on delete cascade
);
create index quote_items_quote_idx on public.quote_items (quote_id, position);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  quote_id uuid not null,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (quote_id, version),
  foreign key (business_id, quote_id) references public.quotes (business_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Jobs / bookings
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  quote_id uuid unique,
  service_type text not null check (service_type in ('standard', 'deep', 'move_in_out', 'end_of_tenancy', 'recurring', 'other')),
  scheduled_date date not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency in ('USD', 'GBP')),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  execution_notes text check (char_length(execution_notes) <= 4000),
  checklist_slug text,
  is_demo boolean not null default false,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  -- One job per quote; the composite key also lets PostgREST embed it 1:1.
  unique (business_id, quote_id),
  foreign key (business_id, client_id) references public.clients (business_id, id),
  foreign key (business_id, quote_id) references public.quotes (business_id, id)
);
create index jobs_business_date_idx on public.jobs (business_id, scheduled_date, start_time);
create index jobs_client_idx on public.jobs (client_id);
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

create table public.job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  job_id uuid not null,
  section text not null default 'General' check (char_length(section) <= 80),
  label text not null check (char_length(btrim(label)) between 1 and 200),
  done boolean not null default false,
  done_at timestamptz,
  position integer not null default 0,
  foreign key (business_id, job_id) references public.jobs (business_id, id) on delete cascade
);
create index job_checklist_job_idx on public.job_checklist_items (job_id, position);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  job_id uuid unique,
  number text not null,
  status text not null default 'issued' check (status in ('draft', 'issued', 'void')),
  issue_date date not null default current_date,
  due_date date not null,
  currency text not null check (currency in ('USD', 'GBP')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text check (char_length(notes) <= 4000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, number),
  check (due_date >= issue_date),
  unique (business_id, job_id),
  foreign key (business_id, client_id) references public.clients (business_id, id),
  foreign key (business_id, job_id) references public.jobs (business_id, id)
);
create index invoices_business_idx on public.invoices (business_id, issue_date desc);
create index invoices_client_idx on public.invoices (client_id);
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  invoice_id uuid not null,
  description text not null check (char_length(btrim(description)) between 1 and 300),
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 10000),
  unit_price numeric(12, 2) not null check (unit_price >= 0 and unit_price <= 1000000),
  amount numeric(14, 2) generated always as (round(quantity * unit_price, 2)) stored,
  position integer not null default 0,
  foreign key (business_id, invoice_id) references public.invoices (business_id, id) on delete cascade
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

-- ---------------------------------------------------------------------------
-- Payments received (recorded manually — no card processing in v1)
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid,
  client_id uuid,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  currency text not null check (currency in ('USD', 'GBP')),
  paid_on date not null default current_date,
  method text not null default 'other' check (method in ('cash', 'check', 'bank_transfer', 'card_external', 'payment_app', 'other')),
  reference text check (char_length(reference) <= 120),
  notes text check (char_length(notes) <= 1000),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, invoice_id) references public.invoices (business_id, id),
  foreign key (business_id, client_id) references public.clients (business_id, id)
);
create index payments_business_date_idx on public.payments (business_id, paid_on desc);
create index payments_invoice_idx on public.payments (invoice_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  spent_on date not null default current_date,
  category text not null check (category in ('supplies', 'equipment', 'travel', 'vehicle', 'insurance', 'marketing', 'software', 'labour', 'fees', 'other')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  currency text not null check (currency in ('USD', 'GBP')),
  job_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (business_id, job_id) references public.jobs (business_id, id) on delete set null (job_id)
);
create index expenses_business_date_idx on public.expenses (business_id, spent_on desc);

-- ---------------------------------------------------------------------------
-- Document kit customisations (per business, per template)
-- ---------------------------------------------------------------------------
create table public.document_customizations (
  business_id uuid not null references public.businesses (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  content jsonb not null default '{}'::jsonb check (pg_column_size(content) <= 100000),
  updated_at timestamptz not null default now(),
  primary key (business_id, slug)
);

-- ---------------------------------------------------------------------------
-- Licences (prepared for a future checkout provider; written by service role)
-- ---------------------------------------------------------------------------
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'refunded')),
  source text not null default 'manual' check (char_length(source) <= 40),
  external_ref text unique check (char_length(external_ref) <= 200),
  purchased_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text check (char_length(revoke_reason) <= 500),
  created_at timestamptz not null default now()
);
create index licenses_email_idx on public.licenses (email);
create index licenses_user_idx on public.licenses (user_id);
