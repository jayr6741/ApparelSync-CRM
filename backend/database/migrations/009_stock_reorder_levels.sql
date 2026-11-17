CREATE TABLE IF NOT EXISTS stock_reorder_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  reorder_level integer NOT NULL CHECK(reorder_level >= 0),
  target_stock integer NOT NULL CHECK(target_stock >= reorder_level),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,warehouse_id,variant_id),
  FOREIGN KEY(shop_id,warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS stock_reorder_levels_shop_idx ON stock_reorder_levels(shop_id,warehouse_id);
