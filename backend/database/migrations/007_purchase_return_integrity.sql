-- GARMENTOS migration 007: enforce tenant and purchase-line integrity for supplier returns.
-- Apply after migrations 001-006.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_shop_id_supplier_uq
  ON purchase_orders(shop_id,id,supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_items_shop_purchase_id_uq
  ON purchase_items(shop_id,purchase_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS purchase_returns_shop_id_purchase_uq
  ON purchase_returns(shop_id,id,purchase_id);

ALTER TABLE purchase_returns
  ADD CONSTRAINT purchase_returns_purchase_supplier_fk
  FOREIGN KEY(shop_id,purchase_id,supplier_id)
  REFERENCES purchase_orders(shop_id,id,supplier_id)
  ON DELETE RESTRICT;

ALTER TABLE purchase_return_items
  ADD COLUMN IF NOT EXISTS purchase_id uuid;

UPDATE purchase_return_items pri
SET purchase_id=pr.purchase_id
FROM purchase_returns pr
WHERE pr.shop_id=pri.shop_id AND pr.id=pri.return_id
  AND pri.purchase_id IS NULL;

ALTER TABLE purchase_return_items
  ALTER COLUMN purchase_id SET NOT NULL;

ALTER TABLE purchase_return_items
  ADD CONSTRAINT purchase_return_items_return_purchase_fk
  FOREIGN KEY(shop_id,return_id,purchase_id)
  REFERENCES purchase_returns(shop_id,id,purchase_id)
  ON DELETE CASCADE;

ALTER TABLE purchase_return_items
  ADD CONSTRAINT purchase_return_items_purchase_line_fk
  FOREIGN KEY(shop_id,purchase_id,purchase_item_id)
  REFERENCES purchase_items(shop_id,purchase_id,id)
  ON DELETE RESTRICT;

COMMIT;
