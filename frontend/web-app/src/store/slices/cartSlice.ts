import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../index';
import axios from 'axios';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku?: string;
  variant?: {
    color?: string;
    size?: string;
  };
  maxQuantity: number;
  discount?: number;
}

export interface CartState {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  appliedCoupon: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null;
  shippingCost: number;
}

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  isLoading: false,
  error: null,
  lastUpdated: null,
  appliedCoupon: null,
  shippingCost: 0,
};

// Async thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (userId: string) => {
    const response = await axios.get(`/api/cart/${userId}`);
    return response.data;
  }
);

export const syncCart = createAsyncThunk(
  'cart/syncCart',
  async ({ userId, items }: { userId: string; items: CartItem[] }) => {
    const response = await axios.post(`/api/cart/${userId}/sync`, { items });
    return response.data;
  }
);

export const applyCoupon = createAsyncThunk(
  'cart/applyCoupon',
  async ({ code, cartTotal }: { code: string; cartTotal: number }) => {
    const response = await axios.post('/api/coupons/validate', { code, cartTotal });
    return response.data;
  }
);

// Cart slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        item => item.productId === action.payload.productId &&
        JSON.stringify(item.variant) === JSON.stringify(action.payload.variant)
      );

      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
        if (existingItem.quantity > existingItem.maxQuantity) {
          existingItem.quantity = existingItem.maxQuantity;
        }
      } else {
        state.items.push(action.payload);
      }

      state.lastUpdated = new Date().toISOString();
      calculateTotals(state);
    },

    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.quantity = Math.min(action.payload.quantity, item.maxQuantity);
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.id !== action.payload.id);
        }
      }
      state.lastUpdated = new Date().toISOString();
      calculateTotals(state);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.lastUpdated = new Date().toISOString();
      calculateTotals(state);
    },

    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.totalItems = 0;
      state.appliedCoupon = null;
      state.shippingCost = 0;
      state.lastUpdated = new Date().toISOString();
    },

    setShippingCost: (state, action: PayloadAction<number>) => {
      state.shippingCost = action.payload;
      calculateTotals(state);
    },

    removeCoupon: (state) => {
      state.appliedCoupon = null;
      calculateTotals(state);
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.appliedCoupon = action.payload.appliedCoupon;
        state.shippingCost = action.payload.shippingCost || 0;
        calculateTotals(state);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch cart';
      })
      // Sync cart
      .addCase(syncCart.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(syncCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(syncCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to sync cart';
      })
      // Apply coupon
      .addCase(applyCoupon.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.isLoading = false;
        state.appliedCoupon = {
          code: action.payload.code,
          discount: action.payload.discount,
          type: action.payload.type,
        };
        calculateTotals(state);
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Invalid coupon code';
      });
  },
});

// Helper function to calculate totals
function calculateTotals(state: CartState) {
  let subtotal = 0;
  let totalItems = 0;

  state.items.forEach(item => {
    const itemPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
    subtotal += itemPrice * item.quantity;
    totalItems += item.quantity;
  });

  // Apply coupon discount
  let discount = 0;
  if (state.appliedCoupon) {
    if (state.appliedCoupon.type === 'percentage') {
      discount = subtotal * (state.appliedCoupon.discount / 100);
    } else {
      discount = state.appliedCoupon.discount;
    }
  }

  state.totalAmount = subtotal - discount + state.shippingCost;
  state.totalItems = totalItems;
}

// Actions
export const {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  setShippingCost,
  removeCoupon,
  setError,
} = cartSlice.actions;

// Selectors
export const selectCart = (state: RootState) => state.cart;
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartTotal = (state: RootState) => state.cart.totalAmount;
export const selectCartItemsCount = (state: RootState) => state.cart.totalItems;
export const selectAppliedCoupon = (state: RootState) => state.cart.appliedCoupon;
export const selectCartSubtotal = (state: RootState) => {
  return state.cart.items.reduce((total, item) => {
    const itemPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
    return total + (itemPrice * item.quantity);
  }, 0);
};
export const selectCartDiscount = (state: RootState) => {
  const subtotal = selectCartSubtotal(state);
  const coupon = state.cart.appliedCoupon;
  if (!coupon) return 0;
  
  if (coupon.type === 'percentage') {
    return subtotal * (coupon.discount / 100);
  }
  return coupon.discount;
};

// Export reducer
export default cartSlice.reducer;