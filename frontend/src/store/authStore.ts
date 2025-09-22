import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../services/apiClient';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'agent';
  avatar?: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/login', {
            email,
            password,
          });

          const { user, token, refreshToken } = response.data;

          // Store tokens
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success(`¡Bienvenido ${user.firstName}!`);
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Error al iniciar sesión';
          toast.error(message);
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/register', userData);

          const { user, token, refreshToken } = response.data;

          // Store tokens
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success(`¡Cuenta creada exitosamente, ${user.firstName}!`);
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Error al crear cuenta';
          toast.error(message);
          throw error;
        }
      },

      logout: () => {
        // Clear tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        toast.success('Sesión cerrada exitosamente');
      },

      refreshToken: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await apiClient.post('/auth/refresh', {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          set({ token: accessToken });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.put('/auth/profile', userData);
          const updatedUser = response.data.user;

          set({
            user: updatedUser,
            isLoading: false,
          });

          toast.success('Perfil actualizado exitosamente');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Error al actualizar perfil';
          toast.error(message);
          throw error;
        }
      },
    }),
    {
      name: 'spirit-tours-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);