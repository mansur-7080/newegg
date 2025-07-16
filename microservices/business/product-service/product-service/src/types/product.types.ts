/**
 * UltraMarket Product Service - TypeScript Type Definitions
 * Complete type safety for the product service
 */

import { Request, Response } from 'express';
import { Product as PrismaProduct, Category as PrismaCategory } from '@prisma/client';

// ================ BASIC TYPES ================

export interface Product extends PrismaProduct {}
export interface Category extends PrismaCategory {}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isMain: boolean;
  sortOrder: number;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  attributes: Record<string, any>;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  verified: boolean;
  helpful: number;
  productId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

// ================ REQUEST TYPES ================

export interface CreateProductRequest {
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId: string;
  brand?: string;
  sku: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
  weight?: number;
  dimensions?: Record<string, any>;
  metaTitle?: string;
  metaDescription?: string;
  warranty?: string;
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
  tags?: string[];
  images?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

// ================ QUERY PARAMS ================

export interface ProductQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  status?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string;
}

export interface CategoryQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  isActive?: string;
  parentId?: string;
}

export interface SearchQueryParams {
  q: string;
  limit?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
}

// ================ RESPONSE TYPES ================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta;
  query?: Record<string, any>;
  total?: number;
}

export interface SearchResponse extends ApiResponse {
  query: string;
  results: Product[];
  count: number;
}

export interface StatsResponse extends ApiResponse {
  data: {
    products: {
      total: number;
      active: number;
      recent: number;
    };
    categories: number;
    lastUpdated: string;
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
  uptime?: number;
  memory?: NodeJS.MemoryUsage;
  stats?: {
    products: number;
    categories: number;
  };
}

// ================ EXPRESS TYPES ================

export interface TypedRequest<T = any> extends Omit<Request, 'body' | 'query'> {
  body: T;
  query: T;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: ApiResponse<T>) => this;
}

// ================ SERVICE CONFIG ================

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigin: string;
  logLevel: string;
  redisUrl?: string;
  apiVersion: string;
}

// ================ ERROR TYPES ================

export class ValidationError extends Error {
  public code: string;
  public statusCode: number;
  
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  public code: string;
  public statusCode: number;
  
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = 404;
  }
}

export class DatabaseError extends Error {
  public code: string;
  public statusCode: number;
  
  constructor(message: string, code: string = 'DATABASE_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = 500;
  }
}

// ================ UTILITY TYPES ================

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
export type SortOrder = 'asc' | 'desc';

export interface ProductFilters {
  category?: string;
  brand?: string;
  status?: ProductStatus;
  type?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
}

export interface ProductSort {
  field: string;
  order: SortOrder;
}

// ================ EXTENDED PRODUCT WITH RELATIONS ================

export interface ProductWithRelations extends Product {
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: Review[];
}

export interface CategoryWithRelations extends Category {
  products?: Product[];
  parent?: Category;
  children?: Category[];
}

// ================ BULK OPERATIONS ================

export interface BulkProductUpdate {
  id: string;
  updates: Partial<Product>;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ================ ADVANCED SEARCH ================

export interface SearchFilters extends ProductFilters {
  query?: string;
  fuzzy?: boolean;
  exact?: boolean;
}

export interface SearchOptions {
  filters: SearchFilters;
  sort: ProductSort;
  pagination: {
    page: number;
    limit: number;
  };
  include?: string[];
}

// ================ ANALYTICS TYPES ================

export interface ProductAnalytics {
  views: number;
  sales: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  conversionRate: number;
}

export interface CategoryAnalytics {
  productCount: number;
  totalRevenue: number;
  averagePrice: number;
  topProducts: Product[];
}

// ================ CACHE TYPES ================

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  version?: string;
}

export interface CacheResult<T> {
  data: T;
  cached: boolean;
  timestamp: Date;
}

// ================ EXPORT ALL TYPES ================

// All types are already exported above via individual export declarations

// Default export for convenience
export default {
  ValidationError,
  NotFoundError,
  DatabaseError
};