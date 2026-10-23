-- KHomeEasy core schema (Supabase PostgreSQL, Frankfurt eu-central-1).
-- Tables match the technical handover. This file adds the access control the
-- handover SQL did not include: RLS, explicit grants, a redacted installer
-- directory, and triggers that keep payment and ranking fields server-side.
--
-- Unclaimed Silver partners (knx_official_rank = 'Silver' AND claimed_by_user_id
-- IS NULL) never expose email. The schema stores no phone number and no street
-- address — only a postal code. Application code must still call
-- canExposeInstallerContact before rendering contact fields from a privileged query.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Evidence level (E1 official/statute, E2 manufacturer, E3 platform-checked, E4 public unverified)
create type public.evidence_level as enum ('E1', 'E2', 'E3', 'E4');
create type public.project_stage as enum (
  'cognition',
  'planning',
  'rfq_sent',
  'quoting',
  'contracting',
  'construction',
  'handover',
  'maintenance'
);
create type public.knx_partner_rank as enum ('Silver', 'Gold', 'Platinum');

-- 1. Profiles (homeowner / architect / installer admin)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'homeowner' check (role in ('homeowner', 'architect', 'installer', 'admin')),
  full_name text,
  locale text default 'de-DE' check (locale in ('de-DE', 'en-GB')),
  country_code text default 'DE' check (country_code in ('DE', 'AT', 'CH', 'GB')),
  postal_code text,
  created_at timestamptz default now()
);

-- 2. Homeowner projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Mein KNX Projekt',
  stage public.project_stage not null default 'cognition',
  build_type text not null check (build_type in ('new_build', 'renovation', 'unsure')),
  construction_phase text check (construction_phase in ('design', 'shell_construction', 'finished')),
  area_sqm integer,
  selected_tier text default 'better' check (selected_tier in ('good', 'better', 'best')),
  fit_assessment_json jsonb,
  budget_estimate_json jsonb,
  is_pro_unlocked boolean default false,
  stripe_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Room cards (M2)
create table public.project_rooms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  room_type text not null,
  room_name text not null,
  wiring_feasibility text default 'wired_possible' check (wiring_feasibility in ('wired_possible', 'rf_only', 'unsure')),
  features_json jsonb not null default '{}'::jsonb,
  sort_order integer default 0
);

-- 4. Installer directory. No street address and no phone column, on purpose.
create table public.installers (
  id uuid primary key default uuid_generate_v4(),
  claimed_by_user_id uuid references public.profiles (id),
  company_name text not null,
  country_code text not null,
  city text not null,
  postal_code text not null,
  service_radius_km integer default 50,
  knx_official_rank public.knx_partner_rank not null,
  is_contact_public boolean default false,
  public_email text,
  public_website text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro')),
  is_founding_partner boolean default false,
  avg_response_hours integer,
  verified_projects_count integer default 0,
  gdpr_art14_notified_at timestamptz,
  opted_out boolean default false,
  created_at timestamptz default now()
);

-- 5. Verifiable fact cards only. No subjective scores.
create table public.installer_fact_cards (
  id uuid primary key default uuid_generate_v4(),
  installer_id uuid not null references public.installers (id) on delete cascade,
  fact_category text not null,
  fact_text_de text not null,
  fact_text_en text not null,
  evidence public.evidence_level not null,
  source_url text not null,
  verified_at date not null,
  expires_at date not null,
  is_disputed boolean default false
);

-- 6. Standard RFQ
create table public.rfqs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  rfq_version integer default 1,
  mandatory_deliverables_json jsonb not null default '{
    "ets_project_file": true,
    "project_password": true,
    "bcu_password": true,
    "knx_secure_keyring": true,
    "group_address_doc": true,
    "handover_training": true
  }'::jsonb,
  disclosed_fields_json jsonb not null,
  share_token text unique not null,
  pdf_storage_path text,
  created_at timestamptz default now()
);

-- 7. Structured quotes
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  installer_id uuid not null references public.installers (id),
  status text default 'invited' check (status in ('invited', 'viewed', 'submitted', 'declined')),
  decline_reason text,
  currency text default 'EUR',
  cost_materials numeric(10, 2),
  cost_ets_programming numeric(10, 2),
  ets_programming_hours numeric(6, 1),
  ets_hourly_rate numeric(6, 2),
  cost_installation numeric(10, 2),
  cost_commissioning numeric(10, 2),
  total_price numeric(10, 2) generated always as (
    coalesce(cost_materials, 0)
    + coalesce(cost_ets_programming, 0)
    + coalesce(cost_installation, 0)
    + coalesce(cost_commissioning, 0)
  ) stored,
  proposed_brands text[],
  commits_ets_handover boolean default false,
  commits_keyring_handover boolean default false,
  warranty_months integer default 24,
  raw_pdf_path text,
  submitted_at timestamptz
);

-- 8. Contract and handover checklists
create table public.handover_checklists (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase text not null check (phase in ('contract_signing', 'final_acceptance')),
  items_json jsonb not null,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index projects_owner_id_idx on public.projects (owner_id);
create index project_rooms_project_id_idx on public.project_rooms (project_id);
create index rfqs_project_id_idx on public.rfqs (project_id);
create index quotes_rfq_id_idx on public.quotes (rfq_id);
create index quotes_installer_id_idx on public.quotes (installer_id);
create index handover_checklists_project_id_idx on public.handover_checklists (project_id);
create index installers_claimed_by_user_id_idx on public.installers (claimed_by_user_id);
create index installers_ranking_idx
  on public.installers (country_code, knx_official_rank, verified_projects_count desc, avg_response_hours)
  where opted_out = false;
create index installer_fact_cards_installer_id_idx on public.installer_fact_cards (installer_id);
create index installer_fact_cards_current_idx
  on public.installer_fact_cards (installer_id, expires_at)
  where is_disputed = false;

-- ---------------------------------------------------------------------------
-- Private helpers. Security-definer functions stay out of the exposed schema.
-- They read JWT claims via auth.uid(); they never trust user_metadata for roles.
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.owns_project(project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects
    where id = project_id
      and owner_id = (select auth.uid())
  );
$$;

create or replace function private.owns_rfq(rfq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rfqs as rfq
    join public.projects as project on project.id = rfq.project_id
    where rfq.id = owns_rfq.rfq_id
      and project.owner_id = (select auth.uid())
  );
$$;

create or replace function private.installer_is_listed(installer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.installers
    where id = installer_id
      and opted_out = false
  );
$$;

create or replace function private.claims_installer(installer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.installers
    where id = claims_installer.installer_id
      and claimed_by_user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.owns_project(uuid) from public, anon, authenticated;
revoke all on function private.owns_rfq(uuid) from public, anon, authenticated;
revoke all on function private.installer_is_listed(uuid) from public, anon, authenticated;
revoke all on function private.claims_installer(uuid) from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_project(uuid) to authenticated;
grant execute on function private.owns_rfq(uuid) to authenticated;
grant execute on function private.installer_is_listed(uuid) to anon, authenticated;
grant execute on function private.claims_installer(uuid) to authenticated;

-- Signup profile. Display name and locale may come from metadata; role may not.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'locale' in ('de-DE', 'en-GB')
        then new.raw_user_meta_data ->> 'locale'
      else 'de-DE'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Runs as the invoking role so current_user distinguishes service_role from authenticated.
create or replace function private.guard_profile_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.id := auth.uid();
    if new.role is distinct from 'homeowner'
       and new.role is distinct from 'architect'
       and new.role is distinct from 'installer' then
      new.role := 'homeowner';
    end if;
    return new;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  if new.role = 'admin' and old.role is distinct from 'admin' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function private.guard_profile_row();

create or replace function private.guard_project_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or coalesce(auth.role(), '') = 'service_role' then
    if tg_op = 'UPDATE' then
      new.updated_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.is_pro_unlocked := false;
    new.stripe_payment_id := null;
    new.updated_at := now();
    return new;
  end if;

  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.is_pro_unlocked := old.is_pro_unlocked;
  new.stripe_payment_id := old.stripe_payment_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger projects_guard
  before insert or update on public.projects
  for each row execute function private.guard_project_row();

create or replace function private.guard_installer_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'installer records are created by the server'
      using errcode = '42501';
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  new.subscription_tier := old.subscription_tier;
  new.knx_official_rank := old.knx_official_rank;
  new.is_founding_partner := old.is_founding_partner;
  new.verified_projects_count := old.verified_projects_count;
  if new.claimed_by_user_id is distinct from old.claimed_by_user_id then
    if old.claimed_by_user_id is null then
      new.claimed_by_user_id := auth.uid();
    else
      new.claimed_by_user_id := old.claimed_by_user_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger installers_guard
  before insert or update on public.installers
  for each row execute function private.guard_installer_row();

create or replace function private.touch_handover_checklist()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger handover_checklists_touch
  before update on public.handover_checklists
  for each row execute function private.touch_handover_checklist();

revoke all on function private.guard_profile_row() from public, anon, authenticated;
revoke all on function private.guard_project_row() from public, anon, authenticated;
revoke all on function private.guard_installer_row() from public, anon, authenticated;
revoke all on function private.touch_handover_checklist() from public, anon, authenticated;

-- Trigger functions run as the invoking role and need EXECUTE. They return
-- trigger, so they cannot be used as a data API.
grant execute on function private.guard_profile_row() to authenticated, service_role;
grant execute on function private.guard_project_row() to authenticated, service_role;
grant execute on function private.guard_installer_row() to authenticated, service_role;
grant execute on function private.touch_handover_checklist() to authenticated, service_role;

-- Public directory. security_barrier stops a filter on the output email from
-- reading the underlying column. Unclaimed Silver email is always null, even
-- if is_contact_public was set by mistake. Direct table reads are not granted
-- to anon; signed-in users can read only the row they claimed (see policies).
create view public.installer_directory
with (security_barrier = true, security_invoker = false) as
select
  id,
  company_name,
  country_code,
  city,
  postal_code,
  service_radius_km,
  knx_official_rank,
  is_founding_partner,
  avg_response_hours,
  verified_projects_count,
  public_website,
  case
    when knx_official_rank = 'Silver' and claimed_by_user_id is null then null
    when is_contact_public is not true then null
    else public_email
  end as public_email,
  (knx_official_rank = 'Silver' and claimed_by_user_id is null) as contact_withheld
from public.installers
where opted_out = false;

comment on view public.installer_directory is
  'Redacted installer list. Unclaimed Silver rows have a null public_email. No phone or street address exists on the source table.';

-- ---------------------------------------------------------------------------
-- Grants. Supabase default privileges may have granted everything already.
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.project_rooms from public, anon, authenticated;
revoke all on table public.installers from public, anon, authenticated;
revoke all on table public.installer_fact_cards from public, anon, authenticated;
revoke all on table public.rfqs from public, anon, authenticated;
revoke all on table public.quotes from public, anon, authenticated;
revoke all on table public.handover_checklists from public, anon, authenticated;
revoke all on table public.installer_directory from public, anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
-- Table-level UPDATE would cover every column, and a later column REVOKE does
-- not remove it. Grant UPDATE only on the columns a signed-in owner may change.
grant select, insert, delete on table public.projects to authenticated;
grant update (
  title,
  stage,
  build_type,
  construction_phase,
  area_sqm,
  selected_tier,
  fit_assessment_json,
  budget_estimate_json,
  updated_at
) on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_rooms to authenticated;
grant select, delete on table public.installers to authenticated;
grant update (
  company_name,
  country_code,
  city,
  postal_code,
  service_radius_km,
  is_contact_public,
  public_email,
  public_website,
  avg_response_hours,
  gdpr_art14_notified_at,
  opted_out,
  claimed_by_user_id
) on table public.installers to authenticated;
grant select on table public.installer_fact_cards to anon, authenticated;
grant insert, update, delete on table public.installer_fact_cards to authenticated;
grant select, insert, update, delete on table public.rfqs to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.handover_checklists to authenticated;
grant select on table public.installer_directory to anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.projects to service_role;
grant all on table public.project_rooms to service_role;
grant all on table public.installers to service_role;
grant all on table public.installer_fact_cards to service_role;
grant all on table public.rfqs to service_role;
grant all on table public.quotes to service_role;
grant all on table public.handover_checklists to service_role;
grant select on table public.installer_directory to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_rooms enable row level security;
alter table public.installers enable row level security;
alter table public.installer_fact_cards enable row level security;
alter table public.rfqs enable row level security;
alter table public.quotes enable row level security;
alter table public.handover_checklists enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()) and role is distinct from 'admin');

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (id = (select auth.uid()) and role is distinct from 'admin')
    or (select private.is_admin())
  );

create policy profiles_delete_own
  on public.profiles
  for delete
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy projects_select_own
  on public.projects
  for select
  to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

create policy projects_insert_own
  on public.projects
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()) and is_pro_unlocked is not true and stripe_payment_id is null);

create policy projects_update_own
  on public.projects
  for update
  to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check (owner_id = (select auth.uid()) or (select private.is_admin()));

create policy projects_delete_own
  on public.projects
  for delete
  to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));

create policy project_rooms_all_own
  on public.project_rooms
  for all
  to authenticated
  using ((select private.owns_project(project_id)) or (select private.is_admin()))
  with check ((select private.owns_project(project_id)) or (select private.is_admin()));

create policy installers_select_claimed
  on public.installers
  for select
  to authenticated
  using (claimed_by_user_id = (select auth.uid()) or (select private.is_admin()));

create policy installers_update_claim
  on public.installers
  for update
  to authenticated
  using (claimed_by_user_id = (select auth.uid()) or claimed_by_user_id is null or (select private.is_admin()))
  with check (
    claimed_by_user_id = (select auth.uid())
    or (select private.is_admin())
  );

create policy installers_delete_admin
  on public.installers
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy fact_cards_public_read
  on public.installer_fact_cards
  for select
  to anon, authenticated
  using (
    is_disputed = false
    and expires_at >= current_date
    and (select private.installer_is_listed(installer_id))
  );

create policy fact_cards_claimed_write
  on public.installer_fact_cards
  for insert
  to authenticated
  with check ((select private.claims_installer(installer_id)) or (select private.is_admin()));

create policy fact_cards_claimed_update
  on public.installer_fact_cards
  for update
  to authenticated
  using ((select private.claims_installer(installer_id)) or (select private.is_admin()))
  with check ((select private.claims_installer(installer_id)) or (select private.is_admin()));

create policy fact_cards_claimed_delete
  on public.installer_fact_cards
  for delete
  to authenticated
  using ((select private.claims_installer(installer_id)) or (select private.is_admin()));

create policy rfqs_own
  on public.rfqs
  for all
  to authenticated
  using ((select private.owns_project(project_id)) or (select private.is_admin()))
  with check ((select private.owns_project(project_id)) or (select private.is_admin()));

create policy quotes_select_parties
  on public.quotes
  for select
  to authenticated
  using (
    (select private.owns_rfq(rfq_id))
    or (select private.claims_installer(installer_id))
    or (select private.is_admin())
  );

create policy quotes_insert_installer
  on public.quotes
  for insert
  to authenticated
  with check ((select private.claims_installer(installer_id)) or (select private.is_admin()));

create policy quotes_update_installer
  on public.quotes
  for update
  to authenticated
  using (
    (select private.claims_installer(installer_id))
    or (select private.is_admin())
  )
  with check (
    (select private.claims_installer(installer_id))
    or (select private.is_admin())
  );

create policy quotes_delete_installer
  on public.quotes
  for delete
  to authenticated
  using (
    (select private.claims_installer(installer_id))
    or (select private.is_admin())
  );

create policy handover_own
  on public.handover_checklists
  for all
  to authenticated
  using ((select private.owns_project(project_id)) or (select private.is_admin()))
  with check ((select private.owns_project(project_id)) or (select private.is_admin()));
