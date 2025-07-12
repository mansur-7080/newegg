import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService, Product, ProductFilters } from '../../services/api';

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  categories: string[];
  brands: string[];
  filters: ProductFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  currentProduct: null,
  categories: [],
  brands: [],
  filters: {},
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async ({ page = 1, limit = 12, filters = {} }: { page?: number; limit?: number; filters?: ProductFilters }, { rejectWithValue }) => {
    try {
      const response = await apiService.getProducts(page, limit, filters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Mahsulotlarni yuklashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Mahsulotlarni yuklashda xatolik');
    }
  }
);

export const fetchProduct = createAsyncThunk(
  'product/fetchProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getProduct(productId);
      if (response.success && response.data) {
        return response.data.product;
      } else {
        return rejectWithValue(response.error?.message || 'Mahsulot yuklashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Mahsulot yuklashda xatolik');
    }
  }
);

export const searchProducts = createAsyncThunk(
  'product/searchProducts',
  async ({ query, page = 1, limit = 12, filters = {} }: { query: string; page?: number; limit?: number; filters?: ProductFilters }, { rejectWithValue }) => {
    try {
      const response = await apiService.searchProducts(query, page, limit, filters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Qidiruvda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Qidiruvda xatolik');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'product/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getCategories();
      if (response.success && response.data) {
        return response.data.categories;
      } else {
        return rejectWithValue(response.error?.message || 'Kategoriyalarni yuklashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Kategoriyalarni yuklashda xatolik');
    }
  }
);

export const fetchBrands = createAsyncThunk(
  'product/fetchBrands',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getBrands();
      if (response.success && response.data) {
        return response.data.brands;
      } else {
        return rejectWithValue(response.error?.message || 'Brendlarni yuklashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Brendlarni yuklashda xatolik');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    setCurrentProduct: (state, action: PayloadAction<Product | null>) => {
      state.currentProduct = action.payload;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = {
          page: action.payload.page,
          limit: 12,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Single Product
    builder
      .addCase(fetchProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProduct = action.payload;
        state.error = null;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search Products
    builder
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.pagination = {
          page: action.payload.page,
          limit: 12,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
        state.error = null;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Brands
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.isLoading = false;
        state.brands = action.payload;
        state.error = null;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setLoading,
  setFilters,
  clearFilters,
  setCurrentProduct,
  clearCurrentProduct,
} = productSlice.actions;

export default productSlice.reducer;