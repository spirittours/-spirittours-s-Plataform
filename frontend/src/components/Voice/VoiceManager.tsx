/**
 * VoiceManager - Gestión completa de voces con cloning y multi-dialectos
 * Interface para administrar voces personalizadas, clonadas y profesionales
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Play, Pause, Upload, Download, Settings,
  Volume2, VolumeX, User, Users, Briefcase, Globe,
  Heart, Star, Trash2, Edit3, Plus, Search, Filter,
  Languages, Music, Wand2, Copy, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAdvancedVoice } from '@/hooks/useAdvancedVoice';

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

interface VoiceManagerProps {
  /** Mostrar solo voces para un agente específico */
  agentType?: 'sales' | 'support' | 'booking' | 'consultant';
  /** Permitir selección de voz */
  selectionMode?: boolean;
  /** Voz seleccionada actualmente */
  selectedVoiceId?: string;
  /** Callback cuando se selecciona una voz */
  onVoiceSelect?: (voiceId: string, voiceProfile: VoiceProfile) => void;
  /** Callback cuando se clona una nueva voz */
  onVoiceCloned?: (voiceId: string) => void;
}

export const VoiceManager: React.FC<VoiceManagerProps> = ({
  agentType,
  selectionMode = false,
  selectedVoiceId,
  onVoiceSelect,
  onVoiceCloned
}) => {
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<VoiceProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile | null>(null);
  
  // Voice cloning states
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneForm, setCloneForm] = useState({
    name: '',
    description: '',
    language: 'es-ES',
    voice_type: 'personal_clone' as const,
    audio_files: [] as File[]
  });
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState(0);

  // Audio preview
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const {
    getVoices,
    cloneVoice,
    getVoicePreview,
    synthesizeVoice,
    updateVoiceSettings,
    deleteVoice,
    isLoading: voiceServiceLoading
  } = useAdvancedVoice();

  // Cargar voces al montar el componente
  useEffect(() => {
    loadVoices();
  }, []);

  // Filtrar voces cuando cambian los filtros
  useEffect(() => {
    filterVoices();
  }, [voices, searchTerm, languageFilter, typeFilter, agentType]);

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      const response = await getVoices({
        language: languageFilter !== 'all' ? languageFilter : undefined,
        voice_type: typeFilter !== 'all' ? typeFilter : undefined
      });

      if (response.success) {
        setVoices(response.voices);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterVoices = () => {
    let filtered = [...voices];

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voice.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de idioma
    if (languageFilter !== 'all') {
      filtered = filtered.filter(voice => voice.language === languageFilter);
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(voice => voice.voice_type === typeFilter);
    }

    // Filtro por agente (si se especifica)
    if (agentType) {
      // Aquí podrías implementar lógica para filtrar voces recomendadas por tipo de agente
    }

    setFilteredVoices(filtered);
  };

  // Reproducir preview de voz
  const handlePlayPreview = async (voiceId: string) => {
    try {
      if (playingVoiceId === voiceId) {
        // Pausar si ya se está reproduciendo
        if (audioElement) {
          audioElement.pause();
          setPlayingVoiceId(null);
        }
        return;
      }

      const response = await getVoicePreview(voiceId);
      
      if (response.success && response.audio_data) {
        // Convertir base64 a blob y reproducir
        const audioBlob = new Blob([
          Uint8Array.from(atob(response.audio_data), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setPlayingVoiceId(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        setAudioElement(audio);
        setPlayingVoiceId(voiceId);
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
    }
  };

  // Manejar selección de voz
  const handleVoiceSelect = (voice: VoiceProfile) => {
    if (selectionMode && onVoiceSelect) {
      onVoiceSelect(voice.voice_id, voice);
    }
    setSelectedVoice(voice);
  };

  // Clonar voz
  const handleCloneVoice = async () => {
    try {
      setIsCloning(true);
      setCloneProgress(0);

      // Simular progreso
      const progressInterval = setInterval(() => {
        setCloneProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await cloneVoice({
        name: cloneForm.name,
        description: cloneForm.description,
        language: cloneForm.language,
        voice_type: cloneForm.voice_type,
        audio_files: cloneForm.audio_files,
        created_by: 'current_user' // En producción, obtener del contexto de usuario
      });

      clearInterval(progressInterval);
      setCloneProgress(100);

      if (result.success) {
        setTimeout(() => {
          setShowCloneDialog(false);
          setIsCloning(false);
          setCloneProgress(0);
          loadVoices(); // Recargar lista
          if (onVoiceCloned) {
            onVoiceCloned(result.voice_id);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error cloning voice:', error);
      setIsCloning(false);
      setCloneProgress(0);
    }
  };

  // Renderizar icono de tipo de voz
  const renderVoiceTypeIcon = (type: string) => {
    switch (type) {
      case 'personal_clone':
        return <User className="w-4 h-4" />;
      case 'employee_clone':
        return <Users className="w-4 h-4" />;
      case 'professional':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Music className="w-4 h-4" />;
    }
  };

  // Renderizar badge de idioma
  const renderLanguageBadge = (language: string) => {
    const languageNames: Record<string, string> = {
      'es-ES': '🇪🇸 ES',
      'es-MX': '🇲🇽 MX',
      'es-AR': '🇦🇷 AR',
      'en-US': '🇺🇸 US',
      'en-GB': '🇬🇧 GB',
      'fr-FR': '🇫🇷 FR',
      'de-DE': '🇩🇪 DE',
      'it-IT': '🇮🇹 IT'
    };

    return (
      <Badge variant="outline" className="text-xs">
        {languageNames[language] || language}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Voces</h2>
          <p className="text-gray-600">
            Administra voces clonadas, profesionales y personalizadas
          </p>
        </div>
        
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Clonar Voz
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Clonar Nueva Voz</DialogTitle>
            </DialogHeader>
            
            {!isCloning ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-name">Nombre de la Voz</Label>
                  <Input
                    id="voice-name"
                    placeholder="Ej: Mi Voz Personal"
                    value={cloneForm.name}
                    onChange={(e) => setCloneForm({...cloneForm, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="voice-description">Descripción</Label>
                  <Textarea
                    id="voice-description"
                    placeholder="Describe el uso y características de esta voz"
                    value={cloneForm.description}
                    onChange={(e) => setCloneForm({...cloneForm, description: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select 
                      value={cloneForm.language} 
                      onValueChange={(value) => setCloneForm({...cloneForm, language: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es-ES">🇪🇸 Español (España)</SelectItem>
                        <SelectItem value="es-MX">🇲🇽 Español (México)</SelectItem>
                        <SelectItem value="es-AR">🇦🇷 Español (Argentina)</SelectItem>
                        <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                        <SelectItem value="en-GB">🇬🇧 English (UK)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select 
                      value={cloneForm.voice_type} 
                      onValueChange={(value) => setCloneForm({...cloneForm, voice_type: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal_clone">Personal</SelectItem>
                        <SelectItem value="employee_clone">Empleado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Archivos de Audio</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Arrastra archivos de audio aquí o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-500">
                      WAV, MP3 (30 seg - 5 min cada uno, máximo 5 archivos)
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept=".wav,.mp3,.m4a"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          setCloneForm({
                            ...cloneForm,
                            audio_files: Array.from(e.target.files)
                          });
                        }
                      }}
                    />
                  </div>
                  
                  {cloneForm.audio_files.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">Archivos seleccionados:</p>
                      {cloneForm.audio_files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm text-gray-600">{file.name}</span>
                          <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCloneVoice}
                    disabled={!cloneForm.name || !cloneForm.description || cloneForm.audio_files.length === 0}
                  >
                    Iniciar Clonado
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Wand2 className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">Clonando Voz...</h3>
                <p className="text-gray-600 mb-4">
                  Procesando {cloneForm.audio_files.length} archivos de audio
                </p>
                <Progress value={cloneProgress} className="mb-2" />
                <p className="text-sm text-gray-500">{cloneProgress}% completado</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <Badge variant="secondary">
              {filteredVoices.length} voces encontradas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar voces..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Idioma</Label>
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los idiomas</SelectItem>
                  <SelectItem value="es-ES">🇪🇸 Español (España)</SelectItem>
                  <SelectItem value="es-MX">🇲🇽 Español (México)</SelectItem>
                  <SelectItem value="es-AR">🇦🇷 Español (Argentina)</SelectItem>
                  <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                  <SelectItem value="en-GB">🇬🇧 English (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Voz</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="personal_clone">Voces Personales</SelectItem>
                  <SelectItem value="employee_clone">Voces de Empleados</SelectItem>
                  <SelectItem value="professional">Voces Profesionales</SelectItem>
                  <SelectItem value="synthetic">Voces Sintéticas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={loadVoices}
                disabled={isLoading}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                {isLoading ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de voces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVoices.map((voice) => (
          <Card 
            key={voice.voice_id} 
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              selectionMode && selectedVoiceId === voice.voice_id && 'ring-2 ring-blue-500',
              selectedVoice?.voice_id === voice.voice_id && 'bg-blue-50'
            )}
            onClick={() => handleVoiceSelect(voice)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {renderVoiceTypeIcon(voice.voice_type)}
                  <CardTitle className="text-lg">{voice.name}</CardTitle>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePlayPreview(voice.voice_id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Reproducir Preview
                    </DropdownMenuItem>
                    {voice.voice_type.includes('clone') && (
                      <>
                        <DropdownMenuItem>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Editar Configuraciones
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <CardDescription className="line-clamp-2">
                {voice.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Badges de información */}
              <div className="flex flex-wrap gap-2">
                {renderLanguageBadge(voice.language)}
                <Badge 
                  variant={voice.voice_type === 'professional' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {voice.voice_type.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {voice.gender}
                </Badge>
              </div>
              
              {/* Métricas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Uso</p>
                  <p className="font-medium">{voice.usage_count} veces</p>
                </div>
                <div>
                  <p className="text-gray-500">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{voice.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              
              {/* Configuraciones de voz */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Tono Emocional:</span>
                  <Badge variant="outline" className="text-xs">
                    {voice.emotional_tone}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Estilo:</span>
                  <Badge variant="outline" className="text-xs">
                    {voice.speaking_style}
                  </Badge>
                </div>
              </div>
              
              {/* Controles */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(voice.voice_id);
                  }}
                >
                  {playingVoiceId === voice.voice_id ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {playingVoiceId === voice.voice_id ? 'Pausar' : 'Preview'}
                </Button>
                
                {selectionMode && (
                  <Button 
                    size="sm"
                    variant={selectedVoiceId === voice.voice_id ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceSelect(voice);
                    }}
                  >
                    {selectedVoiceId === voice.voice_id ? 'Seleccionada' : 'Seleccionar'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado de carga */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando voces...</p>
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && filteredVoices.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron voces</h3>
            <p className="text-gray-600 mb-4">
              Prueba ajustando los filtros o clona tu primera voz personal
            </p>
            <Button onClick={() => setShowCloneDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Clonar Mi Primera Voz
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceManager;