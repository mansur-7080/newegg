/**
 * Type Definitions for Product Service
 * Professional TypeScript interfaces and types
 */

import { Request } from 'express';
import { Document, Types } from 'mongoose';

// =====================================
// User Authentication Types
// =====================================

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  vendorId?: string;
  isActive: boolean;
}

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// =====================================
// Product Types
// =====================================

export interface IProductVariant {
  id?: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  inventory: {
    quantity: number;
    tracked: boolean;
  };
  attributes: Record<string, string>;
  images?: IProductImage[];
  isDefault?: boolean;
}

export interface IProductImage {
  id?: string;
  url: string;
  alt?: string;
  isMain?: boolean;
  sortOrder?: number;
}

export interface IProductDimensions {
  weight?: number; // in grams
  length?: number; // in cm
  width?: number;  // in cm
  height?: number; // in cm
}

export interface IProductInventory {
  quantity: number;
  reserved: number;
  availableQuantity: number;
  tracked: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
}

export interface IProductRating {
  average: number;
  count: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface IProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
}

export interface IProductAnalytics {
  views: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  conversationRate: number;
}

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface IProduct extends Document {
  // Basic Information
  name: string;
  description: string;
  sku: string;
  slug: string;
  
  // Pricing
  price: number;
  comparePrice?: number;
  
  // Categorization
  category: Types.ObjectId;
  subcategory?: Types.ObjectId;
  brand?: string;
  tags: string[];
  
  // Status and Flags
  status: ProductStatus;
  isFeatured: boolean;
  isDigital: boolean;
  
  // Media
  images: IProductImage[];
  videos?: string[];
  
  // Variants
  hasVariants: boolean;
  variants: IProductVariant[];
  
  // Inventory
  inventory: IProductInventory;
  
  // Physical Properties
  dimensions?: IProductDimensions;
  
  // SEO
  seo: IProductSEO;
  
  // Analytics
  viewCount: number;
  salesCount: number;
  rating: IProductRating;
  analytics?: IProductAnalytics;
  
  // Relationships
  vendorId: Types.ObjectId;
  relatedProducts?: Types.ObjectId[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Methods
  updateInventory(quantity: number, operation?: 'add' | 'subtract' | 'set'): Promise<void>;
  reserveInventory(quantity: number): Promise<boolean>;
  releaseInventory(quantity: number): Promise<void>;
  getAvailableQuantity(): number;
  canBeDeleted(): Promise<boolean>;
  generateSlug(): void;
}

// =====================================
// Category Types
// =====================================

export interface ICategoryMetadata {
  icon?: string;
  color?: string;
  keywords?: string[];
  featured?: boolean;
}

export interface ICategoryImage {
  url: string;
  alt?: string;
}

export interface ICategory extends Document {
  // Basic Information
  name: string;
  description?: string;
  slug: string;
  
  // Hierarchy
  parentId?: Types.ObjectId;
  level: number;
  path: string;
  sortOrder: number;
  
  // Status
  isActive: boolean;
  
  // Media
  image?: ICategoryImage;
  
  // Metadata
  metadata: ICategoryMetadata;
  
  // SEO
  seo: IProductSEO;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual Fields
  children?: ICategory[];
  parent?: ICategory;
  
  // Methods
  getChildren(): Promise<ICategory[]>;
  getParents(): Promise<ICategory[]>;
  getFullPath(): Promise<ICategory[]>;
  canBeDeleted(): Promise<boolean>;
  generateSlug(): void;
}

// =====================================
// API Response Types
// =====================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
}

// =====================================
// Search and Filter Types
// =====================================

export interface ProductSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: ProductSortField;
  sortOrder?: SortOrder;
  status?: ProductStatus | ProductStatus[];
  featured?: boolean;
  tags?: string[];
}

export interface CategorySearchParams {
  page?: number;
  limit?: number;
  parent?: string | null;
  active?: boolean;
  level?: number;
  includeProducts?: boolean;
  includeChildren?: boolean;
}

export type ProductSortField = 
  | 'name' 
  | 'price' 
  | 'rating' 
  | 'sales' 
  | 'views'
  | 'createdAt' 
  | 'updatedAt' 
  | 'relevance';

export type SortOrder = 'asc' | 'desc';

// =====================================
// Business Logic Types
// =====================================

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
    data: any;
  }>;
}

export interface InventoryUpdateRequest {
  quantity?: number;
  tracked?: boolean;
  allowBackorder?: boolean;
  lowStockThreshold?: number;
}

export interface CategoryMoveRequest {
  newParentId?: string | null;
  position?: number;
}

export interface CategoryReorderRequest {
  categoryOrders: Array<{
    id: string;
    sortOrder: number;
  }>;
}

// =====================================
// Analytics Types
// =====================================

export interface ProductAnalyticsData {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  featuredProducts: number;
  topSellingProducts: IProduct[];
  topViewedProducts: IProduct[];
  categoryDistribution: Array<{
    category: ICategory;
    productCount: number;
    totalValue: number;
  }>;
  brandDistribution: Array<{
    brand: string;
    productCount: number;
    totalValue: number;
  }>;
  averagePrice: number;
  priceRanges: Array<{
    range: string;
    count: number;
  }>;
}

export interface CategoryAnalyticsData {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  rootCategories: number;
  maxDepth: number;
  averageProductsPerCategory: number;
  topCategories: Array<{
    category: ICategory;
    productCount: number;
    totalSales: number;
  }>;
  emptyCategories: ICategory[];
}

// =====================================
// Cache Types
// =====================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for selective invalidation
}

export interface CacheHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

// =====================================
// Database Types
// =====================================

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy' | 'connecting';
  latency?: number;
  error?: string;
  connections?: {
    current: number;
    available: number;
    maxPoolSize: number;
  };
}

// =====================================
// Service Health Types
// =====================================

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  database: DatabaseHealth;
  cache?: CacheHealth;
}

// =====================================
// File Upload Types
// =====================================

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  path?: string;
}

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

// =====================================
// Error Types
// =====================================

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  location?: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  errors?: ValidationErrorDetail[];
  stack?: string; // Only in development
}

// =====================================
// Configuration Types
// =====================================

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  corsOrigin: string[];
  maxRequestSize: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: {
    uri: string;
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    destination: string;
  };
}