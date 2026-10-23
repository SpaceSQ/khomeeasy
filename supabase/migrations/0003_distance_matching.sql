-- Coordinates for distance matching. Homeowner coordinates stay on the owner row.
-- The public directory publishes a contractor street only after the company claims
-- the profile. Unclaimed rows, including Silver, keep a null street.

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.installers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists house_number text;

drop view if exists public.installer_directory;

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
  latitude,
  longitude,
  case
    when claimed_by_user_id is null then null
    else nullif(btrim(concat_ws(' ', street_address, house_number)), '')
  end as public_street,
  case
    when knx_official_rank = 'Silver' and claimed_by_user_id is null then null
    when is_contact_public is not true then null
    else public_email
  end as public_email,
  (knx_official_rank = 'Silver' and claimed_by_user_id is null) as contact_withheld
from public.installers
where opted_out = false;

comment on view public.installer_directory is
  'Public contractor list. Unclaimed rows have no street and unclaimed Silver rows have no email. Subscription tier is not selected.';

grant select on table public.installer_directory to anon, authenticated, service_role;

notify pgrst, 'reload schema';
