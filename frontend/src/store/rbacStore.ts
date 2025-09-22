/**
 * RBAC Store - Role-Based Access Control for Spirit Tours
 * Manages user permissions, roles, and access control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../services/apiClient';
import toast from 'react-hot-toast';

// Types and Interfaces
export interface Permission {
  id: string;
  name: string;
  description?: string;
  scope: string;
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  level: string;
  hierarchy_level: number;
  permissions: Permission[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  country: string;
  city: string;
  region?: string;
  is_headquarters: boolean;
  is_active: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  branch?: Branch;
  roles: Role[];
  permissions: Permission[];
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  expires_in: number;
}

export interface DashboardAccess {
  analytics: boolean;
  financial_reports: boolean;
  booking_management: boolean;
  customer_database: boolean;
  marketing_campaigns: boolean;
  user_management: boolean;
  system_configuration: boolean;
  audit_logs: boolean;
}

export interface AccessibleAgent {
  name: string;
  scope: string;
  can_execute: boolean;
}

interface RBACState {
  // Auth State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Permission State
  userPermissions: string[];
  dashboardAccess: DashboardAccess | null;
  accessibleAgents: AccessibleAgent[];
  isAdmin: boolean;
  
  // Auth Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Permission Actions
  checkPermission: (scope: string, action: string, resource: string) => Promise<boolean>;
  loadUserPermissions: () => Promise<void>;
  loadDashboardAccess: () => Promise<void>;
  loadAccessibleAgents: () => Promise<void>;
  hasPermission: (permissionString: string) => boolean;
  canAccessAgent: (agentScope: string) => boolean;
  canExecuteAgent: (agentScope: string) => boolean;
  canAccessDashboardSection: (section: keyof DashboardAccess) => boolean;
  
  // Admin Actions (only for admin users)
  getAllUsers: (params?: any) => Promise<User[]>;
  createUser: (userData: any) => Promise<User>;
  updateUser: (userId: string, userData: any) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  
  // Utility Actions
  initializeAuth: () => Promise<void>;
  clearState: () => void;
}

export const useRBACStore = create<RBACState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      userPermissions: [],
      dashboardAccess: null,
      accessibleAgents: [],
      isAdmin: false,

      // Auth Actions
      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post('/auth/login', {
            username,
            password,
          });

          const loginData: LoginResponse = response.data;

          // Store tokens
          localStorage.setItem('accessToken', loginData.access_token);
          localStorage.setItem('refreshToken', loginData.refresh_token);

          // Update axios default headers
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${loginData.access_token}`;

          set({
            user: loginData.user,
            token: loginData.access_token,
            refreshToken: loginData.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            isAdmin: loginData.user.roles.some(role => 
              ['super_administrator', 'system_administrator', 'general_manager'].includes(role.level)
            ),
          });

          // Load user permissions and access data
          await Promise.all([
            get().loadUserPermissions(),
            get().loadDashboardAccess(),
            get().loadAccessibleAgents(),
          ]);

          toast.success(`¡Bienvenido ${loginData.user.first_name}!`);
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.detail || 'Error al iniciar sesión';
          toast.error(message);
          throw error;
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint
          await apiClient.post('/auth/logout');
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }

        // Clear local storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        // Clear axios headers
        delete apiClient.defaults.headers.common['Authorization'];

        // Reset state
        get().clearState();

        toast.success('Sesión cerrada exitosamente');
      },

      refreshAccessToken: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await apiClient.post('/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, expires_in } = response.data;

          localStorage.setItem('accessToken', access_token);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

          set({ token: access_token });
        } catch (error) {
          // If refresh fails, logout user
          await get().logout();
          throw error;
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.put('/auth/profile', userData);
          const updatedUser = response.data;

          set({
            user: updatedUser,
            isLoading: false,
          });

          toast.success('Perfil actualizado exitosamente');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.detail || 'Error al actualizar perfil';
          toast.error(message);
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await apiClient.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
          });

          set({ isLoading: false });
          toast.success('Contraseña cambiada exitosamente');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.detail || 'Error al cambiar contraseña';
          toast.error(message);
          throw error;
        }
      },

      // Permission Actions
      checkPermission: async (scope: string, action: string, resource: string) => {
        try {
          const response = await apiClient.get(`/auth/check-permission/${scope}/${action}/${resource}`);
          return response.data.has_permission;
        } catch (error) {
          console.error('Error checking permission:', error);
          return false;
        }
      },

      loadUserPermissions: async () => {
        try {
          const response = await apiClient.get('/auth/permissions');
          const { permissions, is_admin } = response.data;
          
          const permissionStrings = permissions.map((p: any) => 
            `${p.scope}:${p.action}:${p.resource}`
          );

          set({ 
            userPermissions: permissionStrings,
            isAdmin: is_admin
          });
        } catch (error) {
          console.error('Error loading user permissions:', error);
        }
      },

      loadDashboardAccess: async () => {
        try {
          const response = await apiClient.get('/auth/dashboard-access');
          set({ dashboardAccess: response.data.dashboard_access });
        } catch (error) {
          console.error('Error loading dashboard access:', error);
        }
      },

      loadAccessibleAgents: async () => {
        try {
          const response = await apiClient.get('/auth/accessible-agents');
          set({ accessibleAgents: response.data.accessible_agents });
        } catch (error) {
          console.error('Error loading accessible agents:', error);
        }
      },

      hasPermission: (permissionString: string) => {
        const { userPermissions, isAdmin } = get();
        return isAdmin || userPermissions.includes(permissionString);
      },

      canAccessAgent: (agentScope: string) => {
        const { accessibleAgents, isAdmin } = get();
        return isAdmin || accessibleAgents.some(agent => agent.scope === agentScope);
      },

      canExecuteAgent: (agentScope: string) => {
        const { accessibleAgents, isAdmin } = get();
        if (isAdmin) return true;
        const agent = accessibleAgents.find(agent => agent.scope === agentScope);
        return agent ? agent.can_execute : false;
      },

      canAccessDashboardSection: (section: keyof DashboardAccess) => {
        const { dashboardAccess, isAdmin } = get();
        return isAdmin || (dashboardAccess ? dashboardAccess[section] : false);
      },

      // Admin Actions
      getAllUsers: async (params = {}) => {
        try {
          const response = await apiClient.get('/admin/users', { params });
          return response.data;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Error al cargar usuarios';
          toast.error(message);
          throw error;
        }
      },

      createUser: async (userData: any) => {
        try {
          const response = await apiClient.post('/admin/users', userData);
          toast.success('Usuario creado exitosamente');
          return response.data;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Error al crear usuario';
          toast.error(message);
          throw error;
        }
      },

      updateUser: async (userId: string, userData: any) => {
        try {
          const response = await apiClient.put(`/admin/users/${userId}`, userData);
          toast.success('Usuario actualizado exitosamente');
          return response.data;
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Error al actualizar usuario';
          toast.error(message);
          throw error;
        }
      },

      deleteUser: async (userId: string) => {
        try {
          await apiClient.delete(`/admin/users/${userId}`);
          toast.success('Usuario eliminado exitosamente');
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Error al eliminar usuario';
          toast.error(message);
          throw error;
        }
      },

      resetUserPassword: async (userId: string, newPassword: string) => {
        try {
          await apiClient.post(`/admin/users/${userId}/reset-password`, {
            new_password: newPassword,
          });
          toast.success('Contraseña restablecida exitosamente');
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Error al restablecer contraseña';
          toast.error(message);
          throw error;
        }
      },

      // Utility Actions
      initializeAuth: async () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (token && refreshToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          try {
            // Verify token and get user profile
            const response = await apiClient.get('/auth/profile');
            const user = response.data;

            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true,
              isAdmin: user.roles.some((role: Role) => 
                ['super_administrator', 'system_administrator', 'general_manager'].includes(role.level)
              ),
            });

            // Load permissions and access data
            await Promise.all([
              get().loadUserPermissions(),
              get().loadDashboardAccess(),
              get().loadAccessibleAgents(),
            ]);

          } catch (error) {
            // Token is invalid, try to refresh
            try {
              await get().refreshAccessToken();
              await get().initializeAuth(); // Recursive call after refresh
            } catch (refreshError) {
              // Both token and refresh failed, clear state
              get().clearState();
            }
          }
        } else {
          get().clearState();
        }
      },

      clearState: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          userPermissions: [],
          dashboardAccess: null,
          accessibleAgents: [],
          isAdmin: false,
        });
      },
    }),
    {
      name: 'spirit-tours-rbac',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

// Helper hooks for common permission checks
export const usePermissions = () => {
  const { 
    hasPermission, 
    canAccessAgent, 
    canExecuteAgent, 
    canAccessDashboardSection,
    isAdmin,
    userPermissions,
    accessibleAgents,
    dashboardAccess 
  } = useRBACStore();

  return {
    hasPermission,
    canAccessAgent,
    canExecuteAgent,
    canAccessDashboardSection,
    isAdmin,
    userPermissions,
    accessibleAgents,
    dashboardAccess,
  };
};

export const useUserManagement = () => {
  const { 
    getAllUsers, 
    createUser, 
    updateUser, 
    deleteUser, 
    resetUserPassword,
    isAdmin 
  } = useRBACStore();

  return {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    isAdmin,
  };
};

export default useRBACStore;