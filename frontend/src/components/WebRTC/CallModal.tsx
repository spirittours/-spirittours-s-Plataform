/**
 * CallModal - Modal de control de llamadas WebRTC
 * Interface completa para gestionar llamadas con AI Voice Agents
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  User,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CallModalProps {
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Estado actual de la llamada */
  callStatus: 'idle' | 'connecting' | 'connected' | 'on_hold' | 'ended' | 'failed';
  /** Agente IA actual */
  currentAgent?: {
    type: 'sales' | 'support' | 'booking' | 'consultant';
    id?: string;
    name?: string;
    avatar?: string;
  };
  /** Callback para finalizar llamada */
  onEndCall: () => void;
  /** Datos del cliente */
  customerData?: {
    name?: string;
    email?: string;
    language?: string;
    location?: string;
  };
  /** Callback para transferir a otro agente */
  onTransferAgent?: (newAgentType: string) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  callStatus,
  currentAgent,
  onEndCall,
  customerData,
  onTransferAgent
}) => {
  // Estados de audio
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [volume, setVolume] = useState([75]);
  
  // Estados de UI
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  
  // Estados de conversación
  const [transcript, setTranscript] = useState<Array<{
    id: string;
    speaker: 'user' | 'agent';
    text: string;
    timestamp: Date;
  }>>([]);

  // Timer para duración de llamada
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  // Formatear duración de llamada
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Información del agente
  const getAgentInfo = (agentType?: string) => {
    const agents = {
      sales: {
        name: 'Especialista en Ventas',
        description: 'Experto en recomendaciones de tours y reservas',
        avatar: '👨‍💼',
        color: 'bg-blue-500'
      },
      support: {
        name: 'Soporte al Cliente',
        description: 'Asistencia con reservas y consultas',
        avatar: '👩‍💻',
        color: 'bg-green-500'
      },
      booking: {
        name: 'Asistente de Reservas',
        description: 'Gestión de reservas y modificaciones',
        avatar: '📅',
        color: 'bg-purple-500'
      },
      consultant: {
        name: 'Consultor de Viajes',
        description: 'Asesoría personalizada para tu viaje',
        avatar: '🗺️',
        color: 'bg-orange-500'
      }
    };

    return agents[agentType as keyof typeof agents] || agents.sales;
  };

  const agentInfo = getAgentInfo(currentAgent?.type);

  // Manejar mute/unmute
  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    // Aquí integrarías con la API de WebRTC para mute real
  }, [isMuted]);

  // Manejar altavoz
  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerOn(!isSpeakerOn);
    // Aquí integrarías con la API de audio
  }, [isSpeakerOn]);

  // Manejar finalización de llamada
  const handleEndCall = useCallback(() => {
    onEndCall();
    setCallDuration(0);
    setTranscript([]);
    onClose();
  }, [onEndCall, onClose]);

  // Indicador de calidad de conexión
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-1">
      {connectionQuality === 'excellent' && <Wifi className="w-4 h-4 text-green-500" />}
      {connectionQuality === 'good' && <Wifi className="w-4 h-4 text-yellow-500" />}
      {connectionQuality === 'poor' && <WifiOff className="w-4 h-4 text-red-500" />}
      <span className="text-xs capitalize">{connectionQuality}</span>
    </div>
  );

  // Contenido del modal según el estado
  const renderContent = () => {
    switch (callStatus) {
      case 'connecting':
        return (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className={cn('w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl', agentInfo.color)}>
                {agentInfo.avatar}
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Conectando...</h3>
            <p className="text-gray-600">Asignando {agentInfo.name}</p>
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        );

      case 'connected':
        return (
          <div className="space-y-6">
            {/* Header de agente */}
            <div className="flex items-center gap-4">
              <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-xl text-white', agentInfo.color)}>
                {agentInfo.avatar}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{agentInfo.name}</h3>
                <p className="text-sm text-gray-600">{agentInfo.description}</p>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600">En línea</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatCallDuration(callDuration)}
                  </div>
                  <ConnectionIndicator />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Controles de audio */}
            <div className="flex items-center justify-center gap-6 py-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={handleToggleMute}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>

              <Button
                variant={isSpeakerOn ? "default" : "outline"}
                size="lg"
                className="rounded-full w-14 h-14"
                onClick={handleToggleSpeaker}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </Button>
            </div>

            {/* Control de volumen */}
            <div className="px-4">
              <div className="flex items-center gap-3">
                <VolumeX className="w-4 h-4 text-gray-400" />
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Volume2 className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 w-8">{volume[0]}%</span>
              </div>
            </div>

            {/* Acciones adicionales */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Transcripción
              </Button>
              
              {onTransferAgent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Transferir
                </Button>
              )}
            </div>

            {/* Transcripción expandida */}
            {isExpanded && showTranscript && (
              <Card className="p-4 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2">Transcripción en tiempo real</h4>
                {transcript.length > 0 ? (
                  <div className="space-y-1">
                    {transcript.map((entry) => (
                      <div key={entry.id} className="text-sm">
                        <span className={cn(
                          'font-medium',
                          entry.speaker === 'user' ? 'text-blue-600' : 'text-green-600'
                        )}>
                          {entry.speaker === 'user' ? 'Tú' : 'Agente'}:
                        </span>
                        <span className="ml-2">{entry.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">La conversación aparecerá aquí...</p>
                )}
              </Card>
            )}
          </div>
        );

      case 'ended':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <PhoneOff className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Llamada finalizada</h3>
            <p className="text-gray-600 mb-2">Duración: {formatCallDuration(callDuration)}</p>
            <p className="text-sm text-gray-500 mb-6">
              Gracias por contactar con {agentInfo.name}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              <Button onClick={() => {/* Nueva llamada */}} className="flex-1">
                Llamar de nuevo
              </Button>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Llamada falló</h3>
            <p className="text-gray-600 mb-6">
              No pudimos establecer la conexión. Por favor, intenta de nuevo.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              <Button onClick={() => {/* Reintentar */}} className="flex-1">
                Reintentar
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        'sm:max-w-md',
        isExpanded && 'sm:max-w-lg'
      )}>
        <DialogHeader>
          <DialogTitle className="sr-only">
            Llamada con {agentInfo.name}
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
        
        {/* Badge de estado en la esquina */}
        {callStatus && (
          <Badge 
            className="absolute top-2 right-2"
            variant={callStatus === 'connected' ? 'default' : 'secondary'}
          >
            {callStatus === 'connected' && '🔊 '}
            {callStatus}
          </Badge>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;