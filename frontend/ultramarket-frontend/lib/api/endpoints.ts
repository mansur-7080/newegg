/**
 * 🚀 UltraMarket API Endpoints Configuration
 * =========================================
 * Comprehensive API endpoints for all microservices
 * Production-ready configuration with proper typing
 */

// Base URLs from environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const STORE_SERVICE = process.env.NEXT_PUBLIC_STORE_SERVICE_URL || 'http://localhost:3030';
const ANALYTICS_SERVICE = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3020';
const USER_SERVICE = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3003';
const ORDER_SERVICE = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

// 🔐 Authentication Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: `${API_BASE}/auth/login`,
  REGISTER: `${API_BASE}/auth/register`,
  LOGOUT: `${API_BASE}/auth/logout`,
  REFRESH: `${API_BASE}/auth/refresh`,
  PROFILE: `${API_BASE}/auth/profile`,
  CHANGE_PASSWORD: `${API_BASE}/auth/password`,
  FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
  VERIFY_EMAIL: `${API_BASE}/auth/verify-email`,
  RESEND_VERIFICATION: `${API_BASE}/auth/resend-verification`,
  CHECK_EMAIL: `${API_BASE}/auth/check-email`,
  CHECK_PHONE: `${API_BASE}/auth/check-phone`,
  SOCIAL_LOGIN: `${API_BASE}/auth/social`,
  OAUTH_CALLBACK: `${API_BASE}/auth/oauth/callback`,
} as const;

// 🏪 Store Service Endpoints (Professional E-commerce)
export const STORE_ENDPOINTS = {
  // Store Management
  STORES: `${STORE_SERVICE}/stores`,
  STORE_BY_ID: (id: string) => `${STORE_SERVICE}/stores/${id}`,
  STORE_ANALYTICS: (id: string) => `${STORE_SERVICE}/stores/${id}/analytics`,
  STORE_PRODUCTS: (id: string) => `${STORE_SERVICE}/stores/${id}/products`,
  STORE_ORDERS: (id: string) => `${STORE_SERVICE}/stores/${id}/orders`,
  STORE_REVIEWS: (id: string) => `${STORE_SERVICE}/stores/${id}/reviews`,
  STORE_SETTINGS: (id: string) => `${STORE_SERVICE}/stores/${id}/settings`,
  
  // Categories
  CATEGORIES: `${STORE_SERVICE}/categories`,
  CATEGORY_BY_ID: (id: string) => `${STORE_SERVICE}/categories/${id}`,
  CATEGORY_PRODUCTS: (id: string) => `${STORE_SERVICE}/categories/${id}/products`,
  CATEGORY_TREE: `${STORE_SERVICE}/categories/tree`,
  
  // Brands
  BRANDS: `${STORE_SERVICE}/brands`,
  BRAND_BY_ID: (id: string) => `${STORE_SERVICE}/brands/${id}`,
  BRAND_PRODUCTS: (id: string) => `${STORE_SERVICE}/brands/${id}/products`,
  
  // Products
  PRODUCTS: `${STORE_SERVICE}/products`,
  PRODUCT_BY_ID: (id: string) => `${STORE_SERVICE}/products/${id}`,
  PRODUCT_VARIANTS: (id: string) => `${STORE_SERVICE}/products/${id}/variants`,
  PRODUCT_REVIEWS: (id: string) => `${STORE_SERVICE}/products/${id}/reviews`,
  PRODUCT_IMAGES: (id: string) => `${STORE_SERVICE}/products/${id}/images`,
  PRODUCT_SEARCH: `${STORE_SERVICE}/products/search`,
  PRODUCT_SUGGESTIONS: `${STORE_SERVICE}/products/suggestions`,
  FEATURED_PRODUCTS: `${STORE_SERVICE}/products/featured`,
  TRENDING_PRODUCTS: `${STORE_SERVICE}/products/trending`,
  RECOMMENDED_PRODUCTS: (userId: string) => `${STORE_SERVICE}/products/recommended/${userId}`,
  
  // Upload
  UPLOAD_IMAGE: `${STORE_SERVICE}/upload/image`,
  UPLOAD_MULTIPLE: `${STORE_SERVICE}/upload/multiple`,
  
  // Health Check
  HEALTH: `${STORE_SERVICE}/health`,
} as const;

// 📊 Analytics Service Endpoints (Enterprise Analytics)
export const ANALYTICS_ENDPOINTS = {
  // Dashboard Analytics
  DASHBOARD: `${ANALYTICS_SERVICE}/analytics/dashboard`,
  DASHBOARD_OVERVIEW: `${ANALYTICS_SERVICE}/analytics/dashboard/overview`,
  DASHBOARD_METRICS: `${ANALYTICS_SERVICE}/analytics/dashboard/metrics`,
  
  // Sales Analytics
  SALES: `${ANALYTICS_SERVICE}/analytics/sales`,
  SALES_OVERVIEW: `${ANALYTICS_SERVICE}/analytics/sales/overview`,
  SALES_TRENDS: `${ANALYTICS_SERVICE}/analytics/sales/trends`,
  SALES_BY_CATEGORY: `${ANALYTICS_SERVICE}/analytics/sales/categories`,
  SALES_BY_STORE: `${ANALYTICS_SERVICE}/analytics/sales/stores`,
  SALES_BY_REGION: `${ANALYTICS_SERVICE}/analytics/sales/regions`,
  SALES_FORECAST: `${ANALYTICS_SERVICE}/analytics/sales/forecast`,
  
  // Product Analytics
  PRODUCTS: `${ANALYTICS_SERVICE}/analytics/products`,
  PRODUCT_PERFORMANCE: `${ANALYTICS_SERVICE}/analytics/products/performance`,
  PRODUCT_TRENDS: `${ANALYTICS_SERVICE}/analytics/products/trends`,
  INVENTORY_ANALYTICS: `${ANALYTICS_SERVICE}/analytics/products/inventory`,
  
  // Customer Analytics
  CUSTOMERS: `${ANALYTICS_SERVICE}/analytics/customers`,
  CUSTOMER_SEGMENTS: `${ANALYTICS_SERVICE}/analytics/customers/segments`,
  CUSTOMER_LIFETIME_VALUE: `${ANALYTICS_SERVICE}/analytics/customers/ltv`,
  CUSTOMER_BEHAVIOR: `${ANALYTICS_SERVICE}/analytics/customers/behavior`,
  CUSTOMER_RETENTION: `${ANALYTICS_SERVICE}/analytics/customers/retention`,
  
  // Performance Analytics
  PERFORMANCE: `${ANALYTICS_SERVICE}/analytics/performance`,
  SYSTEM_METRICS: `${ANALYTICS_SERVICE}/analytics/performance/system`,
  API_METRICS: `${ANALYTICS_SERVICE}/analytics/performance/api`,
  
  // Data Export
  EXPORT: `${ANALYTICS_SERVICE}/analytics/export`,
  EXPORT_SALES: `${ANALYTICS_SERVICE}/analytics/export/sales`,
  EXPORT_PRODUCTS: `${ANALYTICS_SERVICE}/analytics/export/products`,
  EXPORT_CUSTOMERS: `${ANALYTICS_SERVICE}/analytics/export/customers`,
  
  // Real-time Analytics
  REALTIME: `${ANALYTICS_SERVICE}/analytics/realtime`,
  REALTIME_VISITORS: `${ANALYTICS_SERVICE}/analytics/realtime/visitors`,
  REALTIME_ORDERS: `${ANALYTICS_SERVICE}/analytics/realtime/orders`,
  
  // Health Check
  HEALTH: `${ANALYTICS_SERVICE}/health`,
} as const;

// 👥 User Service Endpoints
export const USER_ENDPOINTS = {
  // User Management
  USERS: `${USER_SERVICE}/users`,
  USER_BY_ID: (id: string) => `${USER_SERVICE}/users/${id}`,
  USER_PROFILE: `${USER_SERVICE}/users/profile`,
  USER_PREFERENCES: `${USER_SERVICE}/users/preferences`,
  USER_ADDRESSES: `${USER_SERVICE}/users/addresses`,
  USER_PAYMENT_METHODS: `${USER_SERVICE}/users/payment-methods`,
  
  // Customer Management
  CUSTOMERS: `${USER_SERVICE}/customers`,
  CUSTOMER_BY_ID: (id: string) => `${USER_SERVICE}/customers/${id}`,
  CUSTOMER_ORDERS: (id: string) => `${USER_SERVICE}/customers/${id}/orders`,
  CUSTOMER_REVIEWS: (id: string) => `${USER_SERVICE}/customers/${id}/reviews`,
  
  // Vendor Management
  VENDORS: `${USER_SERVICE}/vendors`,
  VENDOR_BY_ID: (id: string) => `${USER_SERVICE}/vendors/${id}`,
  VENDOR_STORES: (id: string) => `${USER_SERVICE}/vendors/${id}/stores`,
  VENDOR_ANALYTICS: (id: string) => `${USER_SERVICE}/vendors/${id}/analytics`,
  
  // Admin Management
  ADMINS: `${USER_SERVICE}/admins`,
  ADMIN_BY_ID: (id: string) => `${USER_SERVICE}/admins/${id}`,
  ADMIN_PERMISSIONS: (id: string) => `${USER_SERVICE}/admins/${id}/permissions`,
  
  // Health Check
  HEALTH: `${USER_SERVICE}/health`,
} as const;

// 🛒 Order Service Endpoints
export const ORDER_ENDPOINTS = {
  // Order Management
  ORDERS: `${ORDER_SERVICE}/orders`,
  ORDER_BY_ID: (id: string) => `${ORDER_SERVICE}/orders/${id}`,
  ORDER_STATUS: (id: string) => `${ORDER_SERVICE}/orders/${id}/status`,
  ORDER_TRACKING: (id: string) => `${ORDER_SERVICE}/orders/${id}/tracking`,
  ORDER_CANCEL: (id: string) => `${ORDER_SERVICE}/orders/${id}/cancel`,
  ORDER_RETURN: (id: string) => `${ORDER_SERVICE}/orders/${id}/return`,
  ORDER_REFUND: (id: string) => `${ORDER_SERVICE}/orders/${id}/refund`,
  
  // Cart Management
  CART: `${ORDER_SERVICE}/cart`,
  CART_ADD: `${ORDER_SERVICE}/cart/add`,
  CART_UPDATE: `${ORDER_SERVICE}/cart/update`,
  CART_REMOVE: (itemId: string) => `${ORDER_SERVICE}/cart/remove/${itemId}`,
  CART_CLEAR: `${ORDER_SERVICE}/cart/clear`,
  CART_SYNC: `${ORDER_SERVICE}/cart/sync`,
  
  // Checkout
  CHECKOUT: `${ORDER_SERVICE}/checkout`,
  CHECKOUT_VALIDATE: `${ORDER_SERVICE}/checkout/validate`,
  CHECKOUT_PAYMENT: `${ORDER_SERVICE}/checkout/payment`,
  CHECKOUT_CONFIRM: `${ORDER_SERVICE}/checkout/confirm`,
  
  // Wishlist
  WISHLIST: `${ORDER_SERVICE}/wishlist`,
  WISHLIST_ADD: `${ORDER_SERVICE}/wishlist/add`,
  WISHLIST_REMOVE: (itemId: string) => `${ORDER_SERVICE}/wishlist/remove/${itemId}`,
  
  // Reviews
  REVIEWS: `${ORDER_SERVICE}/reviews`,
  REVIEW_BY_ID: (id: string) => `${ORDER_SERVICE}/reviews/${id}`,
  PRODUCT_REVIEWS: (productId: string) => `${ORDER_SERVICE}/reviews/product/${productId}`,
  STORE_REVIEWS: (storeId: string) => `${ORDER_SERVICE}/reviews/store/${storeId}`,
  
  // Health Check
  HEALTH: `${ORDER_SERVICE}/health`,
} as const;

// 🔔 Notification Service Endpoints
export const NOTIFICATION_ENDPOINTS = {
  // Notifications
  NOTIFICATIONS: `${NOTIFICATION_SERVICE}/notifications`,
  NOTIFICATION_BY_ID: (id: string) => `${NOTIFICATION_SERVICE}/notifications/${id}`,
  MARK_READ: (id: string) => `${NOTIFICATION_SERVICE}/notifications/${id}/read`,
  MARK_ALL_READ: `${NOTIFICATION_SERVICE}/notifications/read-all`,
  NOTIFICATION_SETTINGS: `${NOTIFICATION_SERVICE}/notifications/settings`,
  
  // Email Notifications
  EMAIL: `${NOTIFICATION_SERVICE}/email`,
  EMAIL_SEND: `${NOTIFICATION_SERVICE}/email/send`,
  EMAIL_VERIFY: `${NOTIFICATION_SERVICE}/email/verify`,
  EMAIL_TEMPLATES: `${NOTIFICATION_SERVICE}/email/templates`,
  
  // SMS Notifications
  SMS: `${NOTIFICATION_SERVICE}/sms`,
  SMS_SEND: `${NOTIFICATION_SERVICE}/sms/send`,
  SMS_VERIFY: `${NOTIFICATION_SERVICE}/sms/verify`,
  
  // Push Notifications
  PUSH: `${NOTIFICATION_SERVICE}/push`,
  PUSH_SEND: `${NOTIFICATION_SERVICE}/push/send`,
  PUSH_SUBSCRIBE: `${NOTIFICATION_SERVICE}/push/subscribe`,
  PUSH_UNSUBSCRIBE: `${NOTIFICATION_SERVICE}/push/unsubscribe`,
  
  // Health Check
  HEALTH: `${NOTIFICATION_SERVICE}/health`,
} as const;

// 💳 Payment Endpoints (Uzbekistan Payment Providers)
export const PAYMENT_ENDPOINTS = {
  // Click Payment
  CLICK_PREPARE: `${API_BASE}/payments/click/prepare`,
  CLICK_COMPLETE: `${API_BASE}/payments/click/complete`,
  CLICK_STATUS: (transactionId: string) => `${API_BASE}/payments/click/status/${transactionId}`,
  
  // Payme Payment
  PAYME_PREPARE: `${API_BASE}/payments/payme/prepare`,
  PAYME_COMPLETE: `${API_BASE}/payments/payme/complete`,
  PAYME_STATUS: (transactionId: string) => `${API_BASE}/payments/payme/status/${transactionId}`,
  
  // Apelsin Payment
  APELSIN_PREPARE: `${API_BASE}/payments/apelsin/prepare`,
  APELSIN_COMPLETE: `${API_BASE}/payments/apelsin/complete`,
  APELSIN_STATUS: (transactionId: string) => `${API_BASE}/payments/apelsin/status/${transactionId}`,
  
  // Generic Payment
  PAYMENTS: `${API_BASE}/payments`,
  PAYMENT_BY_ID: (id: string) => `${API_BASE}/payments/${id}`,
  PAYMENT_HISTORY: `${API_BASE}/payments/history`,
  PAYMENT_METHODS: `${API_BASE}/payments/methods`,
} as const;

// 🏪 Admin Endpoints
export const ADMIN_ENDPOINTS = {
  // Dashboard
  DASHBOARD: `${API_BASE}/admin/dashboard`,
  STATS: `${API_BASE}/admin/stats`,
  
  // Store Management
  STORES: `${API_BASE}/admin/stores`,
  STORE_APPROVE: (id: string) => `${API_BASE}/admin/stores/${id}/approve`,
  STORE_REJECT: (id: string) => `${API_BASE}/admin/stores/${id}/reject`,
  STORE_SUSPEND: (id: string) => `${API_BASE}/admin/stores/${id}/suspend`,
  
  // User Management
  USERS: `${API_BASE}/admin/users`,
  USER_BAN: (id: string) => `${API_BASE}/admin/users/${id}/ban`,
  USER_UNBAN: (id: string) => `${API_BASE}/admin/users/${id}/unban`,
  
  // System Management
  SYSTEM_SETTINGS: `${API_BASE}/admin/system/settings`,
  SYSTEM_LOGS: `${API_BASE}/admin/system/logs`,
  SYSTEM_CACHE: `${API_BASE}/admin/system/cache`,
  SYSTEM_BACKUP: `${API_BASE}/admin/system/backup`,
  
  // Reports
  REPORTS: `${API_BASE}/admin/reports`,
  REPORTS_SALES: `${API_BASE}/admin/reports/sales`,
  REPORTS_USERS: `${API_BASE}/admin/reports/users`,
  REPORTS_STORES: `${API_BASE}/admin/reports/stores`,
} as const;

// 🌐 Public Endpoints (No Authentication Required)
export const PUBLIC_ENDPOINTS = {
  // General
  HEALTH: `${API_BASE}/health`,
  STATUS: `${API_BASE}/status`,
  CONFIG: `${API_BASE}/config`,
  
  // Content
  PAGES: `${API_BASE}/pages`,
  PAGE_BY_SLUG: (slug: string) => `${API_BASE}/pages/${slug}`,
  NEWS: `${API_BASE}/news`,
  BLOG: `${API_BASE}/blog`,
  
  // Location
  COUNTRIES: `${API_BASE}/countries`,
  REGIONS: `${API_BASE}/regions`,
  CITIES: `${API_BASE}/cities`,
  
  // Support
  CONTACT: `${API_BASE}/contact`,
  FAQ: `${API_BASE}/faq`,
  SUPPORT_TICKET: `${API_BASE}/support/ticket`,
} as const;

// 🔧 Utility Functions
export const API_UTILS = {
  buildQuery: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  },
  
  buildUrl: (endpoint: string, params?: Record<string, any>): string => {
    if (!params) return endpoint;
    const query = API_UTILS.buildQuery(params);
    return query ? `${endpoint}?${query}` : endpoint;
  },
  
  isProduction: (): boolean => {
    return process.env.NODE_ENV === 'production';
  },
  
  getBaseUrl: (service?: 'store' | 'analytics' | 'user' | 'order' | 'notification'): string => {
    switch (service) {
      case 'store': return STORE_SERVICE;
      case 'analytics': return ANALYTICS_SERVICE;
      case 'user': return USER_SERVICE;
      case 'order': return ORDER_SERVICE;
      case 'notification': return NOTIFICATION_SERVICE;
      default: return API_BASE;
    }
  },
} as const;

// 📱 WebSocket Endpoints
export const WEBSOCKET_ENDPOINTS = {
  NOTIFICATIONS: `ws://localhost:3001/ws/notifications`,
  CHAT: `ws://localhost:3001/ws/chat`,
  ANALYTICS: `ws://localhost:3020/ws/analytics`,
  ORDER_TRACKING: `ws://localhost:3004/ws/tracking`,
} as const;

// Export all endpoints
export const ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  STORE: STORE_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  USER: USER_ENDPOINTS,
  ORDER: ORDER_ENDPOINTS,
  NOTIFICATION: NOTIFICATION_ENDPOINTS,
  PAYMENT: PAYMENT_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
  PUBLIC: PUBLIC_ENDPOINTS,
  WEBSOCKET: WEBSOCKET_ENDPOINTS,
  UTILS: API_UTILS,
} as const;

export default ENDPOINTS;