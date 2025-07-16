/**
 * Product Models and Types - Prisma Based
 * Professional type definitions for product management
 */

import { Product, Category, ProductVariant, ProductImage, ProductReview, ProductStatus, ProductType } from '@prisma/client';

// Base Product type from Prisma
export type ProductModel = Product;

// Extended Product with relations
export type ProductWithRelations = Product & {
  category?: Category;
  variants?: ProductVariant[];
  images?: ProductImage[];
  reviews?: ProductReview[];
};

// Product creation input
export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: any;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  status?: ProductStatus;
  type?: ProductType;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string[];
  attributes?: any;
  specifications?: any;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  categoryId?: string;
  vendorId?: string;
}

// Product update input
export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  weight?: number;
  dimensions?: any;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  currency?: string;
  status?: ProductStatus;
  type?: ProductType;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  salePercentage?: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string[];
  attributes?: any;
  specifications?: any;
  warranty?: string;
  returnPolicy?: string;
  shippingInfo?: string;
  categoryId?: string;
  publishedAt?: Date;
}

// Product query filters
export interface ProductFilters {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  search?: string;
  tags?: string[];
  vendorId?: string;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Product query result
export interface ProductQueryResult {
  data: ProductWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Product statistics
export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  onSaleProducts: number;
  outOfStockProducts: number;
  averagePrice: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    productCount: number;
  }>;
  topBrands: Array<{
    brand: string;
    productCount: number;
  }>;
}

// Product variant types
export interface ProductVariantInput {
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  weight?: number;
  dimensions?: any;
  attributes?: any;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

// Product image types
export interface ProductImageInput {
  url: string;
  altText?: string;
  isMain?: boolean;
  sortOrder?: number;
}

// Product review types
export interface ProductReviewInput {
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified?: boolean;
}

// Inventory tracking
export interface InventoryUpdate {
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
  notes?: string;
}

// Product search result
export interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  images: string[];
  rating?: number;
  reviewCount?: number;
  brand?: string;
  category?: string;
  isOnSale: boolean;
  salePercentage?: number;
}

// Export enums from Prisma
export { ProductStatus, ProductType } from '@prisma/client';

// Validation schemas (to be used with Zod or similar)
export const PRODUCT_CONSTRAINTS = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 200,
  },
  DESCRIPTION: {
    MAX_LENGTH: 5000,
  },
  SHORT_DESCRIPTION: {
    MAX_LENGTH: 500,
  },
  SKU: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  PRICE: {
    MIN: 0.01,
    MAX: 999999.99,
  },
  WEIGHT: {
    MIN: 0,
    MAX: 999999.99,
  },
  SALE_PERCENTAGE: {
    MIN: 1,
    MAX: 99,
  },
  TAGS: {
    MAX_COUNT: 20,
    MAX_LENGTH_PER_TAG: 50,
  },
} as const;
