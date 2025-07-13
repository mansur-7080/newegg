import { apiService, ApiResponse } from './api';

// Product Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  sku: string;
  category: Category;
  brand: Brand;
  images: string[];
  specifications: ProductSpecification[];
  inventory: ProductInventory;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  image?: string;
  level: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  isActive: boolean;
}

export interface ProductSpecification {
  id: string;
  name: string;
  value: string;
  unit?: string;
  group: string;
}

export interface ProductInventory {
  id: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  trackQuantity: boolean;
  allowBackorder: boolean;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  featured?: boolean;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  sku: string;
  categoryId: string;
  brandId: string;
  specifications: Omit<ProductSpecification, 'id'>[];
  inventory: Omit<ProductInventory, 'id'>;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  draftProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  featuredProducts: number;
  totalValue: number;
}

// Product Service Class
export class ProductService {
  private static instance: ProductService;

  private constructor() {}

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  // Get all products with filters
  async getProducts(filters: ProductFilters = {}): Promise<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiService.get<{
      products: Product[];
      pagination: any;
    }>(`/api/v1/products?${params.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch products');
  }

  // Get product by ID
  async getProduct(id: string): Promise<Product> {
    const response = await apiService.get<Product>(`/api/v1/products/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch product');
  }

  // Create new product
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await apiService.post<Product>('/api/v1/products', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create product');
  }

  // Update product
  async updateProduct(data: UpdateProductRequest): Promise<Product> {
    const { id, ...updateData } = data;
    const response = await apiService.put<Product>(`/api/v1/products/${id}`, updateData);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update product');
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    const response = await apiService.delete(`/api/v1/products/${id}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete product');
    }
  }

  // Bulk delete products
  async bulkDeleteProducts(ids: string[]): Promise<void> {
    const response = await apiService.post('/api/v1/products/bulk-delete', { ids });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete products');
    }
  }

  // Update product status
  async updateProductStatus(id: string, status: 'active' | 'inactive' | 'draft'): Promise<Product> {
    const response = await apiService.patch<Product>(`/api/v1/products/${id}/status`, { status });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update product status');
  }

  // Toggle featured status
  async toggleFeatured(id: string): Promise<Product> {
    const response = await apiService.patch<Product>(`/api/v1/products/${id}/featured`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to toggle featured status');
  }

  // Upload product image
  async uploadImage(productId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    const response = await apiService.uploadFile<{ url: string }>(
      `/api/v1/products/${productId}/images`,
      file,
      onProgress
    );

    if (response.success && response.data) {
      return response.data.url;
    }

    throw new Error(response.error || 'Failed to upload image');
  }

  // Delete product image
  async deleteImage(productId: string, imageUrl: string): Promise<void> {
    const response = await apiService.delete(`/api/v1/products/${productId}/images`, {
      data: { imageUrl }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete image');
    }
  }

  // Get product stats
  async getProductStats(): Promise<ProductStats> {
    const response = await apiService.get<ProductStats>('/api/v1/products/stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch product stats');
  }

  // Get categories
  async getCategories(): Promise<Category[]> {
    const response = await apiService.get<Category[]>('/api/v1/categories');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch categories');
  }

  // Get brands
  async getBrands(): Promise<Brand[]> {
    const response = await apiService.get<Brand[]>('/api/v1/brands');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch brands');
  }

  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    const response = await apiService.get<Product[]>(`/api/v1/products/search?q=${encodeURIComponent(query)}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to search products');
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    const response = await apiService.get<Product[]>('/api/v1/products/low-stock');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch low stock products');
  }

  // Get out of stock products
  async getOutOfStockProducts(): Promise<Product[]> {
    const response = await apiService.get<Product[]>('/api/v1/products/out-of-stock');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch out of stock products');
  }
}

// Export singleton instance
export const productService = ProductService.getInstance();
export default productService;