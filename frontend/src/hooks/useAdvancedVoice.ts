/**
 * useAdvancedVoice - Hook personalizado para gestión avanzada de voces
 * Maneja cloning, síntesis, multi-dialectos y personalización
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types
interface VoiceProfile {
  voice_id: string;
  name: string;
  description: string;
  voice_type: 'personal_clone' | 'employee_clone' | 'professional' | 'synthetic';
  language: string;
  gender: 'male' | 'female' | 'neutral';
  emotional_tone: string;
  speaking_style: string;
  provider: string;
  usage_count: number;
  rating: number;
  created_at: string;
  created_by?: string;
}

interface VoiceCloningRequest {
  name: string;
  description: string;
  language: string;
  voice_type: 'personal_clone' | 'employee_clone';
  audio_files: File[];
  created_by: string;
}

interface VoiceSynthesisRequest {
  text: string;
  voice_id: string;
  language?: string;
  emotional_tone?: string;
  speaking_style?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

interface VoiceFilters {
  language?: string;
  voice_type?: string;
  gender?: string;
  search?: string;
}

interface AdvancedVoiceStats {
  total_voices: number;
  cloned_voices: number;
  professional_voices: number;
  languages_supported: number;
  providers_active: number;
}

export const useAdvancedVoice = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [currentVoice, setCurrentVoice] = useState<VoiceProfile | null>(null);
  const [stats, setStats] = useState<AdvancedVoiceStats | null>(null);

  const API_BASE = '/api/v1/advanced-voice';

  // ============== HELPER FUNCTIONS ==============

  const handleApiError = (error: any, defaultMessage: string) => {
    const message = error?.response?.data?.detail || error?.message || defaultMessage;
    toast.error(message);
    console.error('Advanced Voice API Error:', error);
    return { success: false, error: message };
  };

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      return { success: true, ...data };
    } catch (error) {
      throw error;
    }
  };

  // ============== VOICE MANAGEMENT ==============

  const getVoices = useCallback(async (filters: VoiceFilters = {}) => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (filters.language) queryParams.append('language', filters.language);
      if (filters.voice_type) queryParams.append('voice_type', filters.voice_type);
      if (filters.gender) queryParams.append('gender', filters.gender);
      if (filters.search) queryParams.append('search', filters.search);

      const result = await makeApiCall(`/voices?${queryParams.toString()}`);
      
      if (result.success) {
        setVoices(result.voices || []);
        setStats({
          total_voices: result.total_voices || 0,
          cloned_voices: result.statistics?.by_type?.personal_clones + result.statistics?.by_type?.employee_clones || 0,
          professional_voices: result.statistics?.by_type?.professional_voices || 0,
          languages_supported: Object.keys(result.statistics?.by_language || {}).length,
          providers_active: 2 // ElevenLabs + OpenAI por defecto
        });
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error cargando voces');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVoiceDetails = useCallback(async (voiceId: string) => {
    try {
      const result = await makeApiCall(`/voices/${voiceId}`);
      
      if (result.success) {
        setCurrentVoice(result.voice_profile);
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Error obteniendo detalles de voz');
    }
  }, []);

  const getVoiceRecommendations = useCallback(async (
    agentType: 'sales' | 'support' | 'booking' | 'consultant',
    customerLanguage?: string
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (customerLanguage) queryParams.append('customer_language', customerLanguage);

      const result = await makeApiCall(`/recommendations/${agentType}?${queryParams.toString()}`);
      return result;
    } catch (error) {
      return handleApiError(error, 'Error obteniendo recomendaciones');
    }
  }, []);

  // ============== VOICE CLONING ==============

  const cloneVoice = useCallback(async (request: VoiceCloningRequest) => {
    try {
      setIsLoading(true);
      
      // Preparar FormData
      const formData = new FormData();
      formData.append('name', request.name);
      formData.append('description', request.description);
      formData.append('language', request.language);
      formData.append('voice_type', request.voice_type);
      formData.append('created_by', request.created_by);

      // Agregar archivos de audio
      request.audio_files.forEach((file, index) => {
        formData.append('audio_files', file);
      });

      const response = await fetch(`${API_BASE}/clone-voice`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      toast.success(`Clonado iniciado para "${request.name}". El proceso puede tardar unos minutos.`);
      
      return { success: true, ...data };
    } catch (error) {
      return handleApiError(error, 'Error clonando voz');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCloneStatus = useCallback(async (voiceId: string) => {
    try {
      const result = await makeApiCall(`/clone-status/${voiceId}`);
      return result;
    } catch (error) {
      return handleApiError(error, 'Error obteniendo estado de clonado');
    }
  }, []);

  // ============== VOICE SYNTHESIS ==============

  const synthesizeVoice = useCallback(async (request: VoiceSynthesisRequest) => {
    try {
      setIsLoading(true);

      const result = await makeApiCall('/synthesize', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (result.success) {
        toast.success('Audio sintetizado exitosamente');
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error sintetizando voz');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const synthesizeBulk = useCallback(async (
    texts: string[],
    voiceId: string,
    options: Partial<VoiceSynthesisRequest> = {}
  ) => {
    try {
      const request = {
        texts,
        voice_id: voiceId,
        ...options
      };

      const result = await makeApiCall('/synthesize-bulk', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (result.success) {
        toast.success(`Procesando síntesis de ${texts.length} textos en lote`);
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error en síntesis masiva');
    }
  }, []);

  const getVoicePreview = useCallback(async (voiceId: string, sampleText?: string) => {
    try {
      const request = {
        voice_id: voiceId,
        sample_text: sampleText
      };

      const result = await makeApiCall('/preview', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      return result;
    } catch (error) {
      return handleApiError(error, 'Error generando preview');
    }
  }, []);

  // ============== VOICE SETTINGS ==============

  const updateVoiceSettings = useCallback(async (voiceId: string, settings: Record<string, any>) => {
    try {
      const result = await makeApiCall(`/voices/${voiceId}`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (result.success) {
        toast.success('Configuraciones actualizadas');
        // Actualizar voz en el estado local si es la actual
        if (currentVoice?.voice_id === voiceId) {
          setCurrentVoice(prev => prev ? { ...prev, ...settings } : null);
        }
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error actualizando configuraciones');
    }
  }, [currentVoice]);

  const deleteVoice = useCallback(async (voiceId: string) => {
    try {
      const result = await makeApiCall(`/voices/${voiceId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        toast.success('Voz eliminada exitosamente');
        // Remover de la lista local
        setVoices(prev => prev.filter(voice => voice.voice_id !== voiceId));
        // Limpiar voz actual si era la eliminada
        if (currentVoice?.voice_id === voiceId) {
          setCurrentVoice(null);
        }
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error eliminando voz');
    }
  }, [currentVoice]);

  // ============== ANALYSIS & INSIGHTS ==============

  const getLanguageAnalysis = useCallback(async () => {
    try {
      const result = await makeApiCall('/analysis/languages');
      return result;
    } catch (error) {
      return handleApiError(error, 'Error obteniendo análisis de idiomas');
    }
  }, []);

  const getServiceStats = useCallback(async () => {
    try {
      const result = await makeApiCall('/status');
      
      if (result.success && result.service_info) {
        setStats({
          total_voices: result.service_info.voice_stats?.total_voices || 0,
          cloned_voices: result.service_info.voice_stats?.cloned_voices || 0,
          professional_voices: result.service_info.voice_stats?.professional_voices || 0,
          languages_supported: result.service_info.voice_stats?.languages_supported || 0,
          providers_active: result.service_info.voice_stats?.providers_active || 0
        });
      }

      return result;
    } catch (error) {
      return handleApiError(error, 'Error obteniendo estadísticas');
    }
  }, []);

  // ============== VOICE UTILITIES ==============

  const playAudioFromBase64 = useCallback((audioBase64: string, format: string = 'mp3'): HTMLAudioElement => {
    try {
      // Convertir base64 a blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: `audio/${format}` });
      
      // Crear URL y reproducir
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Limpiar URL cuando termine
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
      
      return audio;
    } catch (error) {
      console.error('Error playing audio from base64:', error);
      throw error;
    }
  }, []);

  const downloadAudioFromBase64 = useCallback((
    audioBase64: string, 
    filename: string, 
    format: string = 'mp3'
  ) => {
    try {
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: `audio/${format}` });
      
      // Crear enlace de descarga
      const url = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Audio descargado exitosamente');
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast.error('Error descargando audio');
    }
  }, []);

  // ============== VOICE PRESETS ==============

  const getVoicePresets = useCallback(() => {
    return {
      emotional_tones: [
        { value: 'neutral', label: 'Neutral', description: 'Tono equilibrado y profesional' },
        { value: 'friendly', label: 'Amigable', description: 'Cálido y acogedor' },
        { value: 'professional', label: 'Profesional', description: 'Serio y competente' },
        { value: 'enthusiastic', label: 'Entusiasta', description: 'Energético y motivador' },
        { value: 'calm', label: 'Tranquilo', description: 'Relajado y sereno' },
        { value: 'confident', label: 'Confiado', description: 'Seguro y autoritario' },
        { value: 'warm', label: 'Cálido', description: 'Acogedor y empático' },
        { value: 'empathetic', label: 'Empático', description: 'Comprensivo y solidario' }
      ],
      speaking_styles: [
        { value: 'conversational', label: 'Conversacional', description: 'Natural y espontáneo' },
        { value: 'formal', label: 'Formal', description: 'Estructurado y protocolar' },
        { value: 'casual', label: 'Casual', description: 'Relajado e informal' },
        { value: 'sales', label: 'Ventas', description: 'Persuasivo y convincente' },
        { value: 'customer_service', label: 'Atención al Cliente', description: 'Servicial y paciente' },
        { value: 'educational', label: 'Educativo', description: 'Claro y didáctico' },
        { value: 'presentation', label: 'Presentación', description: 'Estructurado y claro' }
      ],
      languages: [
        { value: 'es-ES', label: '🇪🇸 Español (España)', flag: '🇪🇸' },
        { value: 'es-MX', label: '🇲🇽 Español (México)', flag: '🇲🇽' },
        { value: 'es-AR', label: '🇦🇷 Español (Argentina)', flag: '🇦🇷' },
        { value: 'es-CL', label: '🇨🇱 Español (Chile)', flag: '🇨🇱' },
        { value: 'es-CO', label: '🇨🇴 Español (Colombia)', flag: '🇨🇴' },
        { value: 'es-PE', label: '🇵🇪 Español (Perú)', flag: '🇵🇪' },
        { value: 'en-US', label: '🇺🇸 English (United States)', flag: '🇺🇸' },
        { value: 'en-GB', label: '🇬🇧 English (United Kingdom)', flag: '🇬🇧' },
        { value: 'en-AU', label: '🇦🇺 English (Australia)', flag: '🇦🇺' },
        { value: 'en-CA', label: '🇨🇦 English (Canada)', flag: '🇨🇦' },
        { value: 'fr-FR', label: '🇫🇷 Français (France)', flag: '🇫🇷' },
        { value: 'fr-CA', label: '🇫🇷 Français (Canada)', flag: '🇫🇷' },
        { value: 'de-DE', label: '🇩🇪 Deutsch (Deutschland)', flag: '🇩🇪' },
        { value: 'it-IT', label: '🇮🇹 Italiano (Italia)', flag: '🇮🇹' },
        { value: 'pt-BR', label: '🇧🇷 Português (Brasil)', flag: '🇧🇷' },
        { value: 'pt-PT', label: '🇵🇹 Português (Portugal)', flag: '🇵🇹' }
      ]
    };
  }, []);

  // ============== INITIALIZATION ==============

  useEffect(() => {
    // Cargar estadísticas iniciales
    getServiceStats();
  }, [getServiceStats]);

  // ============== PUBLIC API ==============

  return {
    // Estado
    isLoading,
    voices,
    currentVoice,
    stats,

    // Gestión de voces
    getVoices,
    getVoiceDetails,
    getVoiceRecommendations,

    // Clonado de voces
    cloneVoice,
    getCloneStatus,

    // Síntesis de voz
    synthesizeVoice,
    synthesizeBulk,
    getVoicePreview,

    // Configuraciones
    updateVoiceSettings,
    deleteVoice,

    // Análisis
    getLanguageAnalysis,
    getServiceStats,

    // Utilidades
    playAudioFromBase64,
    downloadAudioFromBase64,
    getVoicePresets,

    // Setters (para uso externo)
    setCurrentVoice,
    setVoices
  };
};

export default useAdvancedVoice;