import { configureStore } from '@reduxjs/toolkit';

// Temporary empty store
export const store = configureStore({
  reducer: {
    // Add reducers here when needed
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;