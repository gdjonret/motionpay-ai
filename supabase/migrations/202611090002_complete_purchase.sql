begin;
create unique index purchases_one_pending on public.purchases(user_id, program_id) where status = 'created';
-- Service-role only: the backend verifies PayPal before invoking this transaction.
grant all on public.programs, public.purchases, public.program_entitlements to service_role;
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
  insert into public.program_entitlements(user_id, program_id, purchase_id)
    values (purchase.user_id, purchase.program_id, purchase.id)
    on conflict (user_id, program_id) do nothing;
end;
$$;
revoke all on function public.complete_program_purchase(text, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_program_purchase(text, uuid, text) to service_role;
-- Enable only the single sandbox prototype program.
update public.programs set active = true where id = 'beginner-strength';
commit;
