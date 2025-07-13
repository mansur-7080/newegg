// Store related types
export interface IStore {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  isVerified: boolean;
  commission: number;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  businessLicense?: string;
  taxNumber?: string;
  ownerId: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  rating?: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreOwner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

export interface IStoreStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalReviews: number;
  averageRating: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  growthRate: number;
}

// Product related types
export interface IProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  salePrice?: number;
  sku: string;
  stock: number;
  images: string[];
  weight?: number;
  dimensions?: string;
  brand?: string;
  model?: string;
  isActive: boolean;
  isFeatured: boolean;
  storeId: string;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Order related types
export interface IOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  storeId: string;
  shippingAddress: string;
  deliveryDate?: Date;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  items: IOrderItem[];
}

export interface IOrderItem {
  id: string;
  quantity: number;
  price: number;
  total: number;
  orderId: string;
  productId: string;
  product?: IProduct;
}

// Category related types
export interface IStoreCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  storeId: string;
  parentId?: string;
  parent?: IStoreCategory;
  children?: IStoreCategory[];
  createdAt: Date;
  updatedAt: Date;
}

// Staff related types
export interface IStoreStaff {
  id: string;
  role: StaffRole;
  permissions: string[];
  isActive: boolean;
  storeId: string;
  userId: string;
  user?: IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
}

// Review related types
export interface IStoreReview {
  id: string;
  rating: number;
  comment?: string;
  isActive: boolean;
  storeId: string;
  userId: string;
  user?: IUser;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics related types
export interface IStoreAnalytics {
  id: string;
  date: Date;
  views: number;
  visitors: number;
  orders: number;
  revenue: number;
  productsSold: number;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsDashboard {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  orderGrowth: number;
  topProducts: ITopProduct[];
  recentOrders: IOrder[];
  salesChart: ISalesData[];
  trafficStats: ITrafficStats;
}

export interface ITopProduct {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
  image?: string;
}

export interface ISalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface ITrafficStats {
  totalViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  averageSessionDuration: number;
}

// Settings related types
export interface IStoreSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Filter types
export interface StoreFilters {
  isActive?: boolean;
  isVerified?: boolean;
  ownerId?: string;
  search?: string;
  category?: string;
  minRating?: number;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'createdAt' | 'totalOrders';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
  storeId: string;
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'createdAt' | 'stock';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderFilters {
  storeId: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Enums
export enum UserRole {
  USER = 'USER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum StaffRole {
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Permission types
export enum StorePermission {
  VIEW_DASHBOARD = 'view_dashboard',
  MANAGE_PRODUCTS = 'manage_products',
  MANAGE_ORDERS = 'manage_orders',
  MANAGE_CATEGORIES = 'manage_categories',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_STAFF = 'manage_staff',
  MANAGE_SETTINGS = 'manage_settings',
  MANAGE_REVIEWS = 'manage_reviews',
}

// Cache keys
export const CACHE_KEYS = {
  STORE: (id: string) => `store:${id}`,
  STORE_STATS: (id: string) => `store:stats:${id}`,
  STORE_PRODUCTS: (id: string, page: number) => `store:products:${id}:${page}`,
  STORE_ORDERS: (id: string, page: number) => `store:orders:${id}:${page}`,
  STORE_ANALYTICS: (id: string, date: string) => `store:analytics:${id}:${date}`,
  USER_STORES: (userId: string) => `user:stores:${userId}`,
} as const;

// Event types for analytics
export enum AnalyticsEvent {
  STORE_VIEW = 'store_view',
  PRODUCT_VIEW = 'product_view',
  ORDER_CREATED = 'order_created',
  ORDER_COMPLETED = 'order_completed',
  REVIEW_ADDED = 'review_added',
  PRODUCT_ADDED = 'product_added',
}

export interface IAnalyticsEvent {
  event: AnalyticsEvent;
  storeId: string;
  userId?: string;
  productId?: string;
  orderId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}