import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService, Cart, CartItem } from '../../services/api';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cart: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getCart();
      if (response.success && response.data) {
        return response.data.cart;
      } else {
        return rejectWithValue(response.error?.message || 'Savat yuklanishida xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Savat yuklanishida xatolik');
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }: { productId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.addToCart(productId, quantity);
      if (response.success && response.data) {
        return response.data.cart;
      } else {
        return rejectWithValue(response.error?.message || 'Mahsulot qo\'shishda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Mahsulot qo\'shishda xatolik');
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ productId, quantity }: { productId: string; quantity: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateCartItem(productId, quantity);
      if (response.success && response.data) {
        return response.data.cart;
      } else {
        return rejectWithValue(response.error?.message || 'Savat yangilashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Savat yangilashda xatolik');
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (productId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.removeFromCart(productId);
      if (response.success && response.data) {
        return response.data.cart;
      } else {
        return rejectWithValue(response.error?.message || 'Mahsulotni olib tashlashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Mahsulotni olib tashlashda xatolik');
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.clearCart();
      if (response.success) {
        return null;
      } else {
        return rejectWithValue(response.error?.message || 'Savatni tozalashda xatolik');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Savatni tozalashda xatolik');
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Cart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add to Cart
    builder
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Cart Item
    builder
      .addCase(updateCartItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Remove from Cart
    builder
      .addCase(removeFromCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cart = action.payload;
        state.error = null;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Clear Cart
    builder
      .addCase(clearCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.isLoading = false;
        state.cart = null;
        state.error = null;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setLoading } = cartSlice.actions;
export default cartSlice.reducer;