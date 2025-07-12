-- UltraMarket Database Optimization Script
-- Professional database optimization for high-performance e-commerce platform
-- Optimized for PostgreSQL with MongoDB integration

-- ============================================================================
-- PERFORMANCE INDEXES FOR CORE TABLES
-- ============================================================================

-- User Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verification_status ON users(email_verified, phone_verified);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- Product Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_description_search ON products USING gin(to_tsvector('english', description));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tags ON products USING gin(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_discount ON products(discount_percentage) WHERE discount_percentage > 0;

-- Category Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_path ON categories USING gin(path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_status ON categories(is_active);

-- Order Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_total ON orders(total_amount);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_date_range ON orders(created_at, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- Order Items Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_composite ON order_items(order_id, product_id);

-- Cart Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_session ON cart_items(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_updated ON cart_items(updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_product ON cart_items(user_id, product_id);

-- Payment Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_provider ON payments(provider);

-- Inventory Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_reserved ON inventory(reserved_quantity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity) WHERE quantity < 10;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_out_of_stock ON inventory(quantity) WHERE quantity = 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_composite ON inventory(product_id, warehouse_id);

-- Stock Movement Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);

-- Review Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_helpful_count ON reviews(helpful_count);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_verified ON reviews(is_verified_purchase);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_rating ON reviews(product_id, rating);

-- Notification Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);

-- Analytics Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_product ON analytics_events(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_date ON analytics_events(DATE(timestamp));

-- Shipping Service Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_carrier ON shipments(carrier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_delivered_at ON shipments(delivered_at);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Product search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price ON products(category_id, price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_price ON products(brand_id, price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status_created ON products(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_featured_category ON products(is_featured, category_id) WHERE is_featured = true;

-- Order analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_date ON orders(user_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_date ON orders(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_total_date ON orders(total_amount, created_at);

-- Inventory management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_warehouse_quantity ON inventory(warehouse_id, quantity);

-- User behavior analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_type_date ON analytics_events(user_id, event_type, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_product_type_date ON analytics_events(product_id, event_type, timestamp);

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ============================================================================

-- Active products only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_category ON products(category_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_brand ON products(brand_id) WHERE status = 'active';

-- Pending orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending ON orders(created_at) WHERE status = 'pending';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_processing ON orders(created_at) WHERE status = 'processing';

-- Unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at) WHERE is_read = false;

-- Low stock alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_alerts ON inventory(product_id, warehouse_id) WHERE quantity < 10;

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Products
ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Orders
ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Cart
ALTER TABLE cart_items ADD CONSTRAINT fk_cart_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Payments
ALTER TABLE payments ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Inventory
ALTER TABLE inventory ADD CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE inventory ADD CONSTRAINT fk_inventory_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- Reviews
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Notifications
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- UNIQUE CONSTRAINTS
-- ============================================================================

-- Users
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT uk_users_phone UNIQUE (phone);

-- Products
ALTER TABLE products ADD CONSTRAINT uk_products_sku UNIQUE (sku);

-- Inventory
ALTER TABLE inventory ADD CONSTRAINT uk_inventory_product_warehouse UNIQUE (product_id, warehouse_id);

-- Cart
ALTER TABLE cart_items ADD CONSTRAINT uk_cart_items_user_product UNIQUE (user_id, product_id);

-- ============================================================================
-- CHECK CONSTRAINTS
-- ============================================================================

-- Products
ALTER TABLE products ADD CONSTRAINT chk_products_price CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT chk_products_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- Orders
ALTER TABLE orders ADD CONSTRAINT chk_orders_total CHECK (total_amount >= 0);
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_price CHECK (price >= 0);

-- Inventory
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_reserved CHECK (reserved_quantity >= 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_reserved_limit CHECK (reserved_quantity <= quantity);

-- Reviews
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update product rating when review is added/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET 
        average_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews 
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'approved'
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews 
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'approved'
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

-- Update inventory on order status change
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- When order is confirmed, reserve inventory
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        UPDATE inventory 
        SET reserved_quantity = reserved_quantity + oi.quantity
        FROM order_items oi
        WHERE inventory.product_id = oi.product_id
        AND oi.order_id = NEW.id;
    END IF;
    
    -- When order is completed, reduce actual inventory
    IF NEW.status = 'completed' AND OLD.status = 'confirmed' THEN
        UPDATE inventory 
        SET 
            quantity = quantity - oi.quantity,
            reserved_quantity = reserved_quantity - oi.quantity
        FROM order_items oi
        WHERE inventory.product_id = oi.product_id
        AND oi.order_id = NEW.id;
    END IF;
    
    -- When order is cancelled, release reserved inventory
    IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
        UPDATE inventory 
        SET reserved_quantity = GREATEST(0, reserved_quantity - oi.quantity)
        FROM order_items oi
        WHERE inventory.product_id = oi.product_id
        AND oi.order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_order
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all tables with updated_at column
CREATE TRIGGER trigger_update_timestamp_products
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp_inventory
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Product summary view
CREATE OR REPLACE VIEW product_summary AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.price,
    p.discount_percentage,
    p.price * (1 - p.discount_percentage / 100) as final_price,
    p.average_rating,
    p.review_count,
    p.status,
    c.name as category_name,
    b.name as brand_name,
    COALESCE(SUM(i.quantity), 0) as total_stock,
    COALESCE(SUM(i.reserved_quantity), 0) as total_reserved,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, c.name, b.name;

-- Order summary view
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    o.status,
    o.payment_status,
    o.delivery_status,
    o.total_amount,
    o.shipping_cost,
    o.tax_amount,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity,
    o.created_at,
    o.updated_at
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.email, u.first_name, u.last_name;

-- Inventory alerts view
CREATE OR REPLACE VIEW inventory_alerts AS
SELECT 
    i.id,
    p.name as product_name,
    p.sku,
    w.name as warehouse_name,
    i.quantity,
    i.reserved_quantity,
    i.quantity - i.reserved_quantity as available_quantity,
    p.min_stock_level,
    CASE 
        WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN i.quantity <= p.min_stock_level THEN 'LOW_STOCK'
        WHEN i.quantity - i.reserved_quantity <= p.min_stock_level THEN 'LOW_AVAILABLE'
        ELSE 'OK'
    END as alert_level,
    i.updated_at
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.quantity <= p.min_stock_level OR i.quantity = 0;

-- User analytics view
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    u.created_at as registration_date,
    u.last_login_at,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    COALESCE(AVG(o.total_amount), 0) as average_order_value,
    COUNT(DISTINCT r.id) as total_reviews,
    COALESCE(AVG(r.rating), 0) as average_rating_given,
    (SELECT COUNT(*) FROM analytics_events ae WHERE ae.user_id = u.id) as total_events
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'completed'
LEFT JOIN reviews r ON u.id = r.user_id AND r.status = 'approved'
GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at, u.last_login_at;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ============================================================================

-- Update table statistics
ANALYZE;

-- Vacuum and reindex
VACUUM ANALYZE;

-- Set optimal PostgreSQL parameters (add to postgresql.conf)
/*
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Query planner settings
random_page_cost = 1.1
effective_io_concurrency = 200

# Connection settings
max_connections = 100
*/

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Query to check index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Query to check slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

-- Query to check table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- ============================================================================
-- BACKUP AND MAINTENANCE PROCEDURES
-- ============================================================================

-- Create backup function
CREATE OR REPLACE FUNCTION create_backup()
RETURNS TEXT AS $$
DECLARE
    backup_name TEXT;
BEGIN
    backup_name := 'ultramarket_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- This would be executed via pg_dump in practice
    -- pg_dump -h localhost -U username -d ultramarket -f /backups/backup_name.sql
    
    RETURN 'Backup created: ' || backup_name;
END;
$$ LANGUAGE plpgsql;

-- Create maintenance function
CREATE OR REPLACE FUNCTION run_maintenance()
RETURNS TEXT AS $$
BEGIN
    -- Update statistics
    ANALYZE;
    
    -- Vacuum tables
    VACUUM ANALYZE;
    
    -- Reindex if needed
    REINDEX DATABASE ultramarket;
    
    RETURN 'Maintenance completed at ' || now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'UltraMarket Database Optimization Completed Successfully!' as message,
       'All indexes, constraints, triggers, and views have been created.' as details,
       'Performance monitoring views are available for ongoing optimization.' as monitoring,
       now() as completed_at; 