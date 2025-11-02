import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { addToast } from '../store/slices/uiSlice';
import { Card, Button, Badge, Loading, Modal, Input, Pagination } from '../components/UI';
import { Link } from 'react-router-dom';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'moderator' | 'tour_operator';
  phone?: string;
  date_of_birth?: string;
  profile_picture_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  total_bookings?: number;
  total_spent?: number;
}

const AdminUsersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  // Mock data - Replace with actual API call
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'user',
      phone: '+1234567890',
      is_verified: true,
      is_active: true,
      created_at: '2024-01-15T10:30:00Z',
      last_login: '2024-11-01T15:45:00Z',
      total_bookings: 5,
      total_spent: 2500,
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'tour_operator',
      phone: '+1234567891',
      is_verified: true,
      is_active: true,
      created_at: '2024-02-20T14:20:00Z',
      last_login: '2024-10-30T09:30:00Z',
      total_bookings: 12,
      total_spent: 6800,
    },
    {
      id: 3,
      email: 'bob.johnson@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
      role: 'user',
      is_verified: false,
      is_active: true,
      created_at: '2024-03-10T08:15:00Z',
      total_bookings: 0,
      total_spent: 0,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  
  // Modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('user');
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // TODO: Fetch users from API
    setLoading(false);
  }, []);

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Role filter
      if (filterRole === 'all') return true;
      return user.role === filterRole;
    })
    .filter(user => {
      // Status filter
      if (filterStatus === 'all') return true;
      if (filterStatus === 'active') return user.is_active;
      if (filterStatus === 'inactive') return !user.is_active;
      return true;
    })
    .filter(user => {
      // Verification filter
      if (filterVerification === 'all') return true;
      if (filterVerification === 'verified') return user.is_verified;
      if (filterVerification === 'unverified') return !user.is_verified;
      return true;
    })
    .filter(user => {
      // Search filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        user.email.toLowerCase().includes(query) ||
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        (user.phone?.toLowerCase() || '').includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'name_desc':
          return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
        case 'bookings_desc':
          return (b.total_bookings || 0) - (a.total_bookings || 0);
        case 'spent_desc':
          return (b.total_spent || 0) - (a.total_spent || 0);
        default:
          return 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const verifiedUsers = users.filter(u => u.is_verified).length;
  const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'moderator').length;

  // Action handlers
  const handleToggleUserStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      dispatch(addToast({
        message: 'You cannot deactivate your own account',
        type: 'warning'
      }));
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement toggle user status API call
      const updatedUsers = users.map(u =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      );
      setUsers(updatedUsers);
      
      dispatch(addToast({
        message: `User ${user.is_active ? 'deactivated' : 'activated'} successfully`,
        type: 'success'
      }));
      setShowDeactivateModal(false);
      setSelectedUser(null);
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to update user status',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeUserRole = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      dispatch(addToast({
        message: 'You cannot change your own role',
        type: 'warning'
      }));
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement change user role API call
      const updatedUsers = users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole as any } : u
      );
      setUsers(updatedUsers);
      
      dispatch(addToast({
        message: 'User role updated successfully',
        type: 'success'
      }));
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to update user role',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      dispatch(addToast({
        message: 'You cannot delete your own account',
        type: 'warning'
      }));
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement delete user API call
      const updatedUsers = users.filter(u => u.id !== selectedUser.id);
      setUsers(updatedUsers);
      
      dispatch(addToast({
        message: 'User deleted successfully',
        type: 'success'
      }));
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      dispatch(addToast({
        message: 'Failed to delete user',
        type: 'error'
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info', text: string }> = {
      admin: { variant: 'danger', text: 'Admin' },
      moderator: { variant: 'warning', text: 'Moderator' },
      tour_operator: { variant: 'info', text: 'Tour Operator' },
      user: { variant: 'success', text: 'User' },
    };
    const config = roleMap[role] || { variant: 'info', text: role };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <Button size="lg">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
          Add New User
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-l-4 border-blue-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-blue-600">{totalUsers}</p>
        </Card>
        <Card className="bg-green-50 border-l-4 border-green-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Active Users</p>
          <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
        </Card>
        <Card className="bg-purple-50 border-l-4 border-purple-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Verified Users</p>
          <p className="text-3xl font-bold text-purple-600">{verifiedUsers}</p>
        </Card>
        <Card className="bg-red-50 border-l-4 border-red-600" padding="md">
          <p className="text-sm text-gray-600 mb-1">Admin/Mods</p>
          <p className="text-3xl font-bold text-red-600">{adminUsers}</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              fullWidth
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="tour_operator">Tour Operator</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Verification</label>
              <select
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="bookings_desc">Most Bookings</option>
                <option value="spent_desc">Highest Spending</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {user.first_name} {user.last_name}
                          {user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-blue-600">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.phone && (
                          <p className="text-xs text-gray-500">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <Badge variant={user.is_active ? 'success' : 'danger'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {user.is_verified ? (
                        <Badge variant="info">
                          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning">Unverified</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">{user.total_bookings || 0}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-800">
                      ${(user.total_spent || 0).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-800">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                      {user.last_login && (
                        <p className="text-xs text-gray-500">
                          Last: {new Date(user.last_login).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/users/${user.id}`}>
                        <Button variant="outline" size="sm" title="View Profile">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      </Link>
                      
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setNewRole(user.role);
                          setShowRoleModal(true);
                        }}
                        title="Change Role"
                        disabled={user.id === currentUser?.id}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                      </Button>

                      <Button
                        variant={user.is_active ? 'warning' : 'success'}
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeactivateModal(true);
                        }}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.is_active ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        title="Delete User"
                        disabled={user.id === currentUser?.id}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedUsers.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <p className="text-gray-600 mb-4">No users found matching your criteria.</p>
              <Button onClick={() => {
                setFilterRole('all');
                setFilterStatus('all');
                setFilterVerification('all');
                setSearchQuery('');
              }}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showFirstLast
          />
        </div>
      )}

      {/* Toggle Status Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.is_active ? 'Deactivate User' : 'Activate User'}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-6">
            {selectedUser?.is_active
              ? 'Are you sure you want to deactivate this user? They will not be able to access their account.'
              : 'Are you sure you want to activate this user? They will regain access to their account.'}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => selectedUser && handleToggleUserStatus(selectedUser)}
              variant={selectedUser?.is_active ? 'warning' : 'success'}
              loading={isProcessing}
              disabled={isProcessing}
              className="flex-1"
            >
              Yes, {selectedUser?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              onClick={() => {
                setShowDeactivateModal(false);
                setSelectedUser(null);
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        title="Change User Role"
        size="md"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Select a new role for {selectedUser?.first_name} {selectedUser?.last_name}
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New Role *
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="tour_operator">Tour Operator</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Admin:</strong> Full system access. <strong>Moderator:</strong> Can manage content and users.{' '}
              <strong>Tour Operator:</strong> Can manage tours. <strong>User:</strong> Regular customer.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleChangeUserRole}
              variant="success"
              loading={isProcessing}
              disabled={isProcessing || newRole === selectedUser?.role}
              className="flex-1"
            >
              Update Role
            </Button>
            <Button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="sm"
      >
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-red-800 mb-1">Warning: This action is permanent!</p>
                <p className="text-sm text-red-700">
                  Deleting this user will remove all their data including bookings, reviews, and profile information.
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleDeleteUser}
              variant="danger"
              loading={isProcessing}
              disabled={isProcessing}
              className="flex-1"
            >
              Yes, Delete User
            </Button>
            <Button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              variant="outline"
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
