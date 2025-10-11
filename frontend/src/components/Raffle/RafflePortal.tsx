import React, { useState, useEffect } from 'react';
import {
  Gift,
  Trophy,
  Users,
  Star,
  Share2,
  Heart,
  Clock,
  Calendar,
  ChevronRight,
  QrCode,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Award,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Coins,
  Target,
  Zap,
  Crown,
  Medal,
  Sparkles,
  Timer,
  BarChart3,
  UserPlus,
  MessageCircle,
  ThumbsUp,
  Send,
  Link2,
  RefreshCw,
  Info
} from 'lucide-react';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';

interface Raffle {
  id: number;
  name: string;
  description: string;
  thumbnail: string;
  destination?: string;
  prize_value: number;
  start_date: string;
  end_date: string;
  draw_date: string;
  entries_count: number;
  max_entries: number;
  points_required: number;
  status: 'upcoming' | 'active' | 'closed' | 'completed';
  my_entries: number;
  winner?: string;
  prizes: Prize[];
  requirements: Requirements;
}

interface Prize {
  id: number;
  name: string;
  description: string;
  value: number;
  image: string;
  rank: number;
}

interface Requirements {
  social_follow: {
    facebook?: boolean;
    instagram?: boolean;
    youtube?: boolean;
    tiktok?: boolean;
  };
  minimum_points?: number;
  email_verified: boolean;
  share_required: boolean;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  points: number;
  available_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  rank: number;
  total_entries: number;
  total_wins: number;
  referral_code: string;
  daily_points_earned: number;
  daily_limit: number;
  year_started: number;
  social_verified: {
    facebook: boolean;
    instagram: boolean;
    youtube: boolean;
    tiktok: boolean;
  };
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  tier: string;
  engagement_score: number;
  avatar?: string;
}

interface SocialAction {
  platform: string;
  action: string;
  points: number;
  completed: boolean;
  cooldown?: number;
}

const RafflePortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'raffles' | 'points' | 'leaderboard' | 'profile'>('raffles');
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [participant, setParticipant] = useState<Participant>({
    id: 1,
    name: 'Usuario Demo',
    email: 'demo@example.com',
    points: 1250,
    available_points: 850,
    tier: 'gold',
    rank: 15,
    total_entries: 23,
    total_wins: 2,
    referral_code: 'SPIRIT2024',
    daily_points_earned: 7,
    daily_limit: 20,
    year_started: 2022,
    social_verified: {
      facebook: true,
      instagram: false,
      youtube: true,
      tiktok: false
    }
  });

  const [raffles, setRaffles] = useState<Raffle[]>([
    {
      id: 1,
      name: 'Viaje a Tierra Santa 2025',
      description: 'Peregrinación completa de 10 días por los lugares sagrados',
      thumbnail: '/images/holy-land.jpg',
      destination: 'Israel & Palestina',
      prize_value: 3500,
      start_date: '2024-12-01',
      end_date: '2024-12-31',
      draw_date: '2025-01-05',
      entries_count: 15420,
      max_entries: 50000,
      points_required: 100,
      status: 'active',
      my_entries: 2,
      prizes: [
        {
          id: 1,
          name: 'Viaje Completo para 2 personas',
          description: 'Incluye vuelos, hotel 4*, todas las comidas y guía',
          value: 3500,
          image: '/images/prize1.jpg',
          rank: 1
        },
        {
          id: 2,
          name: 'Viaje para 1 persona',
          description: 'Incluye vuelo, hotel y desayunos',
          value: 1750,
          image: '/images/prize2.jpg',
          rank: 2
        }
      ],
      requirements: {
        social_follow: {
          facebook: true,
          youtube: true
        },
        minimum_points: 100,
        email_verified: true,
        share_required: true
      }
    },
    {
      id: 2,
      name: 'Tour Santuarios Marianos Europa',
      description: 'Visitando Fátima, Lourdes y Medjugorje',
      thumbnail: '/images/marian-tour.jpg',
      destination: 'Portugal, Francia, Bosnia',
      prize_value: 2800,
      start_date: '2024-12-15',
      end_date: '2025-01-15',
      draw_date: '2025-01-20',
      entries_count: 8350,
      max_entries: 30000,
      points_required: 75,
      status: 'active',
      my_entries: 0,
      prizes: [
        {
          id: 3,
          name: 'Tour Completo 8 días',
          description: 'Todo incluido con guía especializado',
          value: 2800,
          image: '/images/prize3.jpg',
          rank: 1
        }
      ],
      requirements: {
        social_follow: {
          facebook: true,
          instagram: true
        },
        minimum_points: 75,
        email_verified: true,
        share_required: false
      }
    }
  ]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: 'Mar*** G***', points: 5420, tier: 'diamond', engagement_score: 98 },
    { rank: 2, name: 'Jos*** L***', points: 4850, tier: 'diamond', engagement_score: 95 },
    { rank: 3, name: 'Ana*** R***', points: 4200, tier: 'platinum', engagement_score: 92 },
    { rank: 4, name: 'Car*** M***', points: 3900, tier: 'platinum', engagement_score: 89 },
    { rank: 5, name: 'Lui*** P***', points: 3500, tier: 'platinum', engagement_score: 87 }
  ]);

  const [socialActions, setSocialActions] = useState<SocialAction[]>([
    { platform: 'facebook', action: 'like', points: 2, completed: false },
    { platform: 'facebook', action: 'share', points: 5, completed: false, cooldown: 0 },
    { platform: 'instagram', action: 'follow', points: 10, completed: false },
    { platform: 'youtube', action: 'subscribe', points: 15, completed: true },
    { platform: 'youtube', action: 'like', points: 3, completed: false },
    { platform: 'tiktok', action: 'follow', points: 8, completed: false }
  ]);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState(false);

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'text-orange-600 bg-orange-100',
      silver: 'text-gray-600 bg-gray-100',
      gold: 'text-yellow-600 bg-yellow-100',
      platinum: 'text-purple-600 bg-purple-100',
      diamond: 'text-blue-600 bg-blue-100'
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'diamond': return <Crown className="h-5 w-5" />;
      case 'platinum': return <Medal className="h-5 w-5" />;
      case 'gold': return <Award className="h-5 w-5" />;
      case 'silver': return <Star className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'youtube': return <Youtube className="h-5 w-5 text-red-600" />;
      case 'tiktok': return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.34 6.34 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.33 6.33 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>;
      default: return <Share2 className="h-5 w-5" />;
    }
  };

  const handleSocialAction = (action: SocialAction) => {
    if (action.completed || (action.cooldown && action.cooldown > 0)) return;
    
    // Simulate completing action
    const newActions = socialActions.map(a => {
      if (a === action) {
        return { ...a, completed: true, cooldown: 3600 }; // 1 hour cooldown
      }
      return a;
    });
    setSocialActions(newActions);
    
    // Award points
    setParticipant(prev => ({
      ...prev,
      points: prev.points + action.points,
      available_points: prev.available_points + action.points,
      daily_points_earned: prev.daily_points_earned + action.points
    }));
    
    // Show points animation
    setPointsAnimation(true);
    setTimeout(() => setPointsAnimation(false), 2000);
    
    // Confetti effect
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const handleEnterRaffle = (raffle: Raffle) => {
    if (participant.available_points < raffle.points_required) {
      alert('Puntos insuficientes para participar');
      return;
    }
    
    // Check social requirements
    const unmetRequirements = [];
    for (const [platform, required] of Object.entries(raffle.requirements.social_follow)) {
      if (required && !participant.social_verified[platform as keyof typeof participant.social_verified]) {
        unmetRequirements.push(platform);
      }
    }
    
    if (unmetRequirements.length > 0) {
      alert(`Debes seguirnos en: ${unmetRequirements.join(', ')}`);
      return;
    }
    
    setSelectedRaffle(raffle);
    setShowEntryModal(true);
  };

  const confirmEntry = () => {
    if (!selectedRaffle) return;
    
    // Deduct points
    setParticipant(prev => ({
      ...prev,
      available_points: prev.available_points - selectedRaffle.points_required,
      total_entries: prev.total_entries + 1
    }));
    
    // Update raffle entries
    const newRaffles = raffles.map(r => {
      if (r.id === selectedRaffle.id) {
        return {
          ...r,
          my_entries: r.my_entries + 1,
          entries_count: r.entries_count + 1
        };
      }
      return r;
    });
    setRaffles(newRaffles);
    
    // Close modal and celebrate
    setShowEntryModal(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const renderRaffles = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🎁 Sorteos Activos</h2>
        <p>Participa y gana increíbles viajes y experiencias</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {raffles.filter(r => r.status === 'active').map(raffle => (
          <div key={raffle.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="relative">
              <img 
                src={raffle.thumbnail} 
                alt={raffle.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {raffle.status === 'active' ? 'ACTIVO' : 'PRÓXIMO'}
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-3 py-1 rounded">
                Valor: ${raffle.prize_value}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-xl font-bold mb-2">{raffle.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{raffle.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Sorteo: {new Date(raffle.draw_date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  {raffle.entries_count.toLocaleString()} participantes
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Coins className="h-4 w-4 mr-2" />
                  {raffle.points_required} puntos por entrada
                </div>
              </div>
              
              {raffle.my_entries > 0 && (
                <div className="bg-green-50 border border-green-200 rounded p-2 mb-4">
                  <p className="text-sm text-green-700">
                    ✅ Ya tienes {raffle.my_entries} entrada{raffle.my_entries > 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex -space-x-1">
                  {Object.entries(raffle.requirements.social_follow).map(([platform, required]) => 
                    required && (
                      <div 
                        key={platform}
                        className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center
                          ${participant.social_verified[platform as keyof typeof participant.social_verified] 
                            ? 'border-green-500' : 'border-gray-300'}`}
                      >
                        {getPlatformIcon(platform)}
                      </div>
                    )
                  )}
                </div>
                <button
                  onClick={() => handleEnterRaffle(raffle)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg 
                           hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
                >
                  Participar
                </button>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <button 
                    onClick={() => setShowQRModal(true)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    Compartir QR
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-gray-800">
                    <Info className="h-4 w-4 mr-1" />
                    Ver premios
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPoints = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">💰 Sistema de Puntos</h2>
            <p>Gana puntos con acciones sociales y participa en sorteos</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{participant.points}</p>
            <p className="text-sm opacity-90">Puntos totales</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getTierColor(participant.tier)}`}>
              {getTierIcon(participant.tier)}
              {participant.tier.toUpperCase()}
            </span>
          </div>
          <p className="text-2xl font-bold">{participant.available_points}</p>
          <p className="text-sm text-gray-600">Puntos disponibles</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Timer className="h-8 w-8 text-blue-500" />
            <span className="text-xs text-gray-500">Hoy</span>
          </div>
          <p className="text-2xl font-bold">{participant.daily_points_earned}/{participant.daily_limit}</p>
          <p className="text-sm text-gray-600">Puntos diarios</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(participant.daily_points_earned / participant.daily_limit) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="h-8 w-8 text-purple-500" />
            <span className="text-xs text-gray-500">Antigüedad</span>
          </div>
          <p className="text-2xl font-bold">{new Date().getFullYear() - participant.year_started}</p>
          <p className="text-sm text-gray-600">Años con nosotros</p>
          <p className="text-xs text-purple-600 mt-1">+15% bonus anual</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-500" />
          Ganar Puntos Rápidos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialActions.map((action, index) => (
            <div 
              key={index}
              className={`border rounded-lg p-4 ${action.completed ? 'bg-gray-50 opacity-60' : 'hover:shadow-md cursor-pointer'}`}
              onClick={() => !action.completed && handleSocialAction(action)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getPlatformIcon(action.platform)}
                  <div className="ml-3">
                    <p className="font-medium capitalize">
                      {action.action === 'like' && 'Dar Like'}
                      {action.action === 'share' && 'Compartir'}
                      {action.action === 'follow' && 'Seguir'}
                      {action.action === 'subscribe' && 'Suscribirse'}
                    </p>
                    <p className="text-sm text-gray-600">{action.platform}</p>
                  </div>
                </div>
                <div className="text-right">
                  {action.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="flex items-center">
                      <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                      <span className="font-bold text-lg">+{action.points}</span>
                    </div>
                  )}
                  {action.cooldown && action.cooldown > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Disponible en {Math.floor(action.cooldown / 60)}m
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Consejo Pro</h4>
          <p className="text-sm text-blue-800">
            Comparte tu código de referido <span className="font-mono font-bold">{participant.referral_code}</span> 
            {' '}y gana 50 puntos por cada amigo que se registre!
          </p>
        </div>
      </div>
      
      {pointsAnimation && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
          <p className="font-bold">+{socialActions.find(a => a.completed)?.points} Puntos!</p>
        </div>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🏆 Tabla de Líderes</h2>
        <p>Los participantes con más puntos del año</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Mensual</button>
              <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">Anual</button>
              <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">Histórico</button>
            </div>
            <div className="text-sm text-gray-600">
              Tu posición: <span className="font-bold text-lg">#{participant.rank}</span>
            </div>
          </div>
        </div>
        
        <div className="divide-y">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className={`p-4 flex items-center justify-between hover:bg-gray-50
              ${entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold
                  ${entry.rank === 1 ? 'bg-yellow-400 text-white' : ''}
                  ${entry.rank === 2 ? 'bg-gray-400 text-white' : ''}
                  ${entry.rank === 3 ? 'bg-orange-400 text-white' : ''}
                  ${entry.rank > 3 ? 'bg-gray-100 text-gray-700' : ''}`}>
                  {entry.rank}
                </div>
                <div className="ml-4">
                  <p className="font-semibold">{entry.name}</p>
                  <div className="flex items-center mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTierColor(entry.tier)}`}>
                      {entry.tier.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Engagement: {entry.engagement_score}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{entry.points.toLocaleString()}</p>
                <p className="text-sm text-gray-600">puntos</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-gray-50 text-center">
          <button className="text-blue-600 hover:text-blue-800 font-medium">
            Ver tabla completa →
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-4">
          <Trophy className="h-8 w-8 text-yellow-700 mb-2" />
          <h4 className="font-bold">Premio Mensual</h4>
          <p className="text-sm text-gray-700 mt-1">
            El #1 del mes gana un tour local valorado en $500
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-4">
          <Crown className="h-8 w-8 text-purple-700 mb-2" />
          <h4 className="font-bold">Premio Anual</h4>
          <p className="text-sm text-gray-700 mt-1">
            El campeón del año gana un viaje internacional
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-4">
          <Sparkles className="h-8 w-8 text-blue-700 mb-2" />
          <h4 className="font-bold">Bonus Especial</h4>
          <p className="text-sm text-gray-700 mt-1">
            Top 10 reciben descuentos exclusivos todo el año
          </p>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">👤 Mi Perfil</h2>
        <p>Gestiona tu cuenta y estadísticas</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4">Información Personal</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Nombre</p>
              <p className="font-semibold">{participant.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-semibold">{participant.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Miembro desde</p>
              <p className="font-semibold">{participant.year_started}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Código de Referido</p>
              <div className="flex items-center mt-1">
                <code className="bg-gray-100 px-3 py-1 rounded font-mono">{participant.referral_code}</code>
                <button className="ml-2 text-blue-600 hover:text-blue-800">
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4">Estadísticas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sorteos Participados</span>
              <span className="font-bold">{participant.total_entries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sorteos Ganados</span>
              <span className="font-bold text-green-600">{participant.total_wins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Puntos Totales</span>
              <span className="font-bold">{participant.points}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ranking Actual</span>
              <span className="font-bold">#{participant.rank}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nivel</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getTierColor(participant.tier)}`}>
                {participant.tier.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="font-bold text-lg mb-4">Redes Sociales Verificadas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(participant.social_verified).map(([platform, verified]) => (
            <div 
              key={platform}
              className={`border rounded-lg p-4 text-center ${verified ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
            >
              <div className="flex justify-center mb-2">
                {getPlatformIcon(platform)}
              </div>
              <p className="text-sm font-medium capitalize">{platform}</p>
              {verified ? (
                <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />
              ) : (
                <button className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                  Verificar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-bold">Spirit Tours Rewards</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <Coins className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="font-bold">{participant.available_points}</span>
              </div>
              <div className={`flex items-center px-3 py-1 rounded-full ${getTierColor(participant.tier)}`}>
                {getTierIcon(participant.tier)}
                <span className="ml-1 font-semibold text-sm">{participant.tier.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'raffles', label: 'Sorteos', icon: Gift },
              { id: 'points', label: 'Puntos', icon: Coins },
              { id: 'leaderboard', label: 'Ranking', icon: Trophy },
              { id: 'profile', label: 'Perfil', icon: Users }
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
        {activeTab === 'raffles' && renderRaffles()}
        {activeTab === 'points' && renderPoints()}
        {activeTab === 'leaderboard' && renderLeaderboard()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Compartir Sorteo</h3>
            <div className="flex justify-center mb-4">
              <QRCode value={`https://spirittours.com/raffle/${selectedRaffle?.id}`} size={200} />
            </div>
            <p className="text-sm text-gray-600 text-center mb-4">
              Escanea el código QR o comparte el enlace
            </p>
            <div className="flex space-x-2">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Facebook className="h-4 w-4 inline mr-2" />
                Facebook
              </button>
              <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                <MessageCircle className="h-4 w-4 inline mr-2" />
                WhatsApp
              </button>
            </div>
            <button 
              onClick={() => setShowQRModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Entry Confirmation Modal */}
      {showEntryModal && selectedRaffle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirmar Participación</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-semibold">{selectedRaffle.name}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedRaffle.description}</p>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Costo en puntos:</span>
                <span className="font-bold">{selectedRaffle.points_required}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tus puntos disponibles:</span>
                <span className="font-bold">{participant.available_points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Puntos después:</span>
                <span className="font-bold">{participant.available_points - selectedRaffle.points_required}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={confirmEntry}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Confirmar
              </button>
              <button 
                onClick={() => setShowEntryModal(false)}
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

export default RafflePortal;