-- GARMENTOS standalone PostgreSQL baseline.
-- Apply to a NEW empty PostgreSQL database only. Do not run against a live database
-- until a reviewed data migration and backup/restore test are complete.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uq ON app_users (lower(email));

CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  currency_code char(3) NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  gstin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_members (
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','manager','cashier','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS shop_members_user_idx ON shop_members(user_id);

CREATE TABLE IF NOT EXISTS app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, name),
  UNIQUE(shop_id, id)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  category_id uuid,
  barcode text,
  qr_data text,
  bonus_points integer NOT NULL DEFAULT 0 CHECK (bonus_points >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, id),
  UNIQUE(shop_id, sku),
  FOREIGN KEY (shop_id, category_id) REFERENCES categories(shop_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS products_shop_barcode_uq ON products(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_shop_name_idx ON products(shop_id, name);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  size text NOT NULL,
  color text NOT NULL,
  sku text NOT NULL,
  barcode text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, id),
  UNIQUE(shop_id, sku),
  UNIQUE(product_id, size, color),
  FOREIGN KEY (shop_id, product_id) REFERENCES products(shop_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_shop_barcode_uq ON product_variants(shop_id, barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  reward_points integer NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  tier text NOT NULL DEFAULT 'Bronze',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, id)
);
CREATE INDEX IF NOT EXISTS customers_shop_name_idx ON customers(shop_id, full_name);
CREATE INDEX IF NOT EXISTS customers_shop_phone_idx ON customers(shop_id, phone);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id uuid,
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'Cash',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing','delivered','awaiting','completed','on way','pending','cancelled','refunded')),
  sale_date timestamptz NOT NULL DEFAULT now(),
  points_earned integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  card_last4 char(4),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (shop_id, customer_id) REFERENCES customers(shop_id, id) ON DELETE SET NULL,
  UNIQUE(shop_id, id)
);
CREATE INDEX IF NOT EXISTS sales_shop_date_idx ON sales(shop_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS sales_shop_customer_idx ON sales(shop_id, customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL,
  product_id uuid,
  variant_id uuid,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(12,2) NOT NULL CHECK (total_price >= 0),
  FOREIGN KEY (shop_id, sale_id) REFERENCES sales(shop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id, product_id) REFERENCES products(shop_id, id) ON DELETE SET NULL,
  FOREIGN KEY (shop_id, variant_id) REFERENCES product_variants(shop_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS sale_items_shop_sale_idx ON sale_items(shop_id, sale_id);

CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  order_id uuid,
  points_change integer NOT NULL,
  type text NOT NULL CHECK (type IN ('EARNED','REDEEMED','BONUS','ADJUSTMENT')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (shop_id, customer_id) REFERENCES customers(shop_id, id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id, order_id) REFERENCES sales(shop_id, id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS point_transactions_shop_customer_idx ON point_transactions(shop_id, customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
