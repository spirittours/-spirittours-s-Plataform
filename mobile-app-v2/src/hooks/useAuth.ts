/**
 * Hook de Autenticación para React Native
 * Maneja todo el flujo de autenticación de usuarios
 */

import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

// Crear contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook useAuth para acceder al contexto de autenticación
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Provider de autenticación
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Cargar usuario almacenado
   */
  const loadUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login de usuario
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.post('/api/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user: userData } = response.data;

      // Guardar tokens
      await apiService.setTokens(access_token, refresh_token);

      // Guardar usuario
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  /**
   * Registro de nuevo usuario
   */
  const register = async (data: RegisterData) => {
    try {
      const response = await apiService.post('/api/auth/register', data);

      const { access_token, refresh_token, user: userData } = response.data;

      // Guardar tokens
      await apiService.setTokens(access_token, refresh_token);

      // Guardar usuario
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Error al registrar usuario');
    }
  };

  /**
   * Cerrar sesión
   */
  const logout = async () => {
    try {
      // Llamar al endpoint de logout
      await apiService.post('/api/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar estado local siempre
      await apiService.logout();
      setUser(null);
    }
  };

  /**
   * Actualizar perfil de usuario
   */
  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await apiService.put('/api/user/profile', data);
      const updatedUser = response.data;

      // Actualizar usuario en storage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error: any) {
      throw new Error(error.message || 'Error al actualizar perfil');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default useAuth;
