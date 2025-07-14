/**
 * Product Redux Slice
 * Real product catalog management
 * NO FAKE OR MOCK - Professional product handling
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  brand?: string;
  sku: string;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  specifications: Record<string, string>;
  tags: string[];
  featured: boolean;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  rating?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
}

export interface ProductState {
  products: Product[];
  featuredProducts: Product[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    productCount: number;
  }>;
  currentProduct: Product | null;
  filters: ProductFilters;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const initialState: ProductState = {
  products: [],
  featuredProducts: [],
  categories: [],
  currentProduct: null,
  filters: {},
  searchQuery: '',
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
  },
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 12, filters = {} }: {
    page?: number;
    limit?: number;
    filters?: ProductFilters;
  }) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>),
    });

    const response = await fetch(`/api/products?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return response.json();
  }
);

export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeatured',
  async () => {
    const response = await fetch('/api/products?featured=true&limit=8');
    if (!response.ok) {
      throw new Error('Failed to fetch featured products');
    }
    return response.json();
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchById',
  async (id: string) => {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    return response.json();
  }
);

export const searchProducts = createAsyncThunk(
  'products/search',
  async ({ query, filters = {} }: { query: string; filters?: ProductFilters }) => {
    const params = new URLSearchParams({
      q: query,
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>),
    });

    const response = await fetch(`/api/products/search?${params}`);
    if (!response.ok) {
      throw new Error('Failed to search products');
    }
    return response.json();
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.pagination.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.totalItems,
          itemsPerPage: action.payload.itemsPerPage,
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch products';
      });

    // Fetch featured products
    builder
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload.products;
      });

    // Fetch product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProduct = action.payload.product;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch product';
      });

    // Search products
    builder
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to search products';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setSearchQuery,
  clearError,
  setCurrentPage,
} = productSlice.actions;

export default productSlice.reducer;