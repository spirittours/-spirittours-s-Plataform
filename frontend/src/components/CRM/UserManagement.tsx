/**
 * User Management - Gestión Completa de Usuarios para Administradores
 */

import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter,
  FiEye, FiLock, FiUnlock, FiRefreshCw, FiDownload,
  FiChevronDown, FiChevronUp, FiX, FiCheck, FiAlertTriangle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACStore, useUserManagement, User, Role, Branch } from '../../store/rbacStore';
import toast from 'react-hot-toast';

interface UserManagementProps {
  isAdmin: boolean;
}

interface CreateUserData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  branch_id?: string;
  role_ids: string[];
  permission_ids: string[];
}

interface FilterState {
  search: string;
  branch_id: string;
  role_name: string;
  is_active: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ isAdmin }) => {
  const { user: currentUser } = useRBACStore();
  const { getAllUsers, createUser, updateUser, deleteUser, resetUserPassword } = useUserManagement();

  // Estados
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  
  // Filtros y búsqueda
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    branch_id: '',
    role_name: '',
    is_active: ''
  });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Datos auxiliares (simular - en producción vienen de APIs)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAuxiliaryData();
    }
  }, [isAdmin, currentPage, filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        ...filters
      };
      
      const userData = await getAllUsers(params);
      setUsers(userData);
      
      // Simular totalPages - en producción viene de la API
      setTotalPages(Math.ceil(userData.length / itemsPerPage));
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    // Simular datos - en producción cargar desde APIs
    const mockRoles: Role[] = [
      { id: '1', name: 'Super Administrator', description: 'Acceso completo', level: 'super_administrator', hierarchy_level: 100, permissions: [] },
      { id: '2', name: 'System Administrator', description: 'Admin técnico', level: 'system_administrator', hierarchy_level: 85, permissions: [] },
      { id: '3', name: 'Branch Manager', description: 'Gerente sucursal', level: 'branch_manager', hierarchy_level: 50, permissions: [] },
      { id: '4', name: 'Travel Agent', description: 'Agente de viajes', level: 'travel_agent', hierarchy_level: 25, permissions: [] },
      { id: '5', name: 'Customer Service', description: 'Atención al cliente', level: 'customer_service', hierarchy_level: 15, permissions: [] }
    ];
    
    const mockBranches: Branch[] = [
      { id: '1', name: 'Headquarters', code: 'HQ', country: 'USA', city: 'New York', region: 'North America', is_headquarters: true, is_active: true },
      { id: '2', name: 'Europe Branch', code: 'EU', country: 'UK', city: 'London', region: 'Europe', is_headquarters: false, is_active: true },
      { id: '3', name: 'Asia Pacific', code: 'AP', country: 'Singapore', city: 'Singapore', region: 'Asia Pacific', is_headquarters: false, is_active: true }
    ];

    setAvailableRoles(mockRoles);
    setAvailableBranches(mockBranches);
  };

  const handleCreateUser = async (userData: CreateUserData) => {
    try {
      await createUser(userData);
      setShowCreateModal(false);
      loadUsers();
    } catch (error) {
      // Error ya mostrado por el store
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    try {
      await updateUser(userId, userData);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      // Error ya mostrado por el store
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await deleteUser(userId);
        loadUsers();
      } catch (error) {
        // Error ya mostrado por el store
      }
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (newPassword) {
      try {
        await resetUserPassword(userId, newPassword);
      } catch (error) {
        // Error ya mostrado por el store
      }
    }
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const getRoleBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      'super_administrator': 'bg-red-100 text-red-800',
      'system_administrator': 'bg-orange-100 text-orange-800',
      'general_manager': 'bg-purple-100 text-purple-800',
      'branch_manager': 'bg-blue-100 text-blue-800',
      'travel_agent': 'bg-green-100 text-green-800',
      'customer_service': 'bg-gray-100 text-gray-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <FiLock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Acceso Restringido</h3>
        <p className="mt-2 text-sm text-gray-500">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FiUsers className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-gray-600">Administrar usuarios, roles y permisos del sistema</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FiPlus className="h-4 w-4" />
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.branch_id}
            onChange={(e) => setFilters({...filters, branch_id: e.target.value})}
          >
            <option value="">Todas las sucursales</option>
            {availableBranches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.role_name}
            onChange={(e) => setFilters({...filters, role_name: e.target.value})}
          >
            <option value="">Todos los roles</option>
            {availableRoles.map(role => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.is_active}
            onChange={(e) => setFilters({...filters, is_active: e.target.value})}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={loadUsers}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            disabled={loading}
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {users.length} usuarios encontrados
            </span>
            <button className="flex items-center space-x-1 text-green-600 hover:text-green-700">
              <FiDownload className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isExpanded={expandedUser === user.id}
                onToggleExpansion={() => toggleUserExpansion(user.id)}
                onEdit={(user) => {
                  setSelectedUser(user);
                  setShowEditModal(true);
                }}
                onDelete={() => handleDeleteUser(user.id)}
                onResetPassword={() => handleResetPassword(user.id)}
                currentUserId={currentUser?.id || ''}
              />
            ))}
          </div>
        )}
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          availableRoles={availableRoles}
          availableBranches={availableBranches}
        />
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={(userData) => handleUpdateUser(selectedUser.id, userData)}
          availableRoles={availableRoles}
          availableBranches={availableBranches}
        />
      )}
    </div>
  );
};

// Componente UserCard
interface UserCardProps {
  user: User;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onEdit: (user: User) => void;
  onDelete: () => void;
  onResetPassword: () => void;
  currentUserId: string;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  isExpanded,
  onToggleExpansion,
  onEdit,
  onDelete,
  onResetPassword,
  currentUserId
}) => {
  const getRoleBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      'super_administrator': 'bg-red-100 text-red-800',
      'system_administrator': 'bg-orange-100 text-orange-800',
      'general_manager': 'bg-purple-100 text-purple-800',
      'branch_manager': 'bg-blue-100 text-blue-800',
      'travel_agent': 'bg-green-100 text-green-800',
      'customer_service': 'bg-gray-100 text-gray-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const canDeleteUser = user.id !== currentUserId && 
    !user.roles.some(role => role.level === 'super_administrator');

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            className="h-10 w-10 rounded-full bg-gray-300"
            src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`}
            alt="Avatar"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-gray-500">@{user.username} • {user.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              {user.roles.map((role) => (
                <span
                  key={role.id}
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(role.level)}`}
                >
                  {role.name}
                </span>
              ))}
              {user.branch && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  📍 {user.branch.name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar usuario"
          >
            <FiEdit className="h-4 w-4" />
          </button>
          
          <button
            onClick={onResetPassword}
            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="Resetear contraseña"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          
          {canDeleteUser && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar usuario"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={onToggleExpansion}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Información Personal</h4>
                <div className="space-y-1">
                  <p><span className="text-gray-500">Teléfono:</span> {user.phone || 'No especificado'}</p>
                  <p><span className="text-gray-500">Verificado:</span> {user.is_verified ? '✅ Sí' : '❌ No'}</p>
                  <p><span className="text-gray-500">Último acceso:</span> {
                    user.last_login 
                      ? new Date(user.last_login).toLocaleString()
                      : 'Nunca'
                  }</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Permisos Directos ({user.permissions.length})</h4>
                <div className="max-h-32 overflow-y-auto">
                  {user.permissions.length > 0 ? (
                    <div className="space-y-1">
                      {user.permissions.map((permission) => (
                        <div key={permission.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {permission.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">Sin permisos directos</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal Crear Usuario
interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (userData: CreateUserData) => void;
  availableRoles: Role[];
  availableBranches: Branch[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  onClose,
  onSubmit,
  availableRoles,
  availableBranches
}) => {
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    branch_id: '',
    role_ids: [],
    permission_ids: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nombre de usuario"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
            
            <input
              type="email"
              placeholder="Correo electrónico"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            
            <input
              type="password"
              placeholder="Contraseña"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            
            <input
              type="tel"
              placeholder="Teléfono"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            
            <input
              type="text"
              placeholder="Nombre"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
            
            <input
              type="text"
              placeholder="Apellido"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={formData.branch_id}
            onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
          >
            <option value="">Seleccionar sucursal</option>
            {availableBranches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name} ({branch.city})</option>
            ))}
          </select>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={(e) => {
                      const roleIds = e.target.checked
                        ? [...formData.role_ids, role.id]
                        : formData.role_ids.filter(id => id !== role.id);
                      setFormData({...formData, role_ids: roleIds});
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal Editar Usuario (similar structure)
interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (userData: any) => void;
  availableRoles: Role[];
  availableBranches: Branch[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSubmit,
  availableRoles,
  availableBranches
}) => {
  const [formData, setFormData] = useState({
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone || '',
    is_active: user.is_active,
    branch_id: user.branch?.id || '',
    role_ids: user.roles.map(r => r.id),
    permission_ids: user.permissions.map(p => p.id)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Editar Usuario: {user.username}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
            
            <input
              type="tel"
              placeholder="Teléfono"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            
            <input
              type="text"
              placeholder="Nombre"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
            
            <input
              type="text"
              placeholder="Apellido"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Usuario activo</span>
            </label>
          </div>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={formData.branch_id}
            onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
          >
            <option value="">Seleccionar sucursal</option>
            {availableBranches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name} ({branch.city})</option>
            ))}
          </select>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {availableRoles.map(role => (
                <label key={role.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={(e) => {
                      const roleIds = e.target.checked
                        ? [...formData.role_ids, role.id]
                        : formData.role_ids.filter(id => id !== role.id);
                      setFormData({...formData, role_ids: roleIds});
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;