import { useState, useEffect, useCallback } from 'react';
import { apiService, Cart, CartItem, Product } from '../services/api';
import toast from 'react-hot-toast';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

export const useCart = () => {
  const [cartState, setCartState] = useState<CartState>({
    cart: null,
    isLoading: false,
    error: null,
  });

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = useCallback(async () => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.getCart();
      
      if (response.success && response.data) {
        setCartState({
          cart: response.data.cart,
          isLoading: false,
          error: null,
        });
      } else {
        setCartState({
          cart: null,
          isLoading: false,
          error: response.error?.message || 'Savat yuklanishida xatolik',
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Savat yuklanishida xatolik';
      setCartState({
        cart: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  }, []);

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.addToCart(productId, quantity);
      
      if (response.success && response.data) {
        setCartState({
          cart: response.data.cart,
          isLoading: false,
          error: null,
        });
        
        toast.success('Mahsulot savatga qo\'shildi');
        return { success: true };
      } else {
        const errorMessage = response.error?.message || 'Mahsulot qo\'shishda xatolik';
        setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Mahsulot qo\'shishda xatolik';
      setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateCartItem = useCallback(async (productId: string, quantity: number) => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.updateCartItem(productId, quantity);
      
      if (response.success && response.data) {
        setCartState({
          cart: response.data.cart,
          isLoading: false,
          error: null,
        });
        
        toast.success('Savat yangilandi');
        return { success: true };
      } else {
        const errorMessage = response.error?.message || 'Savat yangilashda xatolik';
        setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Savat yangilashda xatolik';
      setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const removeFromCart = useCallback(async (productId: string) => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.removeFromCart(productId);
      
      if (response.success && response.data) {
        setCartState({
          cart: response.data.cart,
          isLoading: false,
          error: null,
        });
        
        toast.success('Mahsulot savatdan olib tashlandi');
        return { success: true };
      } else {
        const errorMessage = response.error?.message || 'Mahsulotni olib tashlashda xatolik';
        setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Mahsulotni olib tashlashda xatolik';
      setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      setCartState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiService.clearCart();
      
      if (response.success) {
        setCartState({
          cart: null,
          isLoading: false,
          error: null,
        });
        
        toast.success('Savat tozalandi');
        return { success: true };
      } else {
        const errorMessage = response.error?.message || 'Savatni tozalashda xatolik';
        setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Savatni tozalashda xatolik';
      setCartState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const getCartItemCount = useCallback(() => {
    return cartState.cart?.itemCount || 0;
  }, [cartState.cart]);

  const getCartTotal = useCallback(() => {
    return cartState.cart?.total || 0;
  }, [cartState.cart]);

  const getCartItems = useCallback(() => {
    return cartState.cart?.items || [];
  }, [cartState.cart]);

  const isCartEmpty = useCallback(() => {
    return !cartState.cart || cartState.cart.items.length === 0;
  }, [cartState.cart]);

  return {
    cart: cartState.cart,
    isLoading: cartState.isLoading,
    error: cartState.error,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    loadCart,
    getCartItemCount,
    getCartTotal,
    getCartItems,
    isCartEmpty,
  };
};