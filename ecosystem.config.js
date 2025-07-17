module.exports = {
  apps: [
    // CORE SERVICES
    {
      name: 'auth-service',
      cwd: './microservices/core/auth-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_auth',
        JWT_SECRET: 'your_ultra_secure_jwt_secret_key_minimum_32_chars_long_for_production',
        JWT_REFRESH_SECRET: 'your_ultra_secure_jwt_refresh_secret_key_minimum_32_chars_long'
      }
    },
    {
      name: 'user-service',
      cwd: './microservices/core/user-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: 5432,
        POSTGRES_DB: 'ultramarket_users',
        POSTGRES_USER: 'ultramarket_user',
        POSTGRES_PASSWORD: 'secure_password'
      }
    },
    {
      name: 'api-gateway',
      cwd: './microservices/core/api-gateway/api-gateway',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      }
    },
    {
      name: 'config-service',
      cwd: './microservices/core/config-service/config-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      }
    },
    {
      name: 'store-service',
      cwd: './microservices/core/store-service/store-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_stores'
      }
    },

    // BUSINESS SERVICES
    {
      name: 'product-service',
      cwd: './microservices/business/product-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_products',
        ELASTICSEARCH_URL: 'http://localhost:9200'
      }
    },
    {
      name: 'cart-service',
      cwd: './microservices/business/cart-service/cart-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      }
    },
    {
      name: 'order-service',
      cwd: './microservices/business/order-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_orders'
      }
    },
    {
      name: 'payment-service',
      cwd: './microservices/business/payment-service/payment-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        POSTGRES_HOST: 'localhost',
        POSTGRES_DB: 'ultramarket_payments',
        CLICK_MERCHANT_ID: 'test_merchant',
        PAYME_MERCHANT_ID: 'test_merchant'
      }
    },
    {
      name: 'inventory-service',
      cwd: './microservices/business/inventory-service/inventory-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
        POSTGRES_HOST: 'localhost',
        POSTGRES_DB: 'ultramarket_inventory'
      }
    },
    {
      name: 'shipping-service',
      cwd: './microservices/business/shipping-service/shipping-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_shipping'
      }
    },
    {
      name: 'review-service',
      cwd: './microservices/business/review-service/review-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3009,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_reviews'
      }
    },

    // PLATFORM SERVICES
    {
      name: 'search-service',
      cwd: './microservices/platform/search-service/search-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
        ELASTICSEARCH_URL: 'http://localhost:9200'
      }
    },
    {
      name: 'notification-service',
      cwd: './microservices/platform/notification-service/notification-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3013,
        REDIS_HOST: 'localhost',
        SMS_PROVIDER: 'playmobile'
      }
    },
    {
      name: 'file-service',
      cwd: './microservices/platform/file-service/file-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3014,
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: 9000
      }
    },
    {
      name: 'analytics-service',
      cwd: './microservices/analytics/analytics-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3015,
        POSTGRES_HOST: 'localhost',
        POSTGRES_DB: 'ultramarket_analytics'
      }
    },
    {
      name: 'audit-service',
      cwd: './microservices/platform/audit-service/audit-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3016,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_audit'
      }
    },
    {
      name: 'content-service',
      cwd: './microservices/platform/content-service/content-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3017,
        MONGODB_URI: 'mongodb://localhost:27017/ultramarket_content'
      }
    },

    // ML/AI SERVICES
    {
      name: 'recommendation-service',
      cwd: './microservices/ml-ai/recommendation-service/recommendation-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3018,
        REDIS_HOST: 'localhost',
        TENSORFLOW_BACKEND: 'cpu'
      }
    },
    {
      name: 'fraud-detection-service',
      cwd: './microservices/ml-ai/fraud-detection-service/fraud-detection-service',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3019,
        REDIS_HOST: 'localhost'
      }
    },

    // FRONTEND APPLICATIONS
    {
      name: 'web-app',
      cwd: './frontend/web-app',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_API_URL: 'http://localhost:8000'
      }
    },
    {
      name: 'admin-panel',
      cwd: './frontend/admin-panel',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        VITE_API_URL: 'http://localhost:8000'
      }
    }
  ]
};