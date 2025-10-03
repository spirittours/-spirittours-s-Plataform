import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaHome, 
  FaPlane, 
  FaHeart, 
  FaHistory,
  FaCreditCard,
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaStar,
  FaBell,
  FaGift,
  FaChartLine,
  FaTicketAlt
} from 'react-icons/fa';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    upcomingTrips: 2,
    completedTrips: 8,
    savedDestinations: 15,
    loyaltyPoints: 2450
  });

  const [upcomingBookings] = useState([
    {
      id: 1,
      destination: 'Machu Picchu, Perú',
      date: '2024-02-15',
      duration: '7 días',
      status: 'confirmed',
      price: '$1,899',
      image: '🏔️'
    },
    {
      id: 2,
      destination: 'Bali, Indonesia',
      date: '2024-04-20',
      duration: '10 días',
      status: 'pending',
      price: '$2,450',
      image: '🏝️'
    }
  ]);

  const [recentActivity] = useState([
    { id: 1, type: 'booking', description: 'Reserva confirmada para Machu Picchu', date: '2024-01-10', icon: '✅' },
    { id: 2, type: 'review', description: 'Dejaste una reseña para tu viaje a Sedona', date: '2024-01-08', icon: '⭐' },
    { id: 3, type: 'points', description: 'Ganaste 500 puntos de lealtad', date: '2024-01-05', icon: '🎁' },
    { id: 4, type: 'saved', description: 'Guardaste Varanasi en tus favoritos', date: '2024-01-03', icon: '❤️' }
  ]);

  const sidebarMenuItems = [
    { id: 'overview', label: 'Resumen', icon: FaHome },
    { id: 'bookings', label: 'Mis Reservas', icon: FaPlane },
    { id: 'favorites', label: 'Favoritos', icon: FaHeart },
    { id: 'history', label: 'Historial', icon: FaHistory },
    { id: 'payments', label: 'Pagos', icon: FaCreditCard },
    { id: 'profile', label: 'Mi Perfil', icon: FaUserCircle },
    { id: 'settings', label: 'Configuración', icon: FaCog }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Viajes Próximos</p>
                    <p className="text-3xl font-bold mt-2">{stats.upcomingTrips}</p>
                  </div>
                  <FaCalendarAlt className="text-3xl text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Viajes Completados</p>
                    <p className="text-3xl font-bold mt-2">{stats.completedTrips}</p>
                  </div>
                  <FaTicketAlt className="text-3xl text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Destinos Guardados</p>
                    <p className="text-3xl font-bold mt-2">{stats.savedDestinations}</p>
                  </div>
                  <FaHeart className="text-3xl text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Puntos de Lealtad</p>
                    <p className="text-3xl font-bold mt-2">{stats.loyaltyPoints}</p>
                  </div>
                  <FaGift className="text-3xl text-orange-200" />
                </div>
              </div>
            </div>

            {/* Próximos Viajes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Próximos Viajes</h2>
                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  Ver todos
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{booking.image}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{booking.destination}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <FaCalendarAlt className="inline mr-1" />
                          {booking.date} • {booking.duration}
                        </p>
                        <p className="text-lg font-bold text-indigo-600 mt-2">{booking.price}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="text-gray-800">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'bookings':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mis Reservas</h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{booking.image}</div>
                      <div>
                        <h3 className="font-semibold">{booking.destination}</h3>
                        <p className="text-sm text-gray-600">{booking.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{booking.price}</p>
                      <button className="text-indigo-600 hover:text-indigo-700 text-sm">
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mi Perfil</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <p className="text-lg">{user?.first_name} {user?.last_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-lg">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <p className="text-lg">{user?.phone || 'No configurado'}</p>
              </div>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                Editar Perfil
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{
              sidebarMenuItems.find(item => item.id === activeTab)?.label
            }</h2>
            <p className="text-gray-600">Contenido de {activeTab} próximamente...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <FaUserCircle className="text-4xl text-indigo-600" />
            <div>
              <p className="font-semibold text-gray-800">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-gray-500">Cliente Spirit Tours</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          {sidebarMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <FaSignOutAlt />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              ¡Bienvenido de vuelta, {user?.first_name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Gestiona tus viajes espirituales y experiencias transformadoras
            </p>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;