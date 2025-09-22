/**
 * User Management Admin Panel
 * Complete user administration interface with RBAC
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useUserManagement, User, Role, Branch } from '../../store/rbacStore';
import { AdminGate, PermissionGate, PermissionButton } from '../RBAC/PermissionGate';
import toast from 'react-hot-toast';

interface UserManagementProps {
  className?: string;
}

interface UserFilters {
  search: string;
  branch_id?: string;
  role_name?: string;
  is_active?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword, isAdmin } = useUserManagement();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    branch_id: '',
    role_name: '',
    is_active: undefined,
  });

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadBranches();
  }, [currentPage, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '' && value !== undefined)
        ),
      };
      
      const userData = await getAllUsers(params);
      setUsers(userData);
      // Note: In a real implementation, the API would return pagination info
      setTotalPages(Math.ceil(userData.length / 20) || 1);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    }
    setLoading(false);
  };

  const loadRoles = async () => {
    try {
      // This would be a separate API call to get roles
      // For now, we'll use mock data
      setRoles([]);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadBranches = async () => {
    try {
      // This would be a separate API call to get branches
      // For now, we'll use mock data
      setBranches([]);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await createUser(userData);
      setShowCreateModal(false);
      loadUsers();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return;
    
    try {
      await updateUser(selectedUser.id, userData);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser.id);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      // Error handled by store
    }
  };

  const handlePasswordReset = async (newPassword: string) => {
    if (!selectedUser) return;
    
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setShowPasswordReset(false);
      setSelectedUser(null);
    } catch (error) {
      // Error handled by store
    }
  };

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      branch_id: '',
      role_name: '',
      is_active: undefined,
    });
    setCurrentPage(1);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
          <p className="text-gray-500">No tienes permisos para acceder a la gestión de usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminGate fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Restringido</h3>
          <p className="text-gray-500">Se requieren permisos de administrador.</p>
        </div>
      </div>
    }>
      <div className={`bg-white rounded-lg shadow-lg ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Gestión de Usuarios</h2>
            <PermissionButton
              permission="user_management:create:user"
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <UserPlusIcon className="w-5 h-5 mr-2" />
              Crear Usuario
            </PermissionButton>
          </div>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.branch_id || ''}
              onChange={(e) => handleFilterChange('branch_id', e.target.value || undefined)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las sucursales</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={filters.role_name || ''}
              onChange={(e) => handleFilterChange('role_name', e.target.value || undefined)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>

            <select
              value={filters.is_active?.toString() || ''}
              onChange={(e) => handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* Filter actions */}
          <div className="mt-2 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sucursal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.roles.map(role => role.name).join(', ') || 'Sin rol'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.branch?.name || 'Sin sucursal'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar usuario"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        
                        <PermissionButton
                          permission="user_management:update:user"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordReset(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                          variant="secondary"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </PermissionButton>
                        
                        <PermissionButton
                          permission="user_management:delete:user"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          variant="danger"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </PermissionButton>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {users.length} usuarios
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modals would go here - CreateUserModal, EditUserModal, etc. */}
        {/* These would be separate components for managing user creation/editing */}
      </div>
    </AdminGate>
  );
};

export default UserManagement;