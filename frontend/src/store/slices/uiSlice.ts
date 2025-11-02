import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  component: string;
  props?: any;
}

interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  toasts: Toast[];
  modals: Modal[];
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
  theme: 'light' | 'dark';
  language: string;
  currency: string;
}

const initialState: UIState = {
  sidebarOpen: true,
  mobileMenuOpen: false,
  toasts: [],
  modals: [],
  loading: {
    global: false,
  },
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  language: localStorage.getItem('language') || 'en',
  currency: localStorage.getItem('currency') || 'USD',
};

let toastId = 0;
let modalId = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Sidebar
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Mobile Menu
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },

    // Toasts
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const id = `toast-${Date.now()}-${toastId++}`;
      state.toasts.push({
        id,
        ...action.payload,
        duration: action.payload.duration || 5000,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },

    // Modals
    openModal: (state, action: PayloadAction<Omit<Modal, 'id'>>) => {
      const id = `modal-${Date.now()}-${modalId++}`;
      state.modals.push({
        id,
        ...action.payload,
      });
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(modal => modal.id !== action.payload);
    },
    closeAllModals: (state) => {
      state.modals = [];
    },

    // Loading
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },

    // Theme
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },

    // Language
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      localStorage.setItem('language', action.payload);
    },

    // Currency
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload;
      localStorage.setItem('currency', action.payload);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  addToast,
  removeToast,
  clearToasts,
  openModal,
  closeModal,
  closeAllModals,
  setGlobalLoading,
  setLoading,
  setTheme,
  toggleTheme,
  setLanguage,
  setCurrency,
} = uiSlice.actions;

export default uiSlice.reducer;
