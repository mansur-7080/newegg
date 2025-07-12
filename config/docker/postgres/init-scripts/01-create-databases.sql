-- UltraMarket Database Initialization Script
-- Creates separate databases for different services

-- Create databases
CREATE DATABASE auth_db OWNER ultramarket_user;
CREATE DATABASE user_db OWNER ultramarket_user;
CREATE DATABASE order_db OWNER ultramarket_user;
CREATE DATABASE payment_db OWNER ultramarket_user;
CREATE DATABASE analytics_db OWNER ultramarket_user;
CREATE DATABASE notification_db OWNER ultramarket_user;
CREATE DATABASE audit_db OWNER ultramarket_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE user_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE order_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO ultramarket_user;
GRANT ALL PRIVILEGES ON DATABASE audit_db TO ultramarket_user;

-- Create extensions in each database
\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

\c user_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "postgis";

\c order_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

\c payment_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

\c analytics_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

\c notification_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

\c audit_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create read-only user for analytics
CREATE USER analytics_reader WITH PASSWORD 'analytics_readonly_password';
GRANT CONNECT ON DATABASE analytics_db TO analytics_reader;
GRANT CONNECT ON DATABASE order_db TO analytics_reader;
GRANT CONNECT ON DATABASE payment_db TO analytics_reader;
GRANT CONNECT ON DATABASE user_db TO analytics_reader;

-- Grant read permissions to analytics user
\c analytics_db;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;

\c order_db;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;

\c payment_db;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader;

\c user_db;
GRANT USAGE ON SCHEMA public TO analytics_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_reader; 