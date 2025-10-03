/**
 * Login Page - Página de inicio de sesión con RBAC
 */

import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  FiUser, FiLock, FiEye, FiEyeOff, FiCompass, FiShield,
  FiUsers, FiSettings, FiBarChart3, FiGlobe, FiLoader
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useRBACStore } from '../../store/rbacStore';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, user, initializeAuth } = useRBACStore();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar auth al cargar la página
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Redirigir si ya está autenticado
  if (isAuthenticated && user) {
    return <Navigate to="/crm" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await login(formData.username, formData.password);
      navigate('/crm');
    } catch (error) {
      // El error ya se maneja en el store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const demoCredentials = [
    // NIVEL EJECUTIVO
    {
      category: '🏆 Nivel Ejecutivo',
      users: [
        { role: 'CEO', username: 'ceo', password: 'CEO123!', description: 'Chief Executive Officer - Control total', icon: <FiShield />, color: 'red' },
        { role: 'COO', username: 'coo', password: 'COO123!', description: 'Chief Operating Officer - Operaciones generales', icon: <FiUsers />, color: 'orange' }
      ]
    },
    // VENTAS
    {
      category: '💰 Departamento Ventas',
      users: [
        { role: 'Director Ventas', username: 'sales.director', password: 'Sales123!', description: 'Director del departamento de ventas', icon: <FiBarChart3 />, color: 'blue' },
        { role: 'Gerente Regional', username: 'sales.manager', password: 'Sales123!', description: 'Gerente regional de ventas', icon: <FiUsers />, color: 'blue' },
        { role: 'Ejecutivo Senior', username: 'sales.senior', password: 'Sales123!', description: 'Ejecutivo de ventas senior', icon: <FiUser />, color: 'cyan' },
        { role: 'Ejecutivo Junior', username: 'sales.junior', password: 'Sales123!', description: 'Ejecutivo de ventas junior', icon: <FiUser />, color: 'sky' }
      ]
    },
    // CALL CENTER
    {
      category: '📞 Call Center & Atención',
      users: [
        { role: 'Director Call Center', username: 'callcenter.director', password: 'Call123!', description: 'Director del call center', icon: <FiCompass />, color: 'green' },
        { role: 'Supervisor Turno', username: 'callcenter.supervisor', password: 'Call123!', description: 'Supervisor de turno', icon: <FiUsers />, color: 'green' },
        { role: 'Agente Senior', username: 'agent.senior', password: 'Call123!', description: 'Agente senior call center', icon: <FiUser />, color: 'emerald' },
        { role: 'Agente Standard', username: 'agent.standard', password: 'Call123!', description: 'Agente call center', icon: <FiUser />, color: 'teal' },
        { role: 'Operador', username: 'operator', password: 'Call123!', description: 'Operador telefónico', icon: <FiUser />, color: 'cyan' }
      ]
    },
    // MARKETING
    {
      category: '📊 Marketing & Digital',
      users: [
        { role: 'Director Marketing', username: 'marketing.director', password: 'Mark123!', description: 'Director de marketing', icon: <FiBarChart3 />, color: 'purple' },
        { role: 'Gerente Campañas', username: 'campaigns.manager', password: 'Mark123!', description: 'Gerente de campañas', icon: <FiUsers />, color: 'purple' },
        { role: 'Especialista Digital', username: 'digital.specialist', password: 'Mark123!', description: 'Marketing digital', icon: <FiGlobe />, color: 'violet' },
        { role: 'Content Creator', username: 'content.creator', password: 'Mark123!', description: 'Creador de contenido', icon: <FiUser />, color: 'fuchsia' },
        { role: 'Community Manager', username: 'community.manager', password: 'Mark123!', description: 'Community manager', icon: <FiUser />, color: 'pink' }
      ]
    },
    // FINANZAS
    {
      category: '💳 Finanzas & Contabilidad',
      users: [
        { role: 'Director Financiero', username: 'finance.director', password: 'Finance123!', description: 'CFO - Director financiero', icon: <FiBarChart3 />, color: 'yellow' },
        { role: 'Contador', username: 'accountant', password: 'Finance123!', description: 'Contador principal', icon: <FiUser />, color: 'yellow' },
        { role: 'Analista Financiero', username: 'financial.analyst', password: 'Finance123!', description: 'Analista financiero', icon: <FiUser />, color: 'amber' },
        { role: 'Tesorero', username: 'treasurer', password: 'Finance123!', description: 'Tesorero', icon: <FiUser />, color: 'orange' }
      ]
    },
    // IT
    {
      category: '🔧 IT & Tecnología',
      users: [
        { role: 'CTO', username: 'cto', password: 'Tech123!', description: 'Chief Technology Officer', icon: <FiSettings />, color: 'indigo' },
        { role: 'Arquitecto Sistemas', username: 'systems.architect', password: 'Tech123!', description: 'Arquitecto de sistemas', icon: <FiSettings />, color: 'indigo' },
        { role: 'DevOps', username: 'devops', password: 'Tech123!', description: 'Ingeniero DevOps', icon: <FiUser />, color: 'blue' },
        { role: 'Desarrollador', username: 'developer', password: 'Tech123!', description: 'Desarrollador software', icon: <FiUser />, color: 'cyan' },
        { role: 'Soporte Técnico', username: 'support.tech', password: 'Tech123!', description: 'Soporte técnico', icon: <FiUser />, color: 'sky' }
      ]
    },
    // OTROS DEPARTAMENTOS
    {
      category: '🏢 Otros Departamentos',
      users: [
        { role: 'Director Operaciones', username: 'operations.director', password: 'Ops123!', description: 'Director de operaciones', icon: <FiUsers />, color: 'slate' },
        { role: 'Director RRHH', username: 'hr.director', password: 'HR123!', description: 'Director recursos humanos', icon: <FiUsers />, color: 'stone' },
        { role: 'Director Legal', username: 'legal.director', password: 'Legal123!', description: 'Director legal', icon: <FiShield />, color: 'gray' },
        { role: 'Super Admin (Original)', username: 'admin', password: 'Admin123!', description: 'Administrador del sistema', icon: <FiShield />, color: 'red' }
      ]
    }
  ];

  const features = [
    {
      icon: <FiCompass className="h-6 w-6" />,
      title: '25 Agentes AI Especializados',
      description: 'Desde turismo ético hasta planificación de aventuras'
    },
    {
      icon: <FiShield className="h-6 w-6" />,
      title: 'Control de Acceso Avanzado',
      description: 'Permisos granulares por usuario y función'
    },
    {
      icon: <FiBarChart3 className="h-6 w-6" />,
      title: 'Analíticas en Tiempo Real',
      description: 'Métricas completas de rendimiento y satisfacción'
    },
    {
      icon: <FiGlobe className="h-6 w-6" />,
      title: 'Gestión Global',
      description: 'Administración multi-sucursal y multi-región'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex">
        {/* Panel Izquierdo - Información del Sistema */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 py-12">
          <div className="max-w-md mx-auto">
            {/* Logo y Título */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <FiCompass className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Spirit Tours CRM</h1>
              <p className="text-gray-600">
                Plataforma Avanzada de Gestión Turística con IA
              </p>
            </div>

            {/* Características */}
            <div className="space-y-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg text-blue-600">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">25</div>
                <div className="text-xs text-gray-500">Agentes AI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-xs text-gray-500">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">24/7</div>
                <div className="text-xs text-gray-500">Soporte</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho - Formulario de Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            {/* Header Móvil */}
            <div className="text-center lg:hidden">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <FiCompass className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Spirit Tours CRM</h2>
              <p className="text-gray-600 mt-2">Accede a tu panel de control</p>
            </div>

            {/* Formulario de Login */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-gray-600 mt-2">Accede a tu cuenta del CRM</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo Usuario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuario o Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Ingresa tu usuario o email"
                    />
                  </div>
                </div>

                {/* Campo Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Ingresa tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Botón de Login */}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  {(isSubmitting || isLoading) ? (
                    <>
                      <FiLoader className="h-5 w-5 animate-spin" />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <span>Iniciar Sesión</span>
                  )}
                </button>
              </form>

              {/* Enlaces */}
              <div className="mt-6 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {/* Credenciales de Demostración Expandidas */}
            <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[70vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Cuentas Empresariales Demo (35+ Usuarios)
              </h3>
              
              {demoCredentials.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 px-2">
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.users.map((user, userIndex) => (
                      <button
                        key={`${categoryIndex}-${userIndex}`}
                        onClick={() => setFormData({ username: user.username, password: user.password })}
                        className="w-full text-left p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${user.color}-100 text-${user.color}-600 flex-shrink-0`}>
                            {user.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{user.role}</div>
                            <div className="text-xs text-gray-600 truncate">{user.description}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {user.username} • {user.password}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 mb-2">
                  🏢 <strong>Sistema Empresarial Completo:</strong>
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 8 Departamentos con jerarquías completas</li>
                  <li>• 35+ usuarios con permisos diferenciados</li>
                  <li>• 13 sucursales globales</li>
                  <li>• Control RBAC granular por función</li>
                  <li>• Haz clic en cualquier usuario para usar sus credenciales</li>
                </ul>
              </div>
            </div>

            {/* Footer Expandido */}
            <div className="text-center text-sm text-gray-500">
              <p>© 2024 Spirit Tours CRM Empresarial</p>
              <p className="mt-1">Sistema RBAC con 25 Agentes AI • 8 Departamentos • 35+ Usuarios</p>
              <p className="mt-1 text-xs">Plataforma completa de gestión turística empresarial</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;