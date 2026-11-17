-- GARMENTOS migration 002: garment catalogue and branch-aware stock foundation.
-- Apply after 001_initial_postgresql.sql on a fresh GARMENTOS PostgreSQL database.
BEGIN;

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  pincode text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, code),
  UNIQUE(shop_id, id)
);

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, id),
  FOREIGN KEY(shop_id, branch_id) REFERENCES branches(shop_id,id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS pos_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(shop_id, code),
  FOREIGN KEY(shop_id, branch_id) REFERENCES branches(shop_id,id) ON DELETE RESTRICT
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'unisex'
  CHECK (department IN ('men','women','kids','unisex'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS garment_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pattern text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fit text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS season text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS care_instructions text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('draft','active','archived'));

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS colour text;
UPDATE product_variants SET colour=color WHERE colour IS NULL;
ALTER TABLE product_variants ALTER COLUMN colour SET NOT NULL;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS mrp numeric(12,2) NOT NULL DEFAULT 0 CHECK (mrp >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2) CHECK (wholesale_price IS NULL OR wholesale_price >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_shop_product_size_colour_uq
  ON product_variants(shop_id, product_id, size, colour);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  image_url text NOT NULL,
  alt_text text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(shop_id, product_id) REFERENCES products(shop_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_uq ON product_images(shop_id,product_id) WHERE is_primary=true;

CREATE TABLE IF NOT EXISTS garment_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  attribute_type text NOT NULL DEFAULT 'text' CHECK(attribute_type IN ('text','number','select')),
  UNIQUE(shop_id, name),
  UNIQUE(shop_id,id)
);
CREATE TABLE IF NOT EXISTS garment_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  attribute_id uuid NOT NULL,
  value text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  FOREIGN KEY(shop_id,attribute_id) REFERENCES garment_attributes(shop_id,id) ON DELETE CASCADE,
  UNIQUE(attribute_id,value),
  UNIQUE(shop_id,id)
);
CREATE TABLE IF NOT EXISTS variant_attribute_values (
  shop_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  attribute_value_id uuid NOT NULL,
  PRIMARY KEY(variant_id,attribute_value_id),
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,attribute_value_id) REFERENCES garment_attribute_values(shop_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_type text NOT NULL DEFAULT 'alpha' CHECK(size_type IN ('alpha','numeric','custom')),
  category_id uuid,
  brand text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  FOREIGN KEY(shop_id,category_id) REFERENCES categories(shop_id,id) ON DELETE SET NULL(category_id)
);
CREATE TABLE IF NOT EXISTS size_chart_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  size_chart_id uuid NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(size_chart_id,label),
  FOREIGN KEY(shop_id,size_chart_id) REFERENCES size_charts(shop_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'retail' CHECK(channel IN ('retail','wholesale','vip','online','custom')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,id),
  UNIQUE(shop_id,name)
);
CREATE TABLE IF NOT EXISTS variant_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  price_list_id uuid NOT NULL,
  price numeric(12,2) NOT NULL CHECK(price >= 0),
  minimum_quantity integer NOT NULL DEFAULT 1 CHECK(minimum_quantity > 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE CASCADE,
  FOREIGN KEY(shop_id,price_list_id) REFERENCES price_lists(shop_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  on_hand integer NOT NULL DEFAULT 0 CHECK(on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK(reserved >= 0),
  damaged integer NOT NULL DEFAULT 0 CHECK(damaged >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id,warehouse_id,variant_id),
  FOREIGN KEY(shop_id,warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT,
  CHECK(reserved + damaged <= on_hand)
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  movement_type text NOT NULL CHECK(movement_type IN ('opening','purchase','sale','sale_return','purchase_return','adjustment','transfer_in','transfer_out','damage')),
  quantity_delta integer NOT NULL CHECK(quantity_delta <> 0),
  unit_cost numeric(12,2) CHECK(unit_cost IS NULL OR unit_cost >= 0),
  source_type text NOT NULL,
  source_id uuid,
  reason text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(shop_id,warehouse_id) REFERENCES warehouses(shop_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(shop_id,variant_id) REFERENCES product_variants(shop_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS stock_movements_shop_variant_date_idx ON stock_movements(shop_id,variant_id,created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_shop_date_idx ON audit_logs(shop_id,created_at DESC);

INSERT INTO branches(shop_id,code,name)
SELECT s.id,'MAIN','Main Branch' FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.shop_id=s.id);

INSERT INTO warehouses(shop_id,branch_id,name)
SELECT b.shop_id,b.id,'Main Warehouse' FROM branches b
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.shop_id=b.shop_id AND w.branch_id=b.id);

INSERT INTO price_lists(shop_id,name,channel,is_default)
SELECT s.id,'Retail','retail',true FROM shops s
WHERE NOT EXISTS (SELECT 1 FROM price_lists p WHERE p.shop_id=s.id AND p.channel='retail' AND p.is_default=true);

COMMIT;
