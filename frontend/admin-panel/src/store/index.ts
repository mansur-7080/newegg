import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Example slice - you can add more slices here
interface AppState {
  user: {
    currentUser: any;
    isAuthenticated: boolean;
  };
  notifications: {
    items: any[];
  };
  theme: {
    mode: 'light' | 'dark';
  };
}

const initialState: AppState = {
  user: {
    currentUser: null,
    isAuthenticated: false,
  },
  notifications: {
    items: [],
  },
  theme: {
    mode: 'light',
  },
};

// Simple reducer for demo
function appReducer(state = initialState, action: any) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: {
          ...state.user,
          currentUser: action.payload,
          isAuthenticated: !!action.payload,
        },
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: {
          ...state.theme,
          mode: action.payload,
        },
      };
    default:
      return state;
  }
}

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Mock persistor for compatibility (not using persistence)
export const persistor = {
  persist: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  register: () => Promise.resolve(),
  rehydrate: () => Promise.resolve(),
  pause: () => {},
  purge: () => Promise.resolve(),
  getState: () => store.getState(),
};