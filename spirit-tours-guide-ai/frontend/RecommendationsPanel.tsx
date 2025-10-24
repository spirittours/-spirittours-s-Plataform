import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Sparkles, TrendingUp, Star, Users, Clock, DollarSign,
  ChevronRight, Heart, Share2, Calendar, MapPin, Tag,
  RefreshCw, Filter, X, BarChart3, Zap, ThumbsUp
} from 'lucide-react';
import io from 'socket.io-client';

// ==================== TYPES ====================

interface Tour {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  price: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  tags: string[];
  location: string;
}

interface Recommendation {
  tourId: string;
  score: number;
  rank: number;
  algorithm: string;
  metadata?: Record<string, any>;
}

interface TrendingTour {
  tourId: string;
  rank: number;
  metadata: {
    category: string;
    recentScore: number;
    previousScore: number;
    growth: number;
    growthPercentage: number;
  };
}

interface UserProfile {
  preferences: {
    categories: Record<string, number>;
    tags: Record<string, number>;
  };
  feature_vector: {
    categoryPreferences: Record<string, number>;
    tagPreferences: Record<string, number>;
    avgDuration: number;
    pricePreferences: Record<string, number>;
    totalInteractions: number;
  };
  behavior_patterns: {
    bookingRate: number;
    completionRate: number;
    explorationRate: number;
  };
}

interface Props {
  userId: string;
  onTourClick: (tourId: string) => void;
  onBookTour?: (tourId: string) => void;
  limit?: number;
}

// ==================== MAIN COMPONENT ====================

const RecommendationsPanel: React.FC<Props> = ({
  userId,
  onTourClick,
  onBookTour,
  limit = 10
}) => {
  // State
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tours, setTours] = useState<Record<string, Tour>>({});
  const [trendingTours, setTrendingTours] = useState<TrendingTour[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('hybrid');
  const [activeTab, setActiveTab] = useState<'personalized' | 'trending' | 'popular'>('personalized');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // WebSocket
  const [socket, setSocket] = useState<any>(null);
  
  // Categories
  const categories = [
    'all', 'historical', 'cultural', 'religious', 'adventure', 
    'food', 'nature', 'art', 'architecture'
  ];
  
  // Algorithms
  const algorithms = [
    { value: 'hybrid', label: 'Híbrido (Recomendado)', icon: Sparkles },
    { value: 'collaborative', label: 'Colaborativo', icon: Users },
    { value: 'content', label: 'Por Contenido', icon: Tag },
    { value: 'popular', label: 'Popular', icon: Star }
  ];
  
  // ==================== EFFECTS ====================
  
  // Initialize WebSocket
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const newSocket = io(apiUrl);
    
    newSocket.on('connect', () => {
      console.log('Connected to recommendations WebSocket');
      newSocket.emit('join-user', userId);
    });
    
    newSocket.on('recommendations-ready', (data: any) => {
      console.log('New recommendations ready:', data);
      if (data.algorithm === selectedAlgorithm) {
        loadRecommendations();
      }
    });
    
    newSocket.on('profile-updated', (data: any) => {
      console.log('User profile updated:', data);
      loadUserProfile();
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [userId]);
  
  // Load initial data
  useEffect(() => {
    loadRecommendations();
    loadTrendingTours();
    loadUserProfile();
  }, [userId, selectedAlgorithm, selectedCategory]);
  
  // ==================== API CALLS ====================
  
  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        limit,
        algorithm: selectedAlgorithm
      };
      
      const response = await axios.get(`/api/recommendations/user/${userId}`, { params });
      
      setRecommendations(response.data.recommendations || []);
      
      // Load tour details for recommendations
      const tourIds = response.data.recommendations.map((r: Recommendation) => r.tourId);
      await loadTourDetails(tourIds);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTrendingTours = async () => {
    try {
      const response = await axios.get('/api/recommendations/trending', {
        params: { limit: 5 }
      });
      
      setTrendingTours(response.data.trendingTours || []);
      
      // Load tour details
      const tourIds = response.data.trendingTours.map((t: TrendingTour) => t.tourId);
      await loadTourDetails(tourIds);
    } catch (error) {
      console.error('Error loading trending tours:', error);
    }
  };
  
  const loadUserProfile = async () => {
    try {
      const response = await axios.get(`/api/recommendations/user-profile/${userId}`);
      setUserProfile(response.data.profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };
  
  const loadTourDetails = async (tourIds: string[]) => {
    try {
      // In a real implementation, this would fetch from /api/tours
      // For now, we'll use mock data
      const mockTours: Record<string, Tour> = {};
      
      tourIds.forEach(tourId => {
        if (!tours[tourId]) {
          mockTours[tourId] = {
            id: tourId,
            name: `Tour ${tourId.slice(0, 8)}`,
            description: 'Experiencia única descubriendo la historia y cultura de Granada',
            category: 'historical',
            duration: 180,
            price: 45,
            rating: 4.7,
            reviewCount: 152,
            imageUrl: '/images/tours/default.jpg',
            tags: ['historia', 'cultura', 'arquitectura'],
            location: 'Granada, España'
          };
        }
      });
      
      setTours(prev => ({ ...prev, ...mockTours }));
    } catch (error) {
      console.error('Error loading tour details:', error);
    }
  };
  
  const trackInteraction = async (tourId: string, interactionType: string) => {
    try {
      await axios.post('/api/recommendations/track-interaction', {
        userId,
        tourId,
        interactionType,
        context: {
          timestamp: new Date().toISOString(),
          source: 'recommendations_panel'
        }
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };
  
  const trackRecommendationClick = async (tourId: string) => {
    try {
      await axios.post('/api/recommendations/recommendation-clicked', {
        userId,
        tourId,
        algorithm: selectedAlgorithm
      });
      
      await trackInteraction(tourId, 'click');
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
    }
  };
  
  const handleTourClick = (tourId: string) => {
    trackRecommendationClick(tourId);
    onTourClick(tourId);
  };
  
  const handleBookmark = async (tourId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await trackInteraction(tourId, 'bookmark');
    // Show visual feedback
    alert('Tour guardado en favoritos');
  };
  
  const handleShare = async (tourId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await trackInteraction(tourId, 'share');
    // Open share dialog
    if (navigator.share) {
      navigator.share({
        title: tours[tourId]?.name || 'Tour',
        text: tours[tourId]?.description || '',
        url: `/tours/${tourId}`
      });
    } else {
      alert('Compartir no disponible en este navegador');
    }
  };
  
  const handleBook = async (tourId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await trackInteraction(tourId, 'booking');
    if (onBookTour) {
      onBookTour(tourId);
    }
  };
  
  // ==================== RENDER HELPERS ====================
  
  const renderTourCard = (rec: Recommendation) => {
    const tour = tours[rec.tourId];
    if (!tour) return null;
    
    return (
      <div
        key={rec.tourId}
        onClick={() => handleTourClick(rec.tourId)}
        className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={tour.imageUrl}
            alt={tour.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            #{rec.rank}
          </div>
          <div className="absolute bottom-2 left-2 flex space-x-2">
            <button
              onClick={(e) => handleBookmark(rec.tourId, e)}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              title="Guardar en favoritos"
            >
              <Heart className="w-4 h-4 text-red-500" />
            </button>
            <button
              onClick={(e) => handleShare(rec.tourId, e)}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              title="Compartir"
            >
              <Share2 className="w-4 h-4 text-blue-500" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                {tour.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {tour.description}
              </p>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {tour.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {tag}
              </span>
            ))}
          </div>
          
          {/* Info Row */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {Math.floor(tour.duration / 60)}h
              </span>
              <span className="flex items-center">
                <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                {tour.rating}
              </span>
            </div>
            <span className="font-bold text-green-600 text-lg">
              ${tour.price}
            </span>
          </div>
          
          {/* Match Score */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Compatibilidad</span>
              <span className="font-medium">{Math.round(rec.score * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(rec.score * 100, 100)}%` }}
              />
            </div>
          </div>
          
          {/* CTA Button */}
          <button
            onClick={(e) => handleBook(rec.tourId, e)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Reservar Ahora</span>
          </button>
        </div>
      </div>
    );
  };
  
  const renderTrendingCard = (trending: TrendingTour) => {
    const tour = tours[trending.tourId];
    if (!tour) return null;
    
    return (
      <div
        key={trending.tourId}
        onClick={() => handleTourClick(trending.tourId)}
        className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer border border-orange-200"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
              {trending.rank}
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{tour.name}</h4>
              <p className="text-xs text-gray-600">{tour.category}</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-orange-500" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Crecimiento:</span>
          <span className="font-bold text-orange-600">
            +{trending.metadata.growthPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };
  
  const renderUserPreferences = () => {
    if (!userProfile || !userProfile.preferences) return null;
    
    const topCategories = Object.entries(userProfile.preferences.categories || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    const topTags = Object.entries(userProfile.preferences.tags || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6 border border-purple-200">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
          Tus Preferencias
        </h3>
        
        <div className="space-y-3">
          {/* Categories */}
          {topCategories.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Categorías favoritas:</p>
              <div className="flex flex-wrap gap-2">
                {topCategories.map(([category, score]) => (
                  <span key={category} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {category} ({Math.round(score * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Tags */}
          {topTags.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Intereses:</p>
              <div className="flex flex-wrap gap-1">
                {topTags.map(([tag, score]) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Behavior */}
          {userProfile.behavior_patterns && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-200">
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">
                  {(userProfile.behavior_patterns.bookingRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600">Reservas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">
                  {(userProfile.behavior_patterns.completionRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600">Completados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-600">
                  {(userProfile.behavior_patterns.explorationRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600">Exploración</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ==================== RENDER ====================
  
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tours Recomendados Para Ti
        </h1>
        <p className="text-gray-600">
          Descubre experiencias personalizadas basadas en tus intereses
        </p>
      </div>
      
      {/* User Preferences */}
      {renderUserPreferences()}
      
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('personalized')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'personalized'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Personalizados
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'trending'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Tendencia
          </button>
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'popular'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            Populares
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Filtros"
          >
            <Filter className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 text-blue-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && activeTab === 'personalized' && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Filtros y Opciones</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Algorithm Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Algoritmo de Recomendación
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {algorithms.map(algo => (
                <button
                  key={algo.value}
                  onClick={() => setSelectedAlgorithm(algo.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAlgorithm === algo.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <algo.icon className={`w-5 h-5 mx-auto mb-1 ${
                    selectedAlgorithm === algo.value ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <p className={`text-xs font-medium ${
                    selectedAlgorithm === algo.value ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {algo.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Content */}
      {activeTab === 'personalized' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Generando recomendaciones personalizadas...</p>
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay recomendaciones aún
              </h3>
              <p className="text-gray-600">
                Explora algunos tours para recibir recomendaciones personalizadas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(rec => renderTourCard(rec))}
            </div>
          )}
        </>
      )}
      
      {activeTab === 'trending' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 text-orange-800">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">
                Tours con mayor crecimiento en la última semana
              </span>
            </div>
          </div>
          {trendingTours.map(trending => renderTrendingCard(trending))}
        </div>
      )}
      
      {activeTab === 'popular' && (
        <div className="text-center py-12">
          <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Tours Populares
          </h3>
          <p className="text-gray-600">
            Próximamente: Los tours más reservados y mejor valorados
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendationsPanel;
