import { Product, Category, Brand, Vendor, ProductImage, ProductVariant, ProductReview, ProductStatus, ProductVisibility } from '@prisma/client';

/**
 * Professional TypeScript Types for UltraMarket Product Service
 */

// Base Product with all relations
export type ProductWithRelations = Product & {
  category: Category;
  brand?: Brand | null;
  vendor: Vendor;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: ProductReview[];
};

// Product creation input
export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  categoryId: string;
  brandId?: string;
  vendorId: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  weight?: number;
  dimensions?: ProductDimensions;
  specifications?: Record<string, any>;
}

// Product update input
export interface UpdateProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  weight?: number;
  dimensions?: ProductDimensions;
  specifications?: Record<string, any>;
}

// Product filters for search and listing
export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  vendorId?: string;
  status?: ProductStatus;
  visibility?: ProductVisibility;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  search?: string;
}

// Pagination and search options
export interface ProductSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt' | 'stockQuantity';
  sortOrder?: 'asc' | 'desc';
  include?: {
    category?: boolean;
    brand?: boolean;
    vendor?: boolean;
    images?: boolean;
    variants?: boolean;
    reviews?: boolean;
  };
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  products?: T[]; // For backward compatibility
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Product list response
export type ProductListResponse = PaginatedResponse<ProductWithRelations>;

// Product dimensions
export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in' | 'm';
}

// Category with hierarchy
export type CategoryWithChildren = Category & {
  children: Category[];
  parent?: Category | null;
  productCount?: number;
};

// Brand with product count
export type BrandWithProductCount = Brand & {
  productCount: number;
};

// Vendor with statistics
export type VendorWithStats = Vendor & {
  productCount: number;
  averageRating?: number;
};

// Product statistics
export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalValue: number;
  averagePrice: number;
  topCategories: Array<{
    category: Category;
    productCount: number;
  }>;
  topBrands: Array<{
    brand: Brand;
    productCount: number;
  }>;
  recentProducts: ProductWithRelations[];
}

// Product image input
export interface CreateProductImageInput {
  url: string;
  altText?: string;
  sortOrder?: number;
  isMain?: boolean;
}

// Product variant input
export interface CreateProductVariantInput {
  name: string;
  sku: string;
  price?: number;
  stockQuantity?: number;
  attributes: Record<string, any>;
  isActive?: boolean;
}

// Bulk operations
export interface BulkUpdateProductsInput {
  productIds: string[];
  updates: Partial<UpdateProductInput>;
}

export interface BulkDeleteProductsInput {
  productIds: string[];
  force?: boolean; // Skip soft delete
}

// Product validation errors
export interface ProductValidationError {
  field: string;
  message: string;
  code: string;
}

// Inventory update
export interface InventoryUpdateInput {
  productId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
}

// Price history (for future implementation)
export interface PriceHistoryEntry {
  id: string;
  productId: string;
  price: number;
  previousPrice: number;
  changeType: 'increase' | 'decrease';
  changeReason?: string;
  createdAt: Date;
}

// Product export format
export interface ProductExportData {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  brandName?: string;
  vendorName: string;
  price: number;
  stockQuantity: number;
  status: string;
  createdAt: string;
}

// Advanced search criteria
export interface AdvancedProductSearch {
  query?: string;
  filters: ProductFilters;
  options: ProductSearchOptions;
  facets?: {
    categories?: boolean;
    brands?: boolean;
    priceRanges?: boolean;
    attributes?: boolean;
  };
}

// Search facet results
export interface SearchFacets {
  categories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  brands: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  priceRanges: Array<{
    min: number;
    max: number;
    count: number;
  }>;
  attributes: Record<string, Array<{
    value: any;
    count: number;
  }>>;
}

// Product search response with facets
export interface ProductSearchResponse extends ProductListResponse {
  facets?: SearchFacets;
  suggestions?: string[];
  searchTime: number;
}

// Error types
export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product with ID ${id} not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class InvalidSkuError extends Error {
  constructor(sku: string) {
    super(`Product with SKU ${sku} already exists`);
    this.name = 'InvalidSkuError';
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string, requested: number, available: number) {
    super(`Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`);
    this.name = 'InsufficientStockError';
  }
}

// Re-export Prisma types
export type {
  Product,
  Category,
  Brand,
  Vendor,
  ProductImage,
  ProductVariant,
  ProductReview,
  ProductStatus,
  ProductVisibility,
} from '@prisma/client';