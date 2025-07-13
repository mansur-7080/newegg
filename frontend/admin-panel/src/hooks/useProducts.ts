import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService, Product, ProductFilters, CreateProductRequest, UpdateProductRequest } from '../services/productService';
import { useNotification } from '../contexts/NotificationContext';

// Query Keys
export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_QUERY_KEYS.all, 'list'] as const,
  list: (filters: ProductFilters) => [...PRODUCT_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PRODUCT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_QUERY_KEYS.details(), id] as const,
  stats: () => [...PRODUCT_QUERY_KEYS.all, 'stats'] as const,
  categories: () => ['categories'] as const,
  brands: () => ['brands'] as const,
  search: (query: string) => [...PRODUCT_QUERY_KEYS.all, 'search', query] as const,
  lowStock: () => [...PRODUCT_QUERY_KEYS.all, 'low-stock'] as const,
  outOfStock: () => [...PRODUCT_QUERY_KEYS.all, 'out-of-stock'] as const,
};

// Get Products Hook
export const useProducts = (filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.list(filters),
    queryFn: () => productService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get Product Hook
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(id),
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Get Product Stats Hook
export const useProductStats = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.stats(),
    queryFn: () => productService.getProductStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get Categories Hook
export const useCategories = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.categories(),
    queryFn: () => productService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get Brands Hook
export const useBrands = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.brands(),
    queryFn: () => productService.getBrands(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Search Products Hook
export const useSearchProducts = (query: string) => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.search(query),
    queryFn: () => productService.searchProducts(query),
    enabled: !!query && query.length > 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Get Low Stock Products Hook
export const useLowStockProducts = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.lowStock(),
    queryFn: () => productService.getLowStockProducts(),
    staleTime: 2 * 60 * 1000,
  });
};

// Get Out of Stock Products Hook
export const useOutOfStockProducts = () => {
  return useQuery({
    queryKey: PRODUCT_QUERY_KEYS.outOfStock(),
    queryFn: () => productService.getOutOfStockProducts(),
    staleTime: 2 * 60 * 1000,
  });
};

// Create Product Hook
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: CreateProductRequest) => productService.createProduct(data),
    onSuccess: (newProduct) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.stats() });
      
      // Add to cache
      queryClient.setQueryData(PRODUCT_QUERY_KEYS.detail(newProduct.id), newProduct);
      
      showSuccess('Product created successfully', `${newProduct.name} has been created.`);
    },
    onError: (error: Error) => {
      showError('Failed to create product', error.message);
    },
  });
};

// Update Product Hook
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (data: UpdateProductRequest) => productService.updateProduct(data),
    onSuccess: (updatedProduct) => {
      // Update cache
      queryClient.setQueryData(PRODUCT_QUERY_KEYS.detail(updatedProduct.id), updatedProduct);
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.stats() });
      
      showSuccess('Product updated successfully', `${updatedProduct.name} has been updated.`);
    },
    onError: (error: Error) => {
      showError('Failed to update product', error.message);
    },
  });
};

// Delete Product Hook
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.stats() });
      
      showSuccess('Product deleted successfully', 'The product has been removed.');
    },
    onError: (error: Error) => {
      showError('Failed to delete product', error.message);
    },
  });
};

// Bulk Delete Products Hook
export const useBulkDeleteProducts = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (ids: string[]) => productService.bulkDeleteProducts(ids),
    onSuccess: (_, deletedIds) => {
      // Remove from cache
      deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(id) });
      });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.stats() });
      
      showSuccess('Products deleted successfully', `${deletedIds.length} products have been removed.`);
    },
    onError: (error: Error) => {
      showError('Failed to delete products', error.message);
    },
  });
};

// Update Product Status Hook
export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' | 'draft' }) =>
      productService.updateProductStatus(id, status),
    onSuccess: (updatedProduct) => {
      // Update cache
      queryClient.setQueryData(PRODUCT_QUERY_KEYS.detail(updatedProduct.id), updatedProduct);
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.stats() });
      
      showSuccess('Product status updated', `Status changed to ${updatedProduct.status}.`);
    },
    onError: (error: Error) => {
      showError('Failed to update product status', error.message);
    },
  });
};

// Toggle Featured Hook
export const useToggleFeatured = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: (id: string) => productService.toggleFeatured(id),
    onSuccess: (updatedProduct) => {
      // Update cache
      queryClient.setQueryData(PRODUCT_QUERY_KEYS.detail(updatedProduct.id), updatedProduct);
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() });
      
      const action = updatedProduct.featured ? 'featured' : 'unfeatured';
      showSuccess('Product updated', `${updatedProduct.name} has been ${action}.`);
    },
    onError: (error: Error) => {
      showError('Failed to update product', error.message);
    },
  });
};

// Upload Image Hook
export const useUploadProductImage = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ productId, file, onProgress }: { 
      productId: string; 
      file: File; 
      onProgress?: (progress: number) => void 
    }) => productService.uploadImage(productId, file, onProgress),
    onSuccess: (imageUrl, { productId }) => {
      // Invalidate product detail to refetch with new image
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(productId) });
      
      showSuccess('Image uploaded successfully', 'The product image has been uploaded.');
    },
    onError: (error: Error) => {
      showError('Failed to upload image', error.message);
    },
  });
};

// Delete Image Hook
export const useDeleteProductImage = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  return useMutation({
    mutationFn: ({ productId, imageUrl }: { productId: string; imageUrl: string }) =>
      productService.deleteImage(productId, imageUrl),
    onSuccess: (_, { productId }) => {
      // Invalidate product detail to refetch without deleted image
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.detail(productId) });
      
      showSuccess('Image deleted successfully', 'The product image has been removed.');
    },
    onError: (error: Error) => {
      showError('Failed to delete image', error.message);
    },
  });
};