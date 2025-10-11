import React, { useState, useEffect } from 'react';
import {
  Gift,
  Trophy,
  Users,
  Shield,
  TrendingUp,
  Calendar,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  BarChart,
  PieChart,
  Activity,
  UserCheck,
  UserX,
  Coins,
  Target,
  Award,
  Filter,
  Search,
  ChevronDown,
  RefreshCw,
  Lock,
  Unlock,
  AlertOctagon,
  MessageSquare,
  Send,
  Bell,
  Shuffle,
  FileText,
  Camera,
  Zap
} from 'lucide-react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

interface RaffleAdmin {
  id: number;
  name: string;
  status: 'draft' | 'upcoming' | 'active' | 'closed' | 'completed';
  start_date: string;
  end_date: string;
  total_entries: number;
  unique_participants: number;
  prize_value: number;
  fraud_attempts: number;
}

interface ParticipantAdmin {
  id: number;
  name: string;
  email: string;
  points: number;
  tier: string;
  risk_score: number;
  verified: boolean;
  blocked: boolean;
  total_entries: number;
  wins: number;
  suspicious_actions: number;
  registration_date: string;
  last_activity: string;
}

interface FraudAlert {
  id: number;
  type: 'velocity' | 'duplicate' | 'vpn' | 'pattern' | 'social';
  severity: 'low' | 'medium' | 'high' | 'critical';
  participant_id: number;
  participant_name: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface PointsConfig {
  action: string;
  platform: string;
  points: number;
  daily_limit: number;
  hourly_limit: number;
  cooldown_minutes: number;
  active: boolean;
}

const RaffleAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'raffles' | 'participants' | 'fraud' | 'points' | 'analytics'>('overview');
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleAdmin | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  
  const [stats, setStats] = useState({
    active_raffles: 3,
    total_participants: 15420,
    total_entries: 48250,
    points_distributed: 285000,
    fraud_blocked: 127,
    conversion_rate: 23.5,
    avg_entries_per_user: 3.1,
    social_engagement_rate: 67.8
  });

  const [raffles, setRaffles] = useState<RaffleAdmin[]>([
    {
      id: 1,
      name: 'Viaje a Tierra Santa 2025',
      status: 'active',
      start_date: '2024-12-01',
      end_date: '2024-12-31',
      total_entries: 15420,
      unique_participants: 4890,
      prize_value: 3500,
      fraud_attempts: 23
    },
    {
      id: 2,
      name: 'Tour Santuarios Marianos',
      status: 'active',
      start_date: '2024-12-15',
      end_date: '2025-01-15',
      total_entries: 8350,
      unique_participants: 2780,
      prize_value: 2800,
      fraud_attempts: 12
    }
  ]);

  const [participants, setParticipants] = useState<ParticipantAdmin[]>([
    {
      id: 1,
      name: 'María García',
      email: 'maria.garcia@email.com',
      points: 5420,
      tier: 'diamond',
      risk_score: 5,
      verified: true,
      blocked: false,
      total_entries: 45,
      wins: 2,
      suspicious_actions: 0,
      registration_date: '2022-03-15',
      last_activity: '2024-12-10'
    },
    {
      id: 2,
      name: 'Sospechoso Usuario',
      email: 'temp123@tempmail.com',
      points: 250,
      tier: 'bronze',
      risk_score: 85,
      verified: false,
      blocked: false,
      total_entries: 3,
      wins: 0,
      suspicious_actions: 7,
      registration_date: '2024-12-01',
      last_activity: '2024-12-10'
    }
  ]);

  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([
    {
      id: 1,
      type: 'velocity',
      severity: 'high',
      participant_id: 2,
      participant_name: 'Sospechoso Usuario',
      description: 'Múltiples acciones en corto tiempo desde la misma IP',
      timestamp: '2024-12-10 14:32:00',
      resolved: false
    },
    {
      id: 2,
      type: 'vpn',
      severity: 'medium',
      participant_id: 3,
      participant_name: 'John Doe',
      description: 'Acceso detectado desde VPN conocida',
      timestamp: '2024-12-10 13:15:00',
      resolved: false
    }
  ]);

  const [pointsConfig, setPointsConfig] = useState<PointsConfig[]>([
    { action: 'like', platform: 'facebook', points: 2, daily_limit: 10, hourly_limit: 5, cooldown_minutes: 0, active: true },
    { action: 'share', platform: 'facebook', points: 5, daily_limit: 5, hourly_limit: 2, cooldown_minutes: 60, active: true },
    { action: 'follow', platform: 'instagram', points: 10, daily_limit: 1, hourly_limit: 1, cooldown_minutes: 0, active: true },
    { action: 'subscribe', platform: 'youtube', points: 15, daily_limit: 1, hourly_limit: 1, cooldown_minutes: 0, active: true }
  ]);

  const handleBlockParticipant = (participant: ParticipantAdmin) => {
    const updatedParticipants = participants.map(p => 
      p.id === participant.id ? { ...p, blocked: !p.blocked } : p
    );
    setParticipants(updatedParticipants);
  };

  const handleResolveAlert = (alert: FraudAlert) => {
    const updatedAlerts = fraudAlerts.map(a =>
      a.id === alert.id ? { ...a, resolved: true } : a
    );
    setFraudAlerts(updatedAlerts);
  };

  const handleUpdatePointsConfig = (config: PointsConfig, field: keyof PointsConfig, value: any) => {
    const updatedConfig = pointsConfig.map(c =>
      c === config ? { ...c, [field]: value } : c
    );
    setPointsConfig(updatedConfig);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Gift className="h-8 w-8 text-purple-500" />
            <span className="text-xs text-gray-500">Activos</span>
          </div>
          <p className="text-2xl font-bold">{stats.active_raffles}</p>
          <p className="text-sm text-gray-600">Sorteos Activos</p>
          <div className="mt-2 text-xs text-green-600">
            +2 este mes
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-8 w-8 text-blue-500" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total_participants.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Participantes</p>
          <div className="mt-2 text-xs text-green-600">
            ↑ 12.5% vs mes anterior
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-8 w-8 text-red-500" />
            <span className="text-xs text-gray-500">Seguridad</span>
          </div>
          <p className="text-2xl font-bold">{stats.fraud_blocked}</p>
          <p className="text-sm text-gray-600">Fraudes Bloqueados</p>
          <div className="mt-2 text-xs text-orange-600">
            23 esta semana
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <span className="text-xs text-gray-500">Conversión</span>
          </div>
          <p className="text-2xl font-bold">{stats.conversion_rate}%</p>
          <p className="text-sm text-gray-600">Tasa de Conversión</p>
          <div className="mt-2 text-xs text-green-600">
            ↑ 3.2% mejora
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Participación por Día</h3>
          <div className="h-64">
            {/* Chart placeholder - would use Chart.js or similar */}
            <div className="bg-gray-100 h-full rounded flex items-center justify-center">
              <BarChart className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Distribución de Puntos</h3>
          <div className="h-64">
            <div className="bg-gray-100 h-full rounded flex items-center justify-center">
              <PieChart className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Alertas Recientes</h3>
        <div className="space-y-2">
          {fraudAlerts.slice(0, 5).map(alert => (
            <div key={alert.id} className={`flex items-center justify-between p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-center">
                <AlertOctagon className="h-5 w-5 mr-3" />
                <div>
                  <p className="font-medium">{alert.description}</p>
                  <p className="text-sm opacity-75">{alert.participant_name} - {alert.timestamp}</p>
                </div>
              </div>
              {!alert.resolved && (
                <button 
                  onClick={() => handleResolveAlert(alert)}
                  className="px-3 py-1 bg-white rounded text-sm hover:bg-gray-50"
                >
                  Resolver
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRaffles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestión de Sorteos</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Crear Sorteo
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sorteo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participantes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entradas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fraudes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {raffles.map(raffle => (
              <tr key={raffle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium">{raffle.name}</p>
                    <p className="text-sm text-gray-500">${raffle.prize_value}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${raffle.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    ${raffle.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : ''}
                    ${raffle.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                    ${raffle.status === 'completed' ? 'bg-purple-100 text-purple-800' : ''}
                  `}>
                    {raffle.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {raffle.unique_participants.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {raffle.total_entries.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${raffle.fraud_attempts > 20 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {raffle.fraud_attempts}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <Edit className="h-4 w-4" />
                    </button>
                    {raffle.status === 'closed' && (
                      <button 
                        onClick={() => {
                          setSelectedRaffle(raffle);
                          setShowDrawModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Shuffle className="h-4 w-4" />
                      </button>
                    )}
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderParticipants = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gestión de Participantes</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar participante..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puntos/Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Riesgo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actividad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participants.map(participant => (
              <tr key={participant.id} className={`hover:bg-gray-50 ${participant.blocked ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-gray-500">{participant.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium">{participant.points.toLocaleString()}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full
                      ${participant.tier === 'diamond' ? 'bg-blue-100 text-blue-800' : ''}
                      ${participant.tier === 'platinum' ? 'bg-purple-100 text-purple-800' : ''}
                      ${participant.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${participant.tier === 'silver' ? 'bg-gray-100 text-gray-800' : ''}
                      ${participant.tier === 'bronze' ? 'bg-orange-100 text-orange-800' : ''}
                    `}>
                      {participant.tier}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(participant.risk_score)}`}>
                      {participant.risk_score}%
                    </span>
                    {participant.suspicious_actions > 0 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 ml-2" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div>
                    <p>{participant.total_entries} entradas</p>
                    <p className="text-gray-500">{participant.wins} ganados</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {participant.verified && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {participant.blocked && (
                      <Lock className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleBlockParticipant(participant)}
                      className={participant.blocked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}
                    >
                      {participant.blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button className="text-purple-600 hover:text-purple-900">
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFraudDetection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Detección de Fraude</h2>
        <div className="flex space-x-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            {fraudAlerts.filter(a => !a.resolved).length} alertas activas
          </span>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Escanear
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertOctagon className="h-8 w-8 text-red-600" />
            <span className="text-xs text-red-600 font-medium">Crítico</span>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {fraudAlerts.filter(a => a.severity === 'critical').length}
          </p>
          <p className="text-sm text-red-600">Alertas críticas</p>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <span className="text-xs text-yellow-600 font-medium">Medio</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">
            {fraudAlerts.filter(a => a.severity === 'medium').length}
          </p>
          <p className="text-sm text-yellow-600">Riesgo medio</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-8 w-8 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Bloqueados</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.fraud_blocked}</p>
          <p className="text-sm text-green-600">Total bloqueados</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Alertas de Fraude</h3>
        <div className="space-y-3">
          {fraudAlerts.map(alert => (
            <div key={alert.id} className={`border rounded-lg p-4 ${alert.resolved ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg mr-3 ${getSeverityColor(alert.severity)}`}>
                    {alert.type === 'velocity' && <Zap className="h-5 w-5" />}
                    {alert.type === 'vpn' && <Shield className="h-5 w-5" />}
                    {alert.type === 'duplicate' && <Users className="h-5 w-5" />}
                    {alert.type === 'pattern' && <Activity className="h-5 w-5" />}
                    {alert.type === 'social' && <MessageSquare className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{alert.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Participante: {alert.participant_name} (ID: {alert.participant_id})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  {alert.resolved ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <button 
                      onClick={() => handleResolveAlert(alert)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Configuración Anti-Fraude</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Detección de VPN/Proxy</p>
              <p className="text-sm text-gray-600">Bloquear acceso desde VPN y proxies conocidos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Límite de Velocidad</p>
              <p className="text-sm text-gray-600">Máximo 5 acciones por minuto por usuario</p>
            </div>
            <input type="number" defaultValue="5" className="w-16 px-2 py-1 border rounded" />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Verificación de Email</p>
              <p className="text-sm text-gray-600">Bloquear dominios de email temporal</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Umbral de Riesgo Automático</p>
              <p className="text-sm text-gray-600">Suspender automáticamente si el riesgo supera</p>
            </div>
            <div className="flex items-center">
              <input type="number" defaultValue="70" className="w-16 px-2 py-1 border rounded" />
              <span className="ml-1">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPointsConfiguration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Configuración de Puntos</h2>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Agregar Acción
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plataforma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Puntos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Límite Diario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Límite Horario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cooldown
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pointsConfig.map((config, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="font-medium capitalize">{config.action}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="capitalize">{config.platform}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="number"
                    value={config.points}
                    onChange={(e) => handleUpdatePointsConfig(config, 'points', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="number"
                    value={config.daily_limit}
                    onChange={(e) => handleUpdatePointsConfig(config, 'daily_limit', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="number"
                    value={config.hourly_limit}
                    onChange={(e) => handleUpdatePointsConfig(config, 'hourly_limit', parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input 
                      type="number"
                      value={config.cooldown_minutes}
                      onChange={(e) => handleUpdatePointsConfig(config, 'cooldown_minutes', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border rounded"
                    />
                    <span className="ml-1 text-sm text-gray-500">min</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.active}
                      onChange={(e) => handleUpdatePointsConfig(config, 'active', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Límites por Nivel</h3>
          <div className="space-y-3">
            {['bronze', 'silver', 'gold', 'platinum', 'diamond'].map(tier => (
              <div key={tier} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Award className={`h-5 w-5 mr-2 
                    ${tier === 'diamond' ? 'text-blue-600' : ''}
                    ${tier === 'platinum' ? 'text-purple-600' : ''}
                    ${tier === 'gold' ? 'text-yellow-600' : ''}
                    ${tier === 'silver' ? 'text-gray-600' : ''}
                    ${tier === 'bronze' ? 'text-orange-600' : ''}
                  `} />
                  <span className="font-medium capitalize">{tier}</span>
                </div>
                <div className="flex items-center">
                  <input 
                    type="number"
                    defaultValue={tier === 'diamond' ? 50 : tier === 'platinum' ? 30 : tier === 'gold' ? 20 : tier === 'silver' ? 15 : 10}
                    className="w-16 px-2 py-1 border rounded mr-2"
                  />
                  <span className="text-sm text-gray-500">puntos/día</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Reset Anual</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fecha de Reset</p>
                <p className="text-sm text-gray-600">Reinicio automático de puntos</p>
              </div>
              <input type="date" defaultValue="2025-01-01" className="px-3 py-1 border rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Retención de Puntos</p>
                <p className="text-sm text-gray-600">Porcentaje de puntos que se mantienen</p>
              </div>
              <div className="flex items-center">
                <input type="number" defaultValue="15" className="w-16 px-2 py-1 border rounded" />
                <span className="ml-1">%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bonus por Antigüedad</p>
                <p className="text-sm text-gray-600">Puntos extra por año de membresía</p>
              </div>
              <div className="flex items-center">
                <input type="number" defaultValue="100" className="w-20 px-2 py-1 border rounded" />
                <span className="ml-1 text-sm">pts/año</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-bold">Panel Admin - Sistema de Sorteos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-800">
                <Bell className="h-6 w-6" />
                {fraudAlerts.filter(a => !a.resolved).length > 0 && (
                  <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Settings className="h-5 w-5 inline mr-2" />
                Configuración
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'General', icon: Activity },
              { id: 'raffles', label: 'Sorteos', icon: Gift },
              { id: 'participants', label: 'Participantes', icon: Users },
              { id: 'fraud', label: 'Anti-Fraude', icon: Shield },
              { id: 'points', label: 'Puntos', icon: Coins },
              { id: 'analytics', label: 'Análisis', icon: BarChart }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'raffles' && renderRaffles()}
        {activeTab === 'participants' && renderParticipants()}
        {activeTab === 'fraud' && renderFraudDetection()}
        {activeTab === 'points' && renderPointsConfiguration()}
      </div>

      {/* Draw Winner Modal */}
      {showDrawModal && selectedRaffle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Realizar Sorteo</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de realizar el sorteo para "{selectedRaffle.name}"?
            </p>
            <div className="bg-gray-50 rounded p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Participantes únicos:</span>
                <span className="font-bold">{selectedRaffle.unique_participants.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de entradas:</span>
                <span className="font-bold">{selectedRaffle.total_entries.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // Perform draw logic here
                  setShowDrawModal(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <Shuffle className="h-5 w-5 inline mr-2" />
                Realizar Sorteo
              </button>
              <button 
                onClick={() => setShowDrawModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaffleAdminDashboard;