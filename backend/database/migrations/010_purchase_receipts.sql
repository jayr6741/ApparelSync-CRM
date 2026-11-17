CREATE TABLE IF NOT EXISTS purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  receipt_number text NOT NULL,
  notes text,
  received_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,receipt_number),
  FOREIGN KEY(shop_id,purchase_id) REFERENCES purchase_orders(shop_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS purchase_receipts_shop_purchase_idx ON purchase_receipts(shop_id,purchase_id,received_at DESC);
CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  purchase_item_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  quantity_received integer NOT NULL CHECK(quantity_received>0),
  unit_cost numeric(14,2) NOT NULL CHECK(unit_cost>=0),
  FOREIGN KEY(shop_id,receipt_id) REFERENCES purchase_receipts(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,purchase_item_id) REFERENCES purchase_items(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS purchase_receipt_items_shop_receipt_idx ON purchase_receipt_items(shop_id,receipt_id);
