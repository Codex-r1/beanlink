
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM TYPES

CREATE TYPE user_role_enum AS ENUM ('farmer', 'buyer', 'supplier', 'admin');

CREATE TYPE listing_category_enum AS ENUM (
  'seed', 'fertilizer', 'soil_amendment', 'crop_protection',
  'equipment', 'other_input', 'produce'
);

CREATE TYPE listing_status_enum AS ENUM (
  'active', 'paused', 'sold', 'draft', 'unavailable'
);

CREATE TYPE order_status_enum AS ENUM (
  'pending', 'confirmed', 'processing', 'completed', 'cancelled'
);

-- USERS  (DR-07, FR-01–FR-03)

CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role_enum NOT NULL,
  phone_number  VARCHAR(20),
  county        VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LISTINGS  (FR-13, FR-14, FR-15)

CREATE TABLE listings (
  listing_id         BIGSERIAL PRIMARY KEY,
  seller_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  title              VARCHAR(150) NOT NULL,
  category           listing_category_enum NOT NULL,
  variety            VARCHAR(50),
  price_per_unit     DECIMAL(10,2) NOT NULL CHECK (price_per_unit >= 0),
  quantity_available DECIMAL(10,2) NOT NULL CHECK (quantity_available >= 0),
  location           VARCHAR(100),
  status             listing_status_enum NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_category_status ON listings(category, status);
CREATE INDEX idx_listings_seller ON listings(seller_id);

-- TRANSACTIONS  (FR-17, FR-18)

CREATE TABLE transactions (
  txn_id       BIGSERIAL PRIMARY KEY,
  buyer_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status       order_status_enum NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ORDER_ITEMS  (line items within a transaction — FR-16)

CREATE TABLE order_items (
  item_id    BIGSERIAL PRIMARY KEY,
  txn_id     BIGINT NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
  listing_id BIGINT NOT NULL REFERENCES listings(listing_id) ON DELETE RESTRICT,
  quantity   DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_order_items_txn ON order_items(txn_id);
CREATE INDEX idx_order_items_listing ON order_items(listing_id);

-- RECOMMENDATIONS  (FR-05–FR-07, DR-01–DR-03)

CREATE TABLE recommendations (
  rec_id                BIGSERIAL PRIMARY KEY,
  farmer_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  agro_zone             VARCHAR(50),
  soil_type             VARCHAR(50),
  rainfall_level        VARCHAR(50),
  recommended_seed      VARCHAR(100),
  recommended_fertilizer VARCHAR(100),
  shap_values           JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_farmer ON recommendations(farmer_id);


-- PRICE_RECORDS  (FR-08–FR-12, DR-04, DR-05)

CREATE TABLE price_records (
  price_id      BIGSERIAL PRIMARY KEY,
  market_name   VARCHAR(100) NOT NULL,
  county        VARCHAR(100),
  bean_variety  VARCHAR(50) NOT NULL,
  price_per_kg  DECIMAL(10,2) NOT NULL CHECK (price_per_kg >= 0),
  recorded_date DATE NOT NULL,
  source        VARCHAR(100) NOT NULL,  -- e.g. 'WFP', 'KNBS', 'manual entry'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_records_filter
  ON price_records(bean_variety, market_name, recorded_date);