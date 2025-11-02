import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import toursReducer from './slices/toursSlice';
import bookingsReducer from './slices/bookingsSlice';
import reviewsReducer from './slices/reviewsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tours: toursReducer,
    bookings: bookingsReducer,
    reviews: reviewsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['auth/setTokens'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.tokenExpiry'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
