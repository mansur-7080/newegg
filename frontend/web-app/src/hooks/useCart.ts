import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addToCart, removeFromCart, updateQuantity, clearCart, toggleCart, openCart, closeCart, CartItem } from '../store/slices/cartSlice';

export const useCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const isOpen = useSelector((state: RootState) => state.cart.isOpen);

  // Savatcha ma'lumotlarini hisoblash
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Savatcha amaliyotlari
  const addItem = (item: CartItem) => {
    dispatch(addToCart(item) as any);
  };

  const removeItem = (id: string) => {
    dispatch(removeFromCart(id));
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeFromCart(id));
    } else {
      dispatch(updateQuantity({ id, quantity }));
    }
  };

  const clearAllItems = () => {
    dispatch(clearCart());
  };

  const toggleCartVisibility = () => {
    dispatch(toggleCart());
  };

  const openCartDrawer = () => {
    dispatch(openCart());
  };

  const closeCartDrawer = () => {
    dispatch(closeCart());
  };

  // Mahsulot savatda bor-yo'qligini tekshirish
  const isItemInCart = (id: string): boolean => {
    return cartItems.some(item => item.id === id);
  };

  // Savatdagi mahsulot miqdorini olish
  const getItemQuantity = (id: string): number => {
    const item = cartItems.find(item => item.id === id);
    return item ? item.quantity : 0;
  };

  // Mahsulotni savatga qo'shish yoki miqdorini oshirish
  const addOrUpdateItem = (product: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      updateItemQuantity(product.id, existingItem.quantity + quantity);
    } else {
      addItem({ ...product, quantity });
    }
  };

  // Ko'plab mahsulotlarni savatga qo'shish
  const addBulkToCart = (items: CartItem[]) => {
    items.forEach(item => {
      addOrUpdateItem(item, item.quantity);
    });
  };

  // Eski API uchun alias
  const addToCart = addOrUpdateItem;

  // Savatcha bo'sh-to'laligini tekshirish
  const isEmpty = cartItems.length === 0;

  return {
    // Ma'lumotlar
    items: cartItems,
    itemCount,
    totalPrice,
    isOpen,
    isEmpty,

    // Amallar
    addItem,
    addToCart,
    addBulkToCart,
    removeItem,
    updateItemQuantity,
    clearAllItems,
    toggleCartVisibility,
    openCartDrawer,
    closeCartDrawer,
    addOrUpdateItem,

    // Yordamchi funksiyalar
    isItemInCart,
    getItemQuantity,
  };
};

export default useCart;