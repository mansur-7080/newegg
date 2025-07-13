import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Placeholder reducer - replace with actual slices
const initialState = {
  auth: {
    user: null,
    token: null,
    isAuthenticated: false,
  },
  ui: {
    theme: 'light',
    collapsed: false,
  },
};

const rootReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'auth/login':
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload.user,
          token: action.payload.token,
          isAuthenticated: true,
        },
      };
    case 'auth/logout':
      return {
        ...state,
        auth: {
          user: null,
          token: null,
          isAuthenticated: false,
        },
      };
    case 'ui/setTheme':
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };
    case 'ui/toggleSidebar':
      return {
        ...state,
        ui: {
          ...state.ui,
          collapsed: !state.ui.collapsed,
        },
      };
    default:
      return state;
  }
};

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;