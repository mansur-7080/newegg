import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: any;
}

interface UIState {
  sidebar: {
    isOpen: boolean;
  };
  modals: {
    [key: string]: ModalState;
  };
  notifications: Notification[];
  loading: {
    [key: string]: boolean;
  };
  theme: 'light' | 'dark';
  language: string;
}

const initialState: UIState = {
  sidebar: {
    isOpen: false,
  },
  modals: {},
  notifications: [],
  loading: {},
  theme: 'light',
  language: 'uz',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar actions
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },
    openSidebar: (state) => {
      state.sidebar.isOpen = true;
    },
    closeSidebar: (state) => {
      state.sidebar.isOpen = false;
    },

    // Modal actions
    openModal: (state, action: PayloadAction<{ type: string; data?: any }>) => {
      state.modals[action.payload.type] = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
      }
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key].isOpen = false;
      });
    },

    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        duration: action.payload.duration || 5000,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Loading actions
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload];
    },

    // Theme actions
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },

    // Language actions
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },
  },
});

export const {
  toggleSidebar,
  openSidebar,
  closeSidebar,
  openModal,
  closeModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  clearLoading,
  setTheme,
  toggleTheme,
  setLanguage,
} = uiSlice.actions;

export default uiSlice.reducer;