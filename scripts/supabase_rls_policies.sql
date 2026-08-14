-- Run in Supabase SQL Editor after mapping legacy technicians.id to auth.users.id.
-- Never ship SUPABASE_SERVICE_ROLE_KEY to the browser.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.technicians t
    where lower(t.email) = lower(auth.email()) and coalesce(t.is_deleted, false) = false
      and lower(coalesce(t.role, '')) like '%admin%'
  );
$$;

alter table if exists public.machines enable row level security;
alter table if exists public.work_orders enable row level security;
alter table if exists public.activity_logs enable row level security;
alter table if exists public.machine_services enable row level security;
alter table if exists public.technicians enable row level security;

-- Remove permissive policies before recreating them.
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('machines','work_orders','activity_logs','machine_services','technicians') loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy machines_read on public.machines for select to authenticated
  using (coalesce(is_deleted, false) = false or public.is_admin());
create policy machines_admin_write on public.machines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy work_orders_read on public.work_orders for select to authenticated
  using (public.is_admin() or exists (select 1 from public.technicians t where t.id = work_orders.technician_id and lower(t.email) = lower(auth.email())));
create policy work_orders_admin_write on public.work_orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy work_orders_technician_update on public.work_orders for update to authenticated
  using (exists (select 1 from public.technicians t where t.id = work_orders.technician_id and lower(t.email) = lower(auth.email()))) with check (exists (select 1 from public.technicians t where t.id = work_orders.technician_id and lower(t.email) = lower(auth.email())));

create policy activity_logs_admin_read on public.activity_logs for select to authenticated
  using (public.is_admin());
create or replace function public.is_current_actor(actor_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.technicians t
    where lower(t.email) = lower(auth.email())
      and coalesce(t.is_deleted, false) = false
      and t.nama_lengkap = actor_name
  );
$$;

create policy activity_logs_authenticated_insert on public.activity_logs for insert to authenticated
  with check (public.is_admin() or public.is_current_actor(actor_name));

create policy machine_services_read on public.machine_services for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.work_orders w
      join public.technicians t on t.id = w.technician_id
      where w.machine_id = machine_services.machine_id
        and lower(t.email) = lower(auth.email())
        and coalesce(t.is_deleted, false) = false
    )
  );
create policy machine_services_write on public.machine_services for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.work_orders w
      join public.technicians t on t.id = w.technician_id
      where w.machine_id = machine_services.machine_id
        and lower(t.email) = lower(auth.email())
        and coalesce(t.is_deleted, false) = false
        and w.status in ('Open', 'In Progress')
    )
  );
create policy machine_services_admin_update on public.machine_services for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy machine_services_admin_delete on public.machine_services for delete to authenticated
  using (public.is_admin());

create policy technicians_self_read on public.technicians for select to authenticated
  using (lower(email) = lower(auth.email()) or public.is_admin());
create policy technicians_admin_write on public.technicians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Safe collision protection. Existing duplicates must be cleaned before this runs.
create unique index if not exists work_orders_wo_number_unique on public.work_orders (wo_number);
create unique index if not exists machines_product_id_unique on public.machines (product_id) where product_id is not null;
create unique index if not exists machines_serial_number_unique on public.machines (serial_number) where serial_number is not null;

-- Atomic machine update + optional automatic work order. Adjust column names if the live schema differs.
create or replace function public.update_machine_with_work_order(machine_payload jsonb, work_order_payload jsonb default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare machine_id uuid; result jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  machine_id := (machine_payload->>'id')::uuid;
  update public.machines set
    product_id = machine_payload->>'product_id', serial_number = machine_payload->>'serial_number',
    nama_mesin = machine_payload->>'nama_mesin', nama_klien = machine_payload->>'nama_klien',
    kategori = machine_payload->>'kategori', pabrikan = machine_payload->>'pabrikan',
    negara_asal = machine_payload->>'negara_asal', tahun_pembuatan = machine_payload->>'tahun_pembuatan',
    kondisi = machine_payload->>'kondisi', tanggal_serah_terima = nullif(machine_payload->>'tanggal_serah_terima',''),
    foto_mesin = machine_payload->>'foto_mesin', buku_manual = machine_payload->>'buku_manual'
  where id = machine_id;
  if not found then raise exception 'machine not found'; end if;
  if work_order_payload is not null then insert into public.work_orders select * from jsonb_populate_record(null::public.work_orders, work_order_payload); end if;
  select to_jsonb(m) into result from public.machines m where m.id = machine_id;
  return result;
end $$;
