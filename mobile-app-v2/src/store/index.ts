import {configureStore} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers} from 'redux';

// Import slices
import authReducer from './slices/authSlice';
import tourReducer from './slices/tourSlice';
import bookingReducer from './slices/bookingSlice';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import notificationReducer from './slices/notificationSlice';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'settings', 'cart'], // Only persist these reducers
  blacklist: ['tour', 'booking', 'notification', 'chat'], // Don't persist these
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  tour: tourReducer,
  booking: bookingReducer,
  user: userReducer,
  cart: cartReducer,
  notification: notificationReducer,
  chat: chatReducer,
  settings: settingsReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export actions and selectors from slices
export * from './slices/authSlice';
export * from './slices/tourSlice';
export * from './slices/bookingSlice';
export * from './slices/userSlice';
export * from './slices/cartSlice';
export * from './slices/notificationSlice';
export * from './slices/chatSlice';
export * from './slices/settingsSlice';