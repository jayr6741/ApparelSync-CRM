-- GARMENTOS migration 006: supplier purchase returns and stock reversal.
-- Apply after migrations 001-005.
BEGIN;

ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0
  CHECK (quantity_returned >= 0 AND quantity_returned <= quantity_received);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  return_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
  reason text NOT NULL,
  return_total numeric(14,2) NOT NULL CHECK (return_total >= 0),
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,return_number),
  FOREIGN KEY(shop_id,supplier_id) REFERENCES suppliers(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,purchase_id) REFERENCES purchase_orders(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_returns_shop_supplier_date_idx
  ON purchase_returns(shop_id,supplier_id,created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_returns_shop_purchase_date_idx
  ON purchase_returns(shop_id,purchase_id,created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  return_id uuid NOT NULL,
  purchase_item_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_total numeric(14,2) NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(shop_id,return_id) REFERENCES purchase_returns(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(purchase_item_id) REFERENCES purchase_items(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_return_items_shop_line_idx
  ON purchase_return_items(shop_id,purchase_item_id);

COMMIT;
