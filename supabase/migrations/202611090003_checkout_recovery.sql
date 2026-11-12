begin;
-- Reserve the local purchase BEFORE contacting PayPal. Its UUID is the durable
-- PayPal-Request-Id, so retries after a timeout use the same remote order.
alter table public.purchases alter column paypal_order_id drop not null;
alter table public.purchases drop constraint purchases_status_check;
alter table public.purchases add constraint purchases_status_check check (status in ('creating','created','completed','cancelled','failed'));
alter table public.purchases add column checkout_title text;
alter table public.purchases add column return_base text;
drop index public.purchases_one_pending;
create unique index purchases_one_pending on public.purchases(user_id, program_id) where status in ('creating','created');

create function public.reserve_program_checkout(p_user_id uuid, p_return_base text)
returns setof public.purchases language plpgsql security invoker set search_path = '' as $$
declare pending public.purchases%rowtype; program public.programs%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':beginner-strength',0));
  if exists(select 1 from public.program_entitlements where user_id=p_user_id and program_id='beginner-strength') then
    raise exception 'Program already owned';
  end if;
  select * into pending from public.purchases where user_id=p_user_id and program_id='beginner-strength' and status in ('creating','created') for update;
  if found then return next pending; return; end if;
  select * into program from public.programs where id='beginner-strength' and active;
  if not found then raise exception 'Program unavailable'; end if;
  insert into public.purchases(user_id,program_id,status,amount_cents,currency,checkout_title,return_base)
    values(p_user_id,program.id,'creating',program.price_cents,program.currency,program.title,p_return_base) returning * into pending;
  return next pending;
end;
$$;

create function public.bind_program_checkout(p_purchase_id uuid, p_user_id uuid, p_order_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare pending public.purchases%rowtype;
begin
  select * into pending from public.purchases where id=p_purchase_id and user_id=p_user_id for update;
  if not found or pending.status not in ('creating','created') then raise exception 'Checkout unavailable'; end if;
  if pending.paypal_order_id is not null and pending.paypal_order_id <> p_order_id then raise exception 'Order mismatch'; end if;
  update public.purchases set paypal_order_id=p_order_id,status='created' where id=pending.id;
end;
$$;
revoke all on function public.reserve_program_checkout(uuid,text) from public,anon,authenticated;
revoke all on function public.bind_program_checkout(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_program_checkout(uuid,text), public.bind_program_checkout(uuid,uuid,text) to service_role;
commit;
