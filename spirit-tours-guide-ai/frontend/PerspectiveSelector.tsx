/**
 * Perspective Selector Component
 * Selector dinámico de perspectivas religiosas/culturales
 * para puntos de interés
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Perspective {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Explanation {
  content: string;
  short?: string;
  full?: string;
  references?: string[];
}

interface PerspectiveData {
  poi: {
    id: string;
    name: string;
    location: { lat: number; lng: number };
  };
  perspective: Perspective;
  explanation: Explanation;
  media?: {
    images?: string[];
    audio?: string[];
    video?: string[];
  };
  aiMetadata?: {
    model: string;
    tokens: number;
    cost: number;
    responseTime: number;
  };
  source: 'database' | 'ai' | 'cache';
}

interface Props {
  poiId: string;
  availablePerspectives: string[];
  defaultPerspective?: string;
  language?: string;
  useAI?: boolean;
  apiUrl?: string;
  onPerspectiveChange?: (perspective: string, data: PerspectiveData) => void;
  showAudioPlayer?: boolean;
  showSocialShare?: boolean;
}

export const PerspectiveSelector: React.FC<Props> = ({
  poiId,
  availablePerspectives,
  defaultPerspective = 'historical',
  language = 'es',
  useAI = false,
  apiUrl = 'http://localhost:3001/api',
  onPerspectiveChange,
  showAudioPlayer = true,
  showSocialShare = true
}) => {
  const [selectedPerspective, setSelectedPerspective] = useState<string>(defaultPerspective);
  const [perspectiveData, setPerspectiveData] = useState<PerspectiveData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [showFullExplanation, setShowFullExplanation] = useState<boolean>(false);

  // Iconos y colores por perspectiva
  const perspectiveIcons: Record<string, { icon: string; color: string; name: string }> = {
    islamic: { icon: '🕌', color: '#00A86B', name: 'Islámica' },
    jewish: { icon: '✡️', color: '#0038B8', name: 'Judía' },
    christian: { icon: '✝️', color: '#FFA500', name: 'Cristiana' },
    historical: { icon: '🏛️', color: '#8B4513', name: 'Histórica' },
    cultural: { icon: '🌐', color: '#4B0082', name: 'Cultural' },
    archaeological: { icon: '⚱️', color: '#D2691E', name: 'Arqueológica' }
  };

  // Cargar datos de perspectiva al cambiar selección
  useEffect(() => {
    loadPerspectiveData(selectedPerspective);
  }, [selectedPerspective, poiId]);

  const loadPerspectiveData = async (perspective: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${apiUrl}/perspectives/${poiId}/${perspective}`,
        {
          params: {
            language,
            useAI,
            length: 'medium'
          }
        }
      );

      const data = response.data;
      setPerspectiveData(data);
      onPerspectiveChange?.(perspective, data);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la explicación');
      console.error('Error loading perspective:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePerspectiveClick = (perspective: string) => {
    setSelectedPerspective(perspective);
    setShowFullExplanation(false);
    setAudioPlaying(false);
  };

  const handlePlayAudio = () => {
    // Integrar con servicio de text-to-speech
    setAudioPlaying(!audioPlaying);
  };

  const handleShare = (platform: string) => {
    if (!perspectiveData) return;

    const shareText = `Descubre ${perspectiveData.poi.name} desde la perspectiva ${perspectiveData.perspective.name} con Spirit Tours`;
    const shareUrl = window.location.href;

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="perspective-selector bg-white rounded-lg shadow-2xl p-6 max-w-4xl mx-auto">
      {/* Título */}
      {perspectiveData && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {perspectiveData.poi.name}
          </h2>
          <p className="text-sm text-gray-600">
            Explora diferentes perspectivas culturales y religiosas
          </p>
        </div>
      )}

      {/* Selector de perspectivas */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Selecciona una perspectiva:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {availablePerspectives.map(perspective => {
            const info = perspectiveIcons[perspective];
            if (!info) return null;

            const isSelected = perspective === selectedPerspective;

            return (
              <button
                key={perspective}
                onClick={() => handlePerspectiveClick(perspective)}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-lg
                  transition-all duration-300 transform hover:scale-105
                  ${isSelected 
                    ? 'ring-4 ring-offset-2 shadow-xl' 
                    : 'hover:shadow-lg border-2 border-gray-200'
                  }
                `}
                style={{
                  backgroundColor: isSelected ? info.color + '20' : 'white',
                  borderColor: isSelected ? info.color : undefined,
                  ringColor: isSelected ? info.color : undefined
                }}
              >
                <span className="text-4xl mb-2">{info.icon}</span>
                <span 
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-gray-900' : 'text-gray-600'
                  }`}
                >
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Cargando explicación...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Contenido de la perspectiva */}
      {!loading && perspectiveData && (
        <div className="perspective-content">
          {/* Header de la perspectiva seleccionada */}
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ 
              backgroundColor: perspectiveIcons[selectedPerspective]?.color + '15',
              borderLeft: `4px solid ${perspectiveIcons[selectedPerspective]?.color}`
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-5xl">
                {perspectiveIcons[selectedPerspective]?.icon}
              </span>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Perspectiva {perspectiveIcons[selectedPerspective]?.name}
                </h3>
                {perspectiveData.source === 'ai' && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      🤖 Generado con IA
                    </span>
                    <span>Modelo: {perspectiveData.aiMetadata?.model}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controles de audio y vista */}
          <div className="flex gap-2 mb-4">
            {showAudioPlayer && (
              <button
                onClick={handlePlayAudio}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <span>{audioPlaying ? '⏸️' : '▶️'}</span>
                <span>{audioPlaying ? 'Pausar' : 'Escuchar'} audio</span>
              </button>
            )}

            <button
              onClick={() => setShowFullExplanation(!showFullExplanation)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <span>{showFullExplanation ? '📖' : '📄'}</span>
              <span>{showFullExplanation ? 'Ver resumen' : 'Ver completo'}</span>
            </button>
          </div>

          {/* Explicación */}
          <div className="prose max-w-none mb-6">
            {showFullExplanation ? (
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {perspectiveData.explanation.full || perspectiveData.explanation.content}
              </div>
            ) : (
              <div className="text-gray-700 leading-relaxed">
                {perspectiveData.explanation.short || 
                 perspectiveData.explanation.content?.substring(0, 300) + '...'}
              </div>
            )}
          </div>

          {/* Referencias */}
          {perspectiveData.explanation.references && 
           perspectiveData.explanation.references.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                📚 Referencias:
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {perspectiveData.explanation.references.map((ref, idx) => (
                  <li key={idx}>{ref}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Media gallery */}
          {perspectiveData.media && (perspectiveData.media.images?.length || 0) > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                🖼️ Galería de imágenes:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {perspectiveData.media.images?.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`${perspectiveData.poi.name} - ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition cursor-pointer"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Social share */}
          {showSocialShare && (
            <div className="border-t pt-6">
              <div className="text-center mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">
                  ¿Te gustó esta explicación? ¡Compártela!
                </h4>
                <p className="text-sm text-gray-600">
                  Ayúdanos a llegar a más personas compartiendo en redes sociales
                </p>
              </div>

              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => handleShare('facebook')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>📘</span>
                  <span>Facebook</span>
                </button>

                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>🐦</span>
                  <span>Twitter</span>
                </button>

                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleShare('telegram')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0088CC] text-white rounded-lg hover:opacity-90 transition"
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  ⭐ También puedes seguirnos en nuestras redes sociales y dar like a nuestras publicaciones
                </p>
              </div>
            </div>
          )}

          {/* Metadata de IA */}
          {perspectiveData.source === 'ai' && perspectiveData.aiMetadata && (
            <div className="mt-6 p-3 bg-purple-50 rounded-lg text-xs text-gray-600">
              <p className="font-semibold mb-1">ℹ️ Información técnica:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <span className="font-medium">Modelo:</span> {perspectiveData.aiMetadata.model}
                </div>
                <div>
                  <span className="font-medium">Tokens:</span> {perspectiveData.aiMetadata.tokens}
                </div>
                <div>
                  <span className="font-medium">Costo:</span> ${perspectiveData.aiMetadata.cost.toFixed(4)}
                </div>
                <div>
                  <span className="font-medium">Tiempo:</span> {perspectiveData.aiMetadata.responseTime}ms
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call to action final */}
      {!loading && perspectiveData && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
          <h4 className="text-lg font-bold text-gray-800 mb-2">
            🌟 ¡Gracias por ser parte de nuestra familia!
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Tu apoyo nos ayuda a seguir mejorando. Dale like, comparte y síguenos en redes sociales.
          </p>
          <div className="flex justify-center gap-2">
            <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition">
              ❤️ Dar Like
            </button>
            <button className="px-6 py-2 bg-white text-gray-700 rounded-full font-semibold border-2 border-gray-300 hover:border-blue-500 transition">
              ➕ Seguir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerspectiveSelector;
