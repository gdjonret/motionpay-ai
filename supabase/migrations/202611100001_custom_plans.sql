begin;
-- AI-built plans are priced per plan by the backend and unlocked through the same
-- verified PayPal capture flow as the fixed program.

-- Catalog anchor for custom-plan purchases. Inactive so reserve_program_checkout never sells it.
insert into public.programs (id, title, price_cents, currency, active)
values ('custom-plan', 'AI Custom Plan', 799, 'USD', false)
on conflict (id) do nothing;

create table public.custom_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 80),
  preferences jsonb not null,
  content jsonb not null,
  generated_by text not null check (generated_by in ('ai', 'rules')),
  price_cents integer not null check (price_cents between 100 and 5000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  purchase_id uuid unique,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((purchase_id is null) = (unlocked_at is null))
);
create index custom_plans_user_idx on public.custom_plans(user_id, created_at desc);

alter table public.purchases add column plan_id uuid references public.custom_plans(id);
alter table public.purchases add constraint purchases_plan_matches_program
  check ((program_id = 'custom-plan') = (plan_id is not null));
alter table public.custom_plans add constraint custom_plans_purchase_fk
  foreign key (purchase_id) references public.purchases(id);

-- One pending checkout per user and program, or per user and custom plan.
drop index public.purchases_one_pending;
create unique index purchases_one_pending on public.purchases(
  user_id, program_id, coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid)
) where status in ('creating', 'created');

alter table public.custom_plans enable row level security;
revoke all on public.custom_plans from anon, authenticated;
grant select on public.custom_plans to authenticated;
grant all on public.custom_plans to service_role;
create policy "Read own plans" on public.custom_plans for select to authenticated using ((select auth.uid()) = user_id);

create function public.reserve_plan_checkout(p_user_id uuid, p_plan_id uuid, p_return_base text)
returns setof public.purchases language plpgsql security invoker set search_path = '' as $$
declare pending public.purchases%rowtype; plan public.custom_plans%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':plan:' || p_plan_id::text, 0));
  select * into plan from public.custom_plans where id = p_plan_id and user_id = p_user_id for update;
  if not found then raise exception 'Plan not found'; end if;
  if plan.unlocked_at is not null then raise exception 'Plan already unlocked'; end if;
  select * into pending from public.purchases
    where user_id = p_user_id and program_id = 'custom-plan' and plan_id = p_plan_id and status in ('creating', 'created') for update;
  if found then return next pending; return; end if;
  insert into public.purchases(user_id, program_id, plan_id, status, amount_cents, currency, checkout_title, return_base)
    values (p_user_id, 'custom-plan', plan.id, 'creating', plan.price_cents, plan.currency, plan.title, p_return_base)
    returning * into pending;
  return next pending;
end;
$$;
revoke all on function public.reserve_plan_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_plan_checkout(uuid, uuid, text) to service_role;

-- Same signature and guarantees as before; custom-plan purchases unlock their plan instead of a program entitlement.
create or replace function public.complete_program_purchase(p_order_id text, p_user_id uuid, p_capture_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare purchase public.purchases%rowtype;
begin
  select * into purchase from public.purchases
    where paypal_order_id = p_order_id and user_id = p_user_id for update;
  if not found then raise exception 'Purchase not found'; end if;
  if purchase.status = 'completed' and purchase.paypal_capture_id <> p_capture_id then
    raise exception 'Capture mismatch';
  end if;
  update public.purchases set status = 'completed', paypal_capture_id = p_capture_id,
    completed_at = coalesce(completed_at, now()) where id = purchase.id;
  if purchase.plan_id is not null then
    update public.custom_plans set purchase_id = purchase.id, unlocked_at = coalesce(unlocked_at, now())
      where id = purchase.plan_id and user_id = purchase.user_id and (purchase_id is null or purchase_id = purchase.id);
    if not found then raise exception 'Plan unlock conflict'; end if;
  else
    insert into public.program_entitlements(user_id, program_id, purchase_id)
      values (purchase.user_id, purchase.program_id, purchase.id)
      on conflict (user_id, program_id) do nothing;
  end if;
end;
$$;
revoke all on function public.complete_program_purchase(text, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_program_purchase(text, uuid, text) to service_role;
commit;
