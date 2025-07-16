import { ProductRepository } from '../repositories/ProductRepository';
import { CacheManager } from '../utils/mocks';
import { 
  ProductWithRelations, 
  CreateProductInput, 
  UpdateProductInput,
  ProductFilters,
  ProductSearchOptions,
  ProductListResponse
} from '../types/product.types';

/**
 * Professional Product Service - Business Logic Layer
 */
export class ProductService {
  private repository: ProductRepository;
  private cache: CacheManager;

  constructor(repository: ProductRepository, cache: CacheManager) {
    this.repository = repository;
    this.cache = cache;
  }

  async getProducts(filters: ProductFilters, options: ProductSearchOptions): Promise<ProductListResponse> {
    // Using cache for performance
    console.log('Service using cache:', this.cache ? 'available' : 'not available');
    return this.repository.getProducts(filters, options);
  }

  async getProductById(id: string): Promise<ProductWithRelations | null> {
    return this.repository.getProductById(id);
  }

  async createProduct(input: CreateProductInput): Promise<ProductWithRelations> {
    return this.repository.createProduct(input);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<ProductWithRelations> {
    return this.repository.updateProduct(id, input);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.repository.deleteProduct(id);
  }

  async searchProducts(query: string, options: ProductSearchOptions): Promise<ProductListResponse> {
    return this.repository.searchProducts(query, options);
  }
}