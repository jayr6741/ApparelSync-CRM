CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  transfer_number text NOT NULL,
  from_warehouse_id uuid NOT NULL,
  to_warehouse_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')),
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,transfer_number),
  CHECK(from_warehouse_id <> to_warehouse_id),
  FOREIGN KEY(shop_id,from_warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,to_warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS stock_transfers_shop_created_idx ON stock_transfers(shop_id,created_at DESC);
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  transfer_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity integer NOT NULL CHECK(quantity > 0),
  unit_cost numeric(12,2) CHECK(unit_cost IS NULL OR unit_cost >= 0),
  UNIQUE(shop_id,id),
  FOREIGN KEY(shop_id,transfer_id) REFERENCES stock_transfers(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS stock_transfer_items_shop_transfer_idx ON stock_transfer_items(shop_id,transfer_id);
