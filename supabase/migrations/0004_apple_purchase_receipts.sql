-- Apple in-app purchase receipts. The signed transaction is checked on the
-- server and is not stored. Clients may read their own rows and cannot insert
-- or change them. projects.is_pro_unlocked and installers.subscription_tier
-- stay server-written by the existing guards.

create table public.apple_purchase_receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  transaction_id text not null,
  original_transaction_id text,
  product_id text not null check (product_id in (
    'com.gzzhijia.khomeeasy.project_pro_pass',
    'com.gzzhijia.khomeeasy.partner_workbench_monthly'
  )),
  product_kind text not null check (product_kind in ('project_pass', 'workbench_subscription')),
  price_milliunits integer not null,
  currency text not null default 'EUR',
  purchased_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  environment text,
  project_id uuid references public.projects (id) on delete set null,
  installer_id uuid references public.installers (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint apple_purchase_receipts_transaction_id_key unique (transaction_id)
);

create index apple_purchase_receipts_user_id_idx on public.apple_purchase_receipts (user_id);

alter table public.apple_purchase_receipts enable row level security;

revoke all on table public.apple_purchase_receipts from public, anon, authenticated;
grant select on table public.apple_purchase_receipts to authenticated;
grant all on table public.apple_purchase_receipts to service_role;

create policy apple_purchase_receipts_select_own
  on public.apple_purchase_receipts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.apple_purchase_receipts is
  'Apple transaction ids after server verification. The JWS itself is not stored.';
