-- GARMENTOS migration 004: POS checkout, invoice sequencing and tender ledger.
BEGIN;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK(subtotal>=0);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_total numeric(14,2) NOT NULL DEFAULT 0 CHECK(tax_total>=0);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warehouse_id uuid;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sales ADD CONSTRAINT sales_shop_branch_fk FOREIGN KEY(shop_id,branch_id) REFERENCES branches(shop_id,id) ON DELETE RESTRICT;
ALTER TABLE sales ADD CONSTRAINT sales_shop_warehouse_fk FOREIGN KEY(shop_id,warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS sales_shop_invoice_number_uq ON sales(shop_id,invoice_number) WHERE invoice_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sales_shop_idempotency_uq ON sales(shop_id,idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_sequences (
 shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
 financial_year text NOT NULL,
 last_number bigint NOT NULL DEFAULT 0 CHECK(last_number>=0),
 PRIMARY KEY(shop_id,financial_year)
);
CREATE TABLE IF NOT EXISTS sale_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 shop_id uuid NOT NULL,
 sale_id uuid NOT NULL,
 method text NOT NULL CHECK(method IN ('cash','upi','card','bank_transfer','wallet','gift_card','other')),
 amount numeric(14,2) NOT NULL CHECK(amount>0),
 reference_number text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(shop_id,sale_id) REFERENCES sales(shop_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sale_payments_shop_sale_idx ON sale_payments(shop_id,sale_id);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK(tax_rate>=0 AND tax_rate<=100);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0);
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0);
COMMIT;
