-- Performance Optimization Indexes
-- This migration adds critical indexes for better query performance

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(price) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id, is_active);

-- Inventory table indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available_quantity) WHERE available_quantity > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(product_id, available_quantity) WHERE available_quantity <= minimum_stock;

-- Cart table indexes
CREATE INDEX IF NOT EXISTS idx_cart_user_created ON cart(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cart_expires ON cart(expires_at) WHERE expires_at IS NOT NULL;

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating ON reviews(product_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Categories table indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_products_complex_search ON products(category_id, is_active, price, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_active_price ON products(price) WHERE is_active = true AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_inventory_available_warehouse ON inventory(warehouse_id, available_quantity) WHERE available_quantity > 0;

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_description_search ON products USING gin(to_tsvector('english', COALESCE(description, '')));

-- Performance monitoring
-- Add comments for future optimization
COMMENT ON INDEX idx_products_category_active IS 'Optimized for category filtering with active products';
COMMENT ON INDEX idx_products_search IS 'Full-text search optimization for product search';
COMMENT ON INDEX idx_inventory_product_warehouse IS 'Optimized for inventory lookups by product and warehouse';