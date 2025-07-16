/**
 * Product Service Types
 * Professional TypeScript type definitions
 */

import { Request, Response } from 'express';

// Basic Types
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SUPER_ADMIN';

// Database Models
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency: string;
  status: ProductStatus;
  type: ProductType;
  isActive: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string;
  attributes?: string;
  specifications?: string;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  categoryId: string;
  vendorId?: string;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: Review[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  products?: Product[];
  parent?: Category;
  children?: Category[];
  productCount?: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  isMain: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  weight?: number;
  dimensions?: string;
  attributes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  isHelpful: number;
  isNotHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  brand?: string;
  sku: string;
  status?: ProductStatus;
  type?: ProductType;
  weight?: number;
  dimensions?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  warranty?: string;
  attributes?: string;
  specifications?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  image?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

// Query Parameters
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: ProductStatus;
  type?: ProductType;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
}

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'sortOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQueryParams {
  q: string;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  query?: Record<string, any>;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: Product[];
  count: number;
  message?: string;
}

export interface StatsResponse {
  success: boolean;
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

// Express Request/Response Types with TypeScript
export interface TypedRequest<T = any> extends Request {
  body: T;
  query: Record<string, any>;
  params: Record<string, string>;
}

export interface TypedResponse<T = any> extends Response {
  json(body: ApiResponse<T>): this;
}

// Error Types
export interface ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Service Configuration
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

// Prisma Extensions
export interface PrismaQueryOptions {
  page?: number;
  limit?: number;
  include?: Record<string, boolean | object>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export default {
  Product,
  Category,
  ProductImage,
  ProductVariant,
  Review,
  User,
  CreateProductRequest,
  UpdateProductRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ProductQueryParams,
  CategoryQueryParams,
  SearchQueryParams,
  ApiResponse,
  PaginatedResponse,
  SearchResponse,
  StatsResponse,
  HealthResponse,
  TypedRequest,
  TypedResponse,
  ServiceConfig
};
