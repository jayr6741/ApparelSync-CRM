-- GARMENTOS migration 003: supplier and purchasing workflow foundation.
BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  gstin text,
  address text,
  city text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id)
);
CREATE INDEX IF NOT EXISTS suppliers_shop_name_idx ON suppliers(shop_id,name);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  purchase_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ordered','partially_received','received','cancelled')),
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK(subtotal>=0),
  tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK(tax_total>=0),
  discount_total numeric(14,2) NOT NULL DEFAULT 0 CHECK(discount_total>=0),
  grand_total numeric(14,2) NOT NULL DEFAULT 0 CHECK(grand_total>=0),
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,purchase_number),
  FOREIGN KEY(shop_id,supplier_id) REFERENCES suppliers(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_orders_shop_date_idx ON purchase_orders(shop_id,created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity_ordered integer NOT NULL CHECK(quantity_ordered>0),
  quantity_received integer NOT NULL DEFAULT 0 CHECK(quantity_received>=0 AND quantity_received<=quantity_ordered),
  unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=100),
  tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
  line_total numeric(14,2) NOT NULL CHECK(line_total>=0),
  FOREIGN KEY(shop_id,purchase_id) REFERENCES purchase_orders(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_items_shop_purchase_idx ON purchase_items(shop_id,purchase_id);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_id uuid,
  amount numeric(14,2) NOT NULL CHECK(amount>0),
  payment_method text NOT NULL CHECK(payment_method IN ('cash','upi','bank_transfer','card','cheque','other')),
  reference_number text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  FOREIGN KEY(shop_id,supplier_id) REFERENCES suppliers(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,purchase_id) REFERENCES purchase_orders(shop_id,id) ON DELETE SET NULL (purchase_id)
);
CREATE INDEX IF NOT EXISTS supplier_payments_shop_date_idx ON supplier_payments(shop_id,paid_at DESC);

COMMIT;
