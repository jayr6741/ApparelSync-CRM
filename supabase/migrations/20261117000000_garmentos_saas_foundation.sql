-- GARMENTOS phase 1: tenant isolation and garment inventory foundation
-- Additive migration. Existing unassigned legacy rows remain inaccessible to authenticated shop users
-- until an administrator explicitly maps them to a shop. No business tables are dropped.

begin;

create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency_code char(3) not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  gst_enabled boolean not null default true,
  gstin text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','cashier','inventory')) ,
  status text not null default 'active' check (status in ('active','invited','suspended')),
  created_at timestamptz not null default now(),
  unique (shop_id, user_id)
);

create index if not exists idx_shop_members_user on public.shop_members(user_id, status);

create or replace function public.is_shop_member(p_shop_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.shop_members sm
    where sm.shop_id = p_shop_id
      and sm.user_id = (select auth.uid())
      and sm.status = 'active'
  );
$$;

revoke all on function public.is_shop_member(uuid) from public;
grant execute on function public.is_shop_member(uuid) to authenticated;

create or replace function public.create_default_shop_for_new_user()
returns trigger
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  new_shop_id uuid;
  shop_name text;
  shop_slug text;
begin
  shop_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'shop_name'), ''), 'My Store');
  shop_slug := 'shop-' || replace(new.id::text, '-', '');
  insert into public.shops (name, slug, created_by)
  values (shop_name, shop_slug, new.id)
  returning id into new_shop_id;
  insert into public.shop_members (shop_id, user_id, role, status)
  values (new_shop_id, new.id, 'owner', 'active');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_shop on auth.users;
create trigger on_auth_user_created_create_shop
  after insert on auth.users
  for each row execute procedure public.create_default_shop_for_new_user();

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  city text,
  state text,
  pincode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (shop_id, code)
);

alter table public.categories add column if not exists shop_id uuid references public.shops(id) on delete cascade;
alter table public.products add column if not exists shop_id uuid references public.shops(id) on delete cascade;
alter table public.sales add column if not exists shop_id uuid references public.shops(id) on delete cascade;
alter table public.sale_items add column if not exists shop_id uuid references public.shops(id) on delete cascade;
alter table public.customers add column if not exists shop_id uuid references public.shops(id) on delete cascade;
alter table if exists public.point_transactions add column if not exists shop_id uuid references public.shops(id) on delete cascade;

-- Remove global uniqueness from starter schema; SKUs/category names are shop-scoped.
alter table public.categories drop constraint if exists categories_name_key;
alter table public.products drop constraint if exists products_sku_key;
create unique index if not exists idx_categories_shop_name on public.categories(shop_id, lower(name)) where shop_id is not null;
create unique index if not exists idx_products_shop_sku on public.products(shop_id, sku) where shop_id is not null;

-- Composite parent key must exist before the tenant-safe variant foreign key is declared.
create unique index if not exists idx_products_id_shop on public.products(id, shop_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null,
  sku text not null,
  barcode text,
  size text not null,
  colour text not null,
  price numeric(12,2) not null check (price >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, sku),
  constraint product_variants_product_shop_fk foreign key (product_id, shop_id)
    references public.products(id, shop_id) on delete cascade
);

create unique index if not exists idx_product_variants_barcode on public.product_variants(shop_id, barcode)
  where barcode is not null;
create index if not exists idx_product_variants_product on public.product_variants(shop_id, product_id);
create index if not exists idx_product_variants_stock on public.product_variants(shop_id, stock_quantity);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','purchase','sale','sale_return','purchase_return','adjustment','transfer_in','transfer_out')),
  quantity_delta integer not null check (quantity_delta <> 0),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_movements_variant_date on public.inventory_movements(shop_id, variant_id, created_at desc);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  gstin text,
  address text,
  city text,
  state text,
  pincode text,
  opening_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_suppliers_shop_name on public.suppliers(shop_id, name);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_number text not null,
  status text not null default 'draft' check (status in ('draft','ordered','partially_received','received','cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shop_id, purchase_number)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  line_total numeric(12,2) not null default 0 check (line_total >= 0)
);

create index if not exists idx_purchase_orders_shop_date on public.purchase_orders(shop_id, created_at desc);
create index if not exists idx_purchase_items_order on public.purchase_order_items(shop_id, purchase_order_id);

-- GST fields are stored as invoice snapshots; rates must be configured/validated by each shop.
alter table if exists public.sales add column if not exists invoice_number text;
alter table if exists public.sales add column if not exists place_of_supply_state text;
alter table if exists public.sales add column if not exists taxable_amount numeric(12,2) not null default 0;
alter table if exists public.sales add column if not exists cgst_amount numeric(12,2) not null default 0;
alter table if exists public.sales add column if not exists sgst_amount numeric(12,2) not null default 0;
alter table if exists public.sales add column if not exists igst_amount numeric(12,2) not null default 0;
alter table if exists public.sales add column if not exists gstin_snapshot text;
create unique index if not exists idx_sales_shop_invoice on public.sales(shop_id, invoice_number) where invoice_number is not null;

-- Enable RLS and remove all legacy permissive policies on tenant-owned tables.
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array['shops','shop_members','branches','categories','products','sales','sale_items','customers','point_transactions','product_variants','inventory_movements','suppliers','purchase_orders','purchase_order_items']
  loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
      end loop;
    end if;
  end loop;
end $$;

-- A user can read only shops they belong to; membership changes are owner/admin controlled.
create policy shops_select_member on public.shops for select to authenticated
  using (public.is_shop_member(id));
create policy shops_update_admin on public.shops for update to authenticated
  using (exists (select 1 from public.shop_members sm where sm.shop_id = id and sm.user_id = auth.uid() and sm.status = 'active' and sm.role in ('owner','admin')))
  with check (public.is_shop_member(id));

create policy shop_members_select_member on public.shop_members for select to authenticated
  using (public.is_shop_member(shop_id));
create policy shop_members_insert_admin on public.shop_members for insert to authenticated
  with check (exists (select 1 from public.shop_members sm where sm.shop_id = shop_id and sm.user_id = auth.uid() and sm.status = 'active' and sm.role in ('owner','admin')));
create policy shop_members_update_admin on public.shop_members for update to authenticated
  using (exists (select 1 from public.shop_members sm where sm.shop_id = shop_members.shop_id and sm.user_id = auth.uid() and sm.status = 'active' and sm.role in ('owner','admin')))
  with check (exists (select 1 from public.shop_members sm where sm.shop_id = shop_members.shop_id and sm.user_id = auth.uid() and sm.status = 'active' and sm.role in ('owner','admin')));

do $$
declare
  tbl text;
begin
  foreach tbl in array array['branches','categories','products','sales','sale_items','customers','point_transactions','product_variants','inventory_movements','suppliers','purchase_orders','purchase_order_items']
  loop
    if to_regclass('public.' || tbl) is not null then
      execute format('create policy %I on public.%I for select to authenticated using (public.is_shop_member(shop_id))', tbl || '_select_shop_member', tbl);
      execute format('create policy %I on public.%I for insert to authenticated with check (public.is_shop_member(shop_id))', tbl || '_insert_shop_member', tbl);
      execute format('create policy %I on public.%I for update to authenticated using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id))', tbl || '_update_shop_member', tbl);
      execute format('create policy %I on public.%I for delete to authenticated using (public.is_shop_member(shop_id))', tbl || '_delete_shop_member', tbl);
    end if;
  end loop;
end $$;

commit;

-- IMPORTANT:
-- 1) Existing rows in legacy tables keep shop_id = NULL and are intentionally invisible after RLS hardening.
-- 2) Before migration on a database containing real data, take a backup and prepare an explicit ownership/backfill plan.
-- 3) New signups get a default shop. Existing auth users need a shop/membership created by a trusted admin process.
-- 4) This migration establishes tables and access boundaries; transactional POS/RPC operations are a later phase.