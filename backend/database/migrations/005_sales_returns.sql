-- GARMENTOS migration 005: transactional sales returns and refunds.
-- Apply after migrations 001-004.
BEGIN;

CREATE TABLE IF NOT EXISTS sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL,
  return_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
  reason text NOT NULL,
  refund_total numeric(14,2) NOT NULL CHECK (refund_total >= 0),
  refund_method text NOT NULL CHECK (refund_method IN ('cash','upi','card','bank_transfer','wallet','other')),
  idempotency_key text NOT NULL,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,return_number),
  UNIQUE(shop_id,idempotency_key),
  FOREIGN KEY(shop_id,sale_id) REFERENCES sales(shop_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  return_id uuid NOT NULL,
  sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  variant_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  refund_amount numeric(14,2) NOT NULL CHECK (refund_amount >= 0),
  restocked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(shop_id,return_id) REFERENCES sales_returns(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE SET NULL (variant_id),
  UNIQUE(shop_id,return_id,sale_item_id)
);
CREATE INDEX IF NOT EXISTS sales_return_items_shop_sale_line_idx ON sales_return_items(shop_id,sale_item_id);

CREATE TABLE IF NOT EXISTS sales_return_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  return_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('cash','upi','card','bank_transfer','wallet','other')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  reference_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(shop_id,return_id) REFERENCES sales_returns(shop_id,id) ON DELETE CASCADE
);

COMMIT;
