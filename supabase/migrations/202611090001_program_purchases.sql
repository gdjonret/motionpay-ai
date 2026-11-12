begin;
create table public.programs (
  id text primary key,
  title text not null,
  price_cents integer not null check (price_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default false
);
insert into public.programs (id, title, price_cents, currency)
values ('beginner-strength', 'Beginner Strength Essentials', 999, 'USD');

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id text not null references public.programs(id),
  paypal_order_id text not null unique,
  paypal_capture_id text unique,
  status text not null check (status in ('created', 'completed', 'cancelled', 'failed')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id, program_id),
  check (status <> 'completed' or (paypal_capture_id is not null and completed_at is not null))
);
create index purchases_user_idx on public.purchases(user_id);
create table public.program_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id text not null references public.programs(id),
  purchase_id uuid not null unique,
  granted_at timestamptz not null default now(),
  primary key (user_id, program_id),
  foreign key (purchase_id, user_id, program_id) references public.purchases(id, user_id, program_id)
);
alter table public.programs enable row level security;
alter table public.purchases enable row level security;
alter table public.program_entitlements enable row level security;
revoke all on public.programs, public.purchases, public.program_entitlements from anon, authenticated;
grant select on public.programs to anon, authenticated;
grant select on public.purchases, public.program_entitlements to authenticated;
create policy "Read active programs" on public.programs for select using (active);
create policy "Read own purchases" on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own access" on public.program_entitlements for select to authenticated using ((select auth.uid()) = user_id);
-- No client writes; the future payment handler must verify capture before granting access.
commit;
