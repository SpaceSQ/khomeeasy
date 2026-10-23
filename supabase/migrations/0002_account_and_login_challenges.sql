-- Account fields and one-time website login codes.
-- Street and house number stay on the owner's own row. They are not added to
-- installer_directory. Official rank and subscription stay server-controlled.

alter table public.profiles
  add column if not exists city text,
  add column if not exists house_number text,
  add column if not exists address_line text,
  add column if not exists area_sqm integer,
  add column if not exists floors integer,
  add column if not exists room_count integer;

alter table public.profiles
  drop constraint if exists profiles_area_sqm_check,
  drop constraint if exists profiles_floors_check,
  drop constraint if exists profiles_room_count_check;

alter table public.profiles
  add constraint profiles_area_sqm_check check (area_sqm is null or area_sqm > 0),
  add constraint profiles_floors_check check (floors is null or floors > 0),
  add constraint profiles_room_count_check check (room_count is null or room_count > 0);

comment on column public.profiles.address_line is
  'Owner-only street. Not copied into the public installer directory.';
comment on column public.profiles.house_number is
  'Owner-only house number. Not shown to installers until a later request explicitly includes it.';

alter table public.installers
  add column if not exists street_address text;

comment on column public.installers.street_address is
  'Visible only through the claimed account. The public directory view does not select this column.';

create table if not exists public.login_challenges (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  role text not null check (role in ('homeowner', 'installer')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed')),
  approved_by uuid references public.profiles (id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.login_challenges is
  'Short-lived website login codes. Only the service role can read or write them.';

alter table public.login_challenges enable row level security;
revoke all on table public.login_challenges from public, anon, authenticated;
grant all on table public.login_challenges to service_role;

create index if not exists login_challenges_expires_at_idx
  on public.login_challenges (expires_at);
