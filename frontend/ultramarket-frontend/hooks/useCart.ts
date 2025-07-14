import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity?: number;
  variantId?: string;
  variantName?: string;
  store: {
    id: string;
    name: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CartSummary {
  itemsCount: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
}

interface AddToCartData {
  productId: string;
  quantity: number;
  variantId?: string;
}

interface UpdateCartData {
  itemId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  summary: CartSummary;
  isLoading: boolean;
  error: string | null;
}

// Local storage key
const CART_STORAGE_KEY = 'ultramarket_cart';

export const useCart = () => {
  const { isAuthenticated, authApi } = useAuth();
  
  const [cartState, setCartState] = useState<CartState>({
    items: [],
    summary: {
      itemsCount: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 0,
    },
    isLoading: false,
    error: null,
  });

  // Calculate cart summary
  const calculateSummary = useCallback((items: CartItem[]): CartSummary => {
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate shipping (free shipping over 1,000,000 UZS)
    const shipping = subtotal >= 1000000 ? 0 : 50000;
    
    // Calculate tax (12% in Uzbekistan)
    const tax = subtotal * 0.12;
    
    // No discount for now
    const discount = 0;
    
    const total = subtotal + shipping + tax - discount;

    return {
      itemsCount,
      subtotal,
      shipping,
      tax,
      discount,
      total,
    };
  }, []);

  // Load cart from localStorage or API
  useEffect(() => {
    const loadCart = async () => {
      try {
        setCartState(prev => ({ ...prev, isLoading: true, error: null }));

        if (isAuthenticated) {
          // Load from API for authenticated users
          const response = await authApi.get('/cart');
          const items = response.data.items || [];
          const summary = calculateSummary(items);

          setCartState({
            items,
            summary,
            isLoading: false,
            error: null,
          });

          // Sync with localStorage
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } else {
          // Load from localStorage for guest users
          const savedCart = localStorage.getItem(CART_STORAGE_KEY);
          const items = savedCart ? JSON.parse(savedCart) : [];
          const summary = calculateSummary(items);

          setCartState({
            items,
            summary,
            isLoading: false,
            error: null,
          });
        }
      } catch (error: any) {
        console.error('Cart load error:', error);
        setCartState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Savatcha yuklanishida xatolik',
        }));
      }
    };

    loadCart();
  }, [isAuthenticated, authApi, calculateSummary]);

  // Add item to cart
  const addToCart = useCallback(async (data: AddToCartData): Promise<void> => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));

      if (isAuthenticated) {
        // Add to API for authenticated users
        const response = await authApi.post('/cart/add', data);
        const items = response.data.items || [];
        const summary = calculateSummary(items);

        setCartState({
          items,
          summary,
          isLoading: false,
          error: null,
        });

        // Sync with localStorage
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } else {
        // Add to localStorage for guest users
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        let items: CartItem[] = savedCart ? JSON.parse(savedCart) : [];

        // Check if item already exists
        const existingItemIndex = items.findIndex(
          item => item.productId === data.productId && item.variantId === data.variantId
        );

        if (existingItemIndex > -1) {
          // Update quantity
          items[existingItemIndex].quantity += data.quantity;
          items[existingItemIndex].updatedAt = new Date().toISOString();
        } else {
          // Fetch product data (mock implementation)
          const newItem: CartItem = {
            id: `temp_${Date.now()}`,
            productId: data.productId,
            name: 'Mahsulot nomi', // Would be fetched from API
            image: '/placeholder.jpg',
            price: 100000, // Would be fetched from API
            quantity: data.quantity,
            variantId: data.variantId,
            store: {
              id: 'store1',
              name: 'Do\'kon nomi',
            },
            isAvailable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          items.push(newItem);
        }

        const summary = calculateSummary(items);

        setCartState({
          items,
          summary,
          isLoading: false,
          error: null,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }

      toast.success('Mahsulot savatga qo\'shildi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Savatga qo\'shishda xatolik';
      
      setCartState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isAuthenticated, authApi, calculateSummary]);

  // Update item quantity
  const updateQuantity = useCallback(async (data: UpdateCartData): Promise<void> => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));

      if (data.quantity <= 0) {
        // Remove item if quantity is 0
        await removeFromCart(data.itemId);
        return;
      }

      if (isAuthenticated) {
        // Update via API
        const response = await authApi.put('/cart/update', data);
        const items = response.data.items || [];
        const summary = calculateSummary(items);

        setCartState({
          items,
          summary,
          isLoading: false,
          error: null,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } else {
        // Update localStorage
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        let items: CartItem[] = savedCart ? JSON.parse(savedCart) : [];

        const itemIndex = items.findIndex(item => item.id === data.itemId);
        if (itemIndex > -1) {
          items[itemIndex].quantity = data.quantity;
          items[itemIndex].updatedAt = new Date().toISOString();

          const summary = calculateSummary(items);

          setCartState({
            items,
            summary,
            isLoading: false,
            error: null,
          });

          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        }
      }

      toast.success('Savatcha yangilandi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Savatni yangilashda xatolik';
      
      setCartState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isAuthenticated, authApi, calculateSummary]);

  // Remove item from cart
  const removeFromCart = useCallback(async (itemId: string): Promise<void> => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));

      if (isAuthenticated) {
        // Remove via API
        const response = await authApi.delete(`/cart/remove/${itemId}`);
        const items = response.data.items || [];
        const summary = calculateSummary(items);

        setCartState({
          items,
          summary,
          isLoading: false,
          error: null,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } else {
        // Remove from localStorage
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        let items: CartItem[] = savedCart ? JSON.parse(savedCart) : [];

        items = items.filter(item => item.id !== itemId);
        const summary = calculateSummary(items);

        setCartState({
          items,
          summary,
          isLoading: false,
          error: null,
        });

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }

      toast.success('Mahsulot savatdan o\'chirildi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Savatdan o\'chirishda xatolik';
      
      setCartState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isAuthenticated, authApi, calculateSummary]);

  // Clear cart
  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));

      if (isAuthenticated) {
        // Clear via API
        await authApi.delete('/cart/clear');
      }

      // Clear localStorage
      localStorage.removeItem(CART_STORAGE_KEY);

      setCartState({
        items: [],
        summary: calculateSummary([]),
        isLoading: false,
        error: null,
      });

      toast.success('Savatcha tozalandi');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Savatni tozalashda xatolik';
      
      setCartState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [isAuthenticated, authApi, calculateSummary]);

  // Sync guest cart with user cart after login
  const syncGuestCart = useCallback(async (): Promise<void> => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCart || !isAuthenticated) return;

      const guestItems: CartItem[] = JSON.parse(savedCart);
      if (guestItems.length === 0) return;

      setCartState(prev => ({ ...prev, isLoading: true }));

      // Send guest cart to API
      const response = await authApi.post('/cart/sync', { items: guestItems });
      const items = response.data.items || [];
      const summary = calculateSummary(items);

      setCartState({
        items,
        summary,
        isLoading: false,
        error: null,
      });

      // Update localStorage with merged cart
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));

      toast.success('Savatcha sinxronlashtirildi');
    } catch (error: any) {
      console.error('Cart sync error:', error);
      toast.error('Savatni sinxronlashtirishda xatolik');
    }
  }, [isAuthenticated, authApi, calculateSummary]);

  // Get item quantity by product ID
  const getItemQuantity = useCallback((productId: string, variantId?: string): number => {
    const item = cartState.items.find(
      item => item.productId === productId && item.variantId === variantId
    );
    return item?.quantity || 0;
  }, [cartState.items]);

  // Check if item is in cart
  const isInCart = useCallback((productId: string, variantId?: string): boolean => {
    return getItemQuantity(productId, variantId) > 0;
  }, [getItemQuantity]);

  // Format price in UZS
  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace('UZS', 'so\'m');
  }, []);

  return {
    // State
    cartItems: cartState.items,
    summary: cartState.summary,
    totalItems: cartState.summary.itemsCount,
    isLoading: cartState.isLoading,
    error: cartState.error,

    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    syncGuestCart,

    // Helpers
    getItemQuantity,
    isInCart,
    formatPrice,

    // Raw state for debugging
    cartState,
  };
};