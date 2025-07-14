import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

// Import all slices
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import productReducer from './slices/productSlice';
import orderReducer from './slices/orderSlice';
import userReducer from './slices/userSlice';
import notificationReducer from './slices/notificationSlice';
import wishlistReducer from './slices/wishlistSlice';
import filterReducer from './slices/filterSlice';
import checkoutReducer from './slices/checkoutSlice';
import uiReducer from './slices/uiSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart', 'wishlist', 'user'], // Only persist these reducers
  blacklist: ['notification', 'ui'], // Don't persist these
};

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  products: productReducer,
  orders: orderReducer,
  user: userReducer,
  notifications: notificationReducer,
  wishlist: wishlistReducer,
  filters: filterReducer,
  checkout: checkoutReducer,
  ui: uiReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export all actions for easy access
export * from './slices/authSlice';
export * from './slices/cartSlice';
export * from './slices/productSlice';
export * from './slices/orderSlice';
export * from './slices/userSlice';
export * from './slices/notificationSlice';
export * from './slices/wishlistSlice';
export * from './slices/filterSlice';
export * from './slices/checkoutSlice';
export * from './slices/uiSlice';