/**
 * CallNowButton - Botón "Llamar Ahora" con integración WebRTC
 * Permite llamadas directas a AI Voice Agents desde cualquier página
 */

import React, { useState, useCallback } from 'react';
import { Phone, PhoneCall, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CallModal } from './CallModal';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CallNowButtonProps {
  /** Tipo de agente IA preferido */
  preferredAgent?: 'sales' | 'support' | 'booking' | 'consultant';
  /** Datos del cliente para personalización */
  customerData?: {
    name?: string;
    email?: string;
    language?: string;
    location?: string;
    tourInterest?: string;
  };
  /** Estilo del botón */
  variant?: 'default' | 'outline' | 'ghost' | 'floating';
  /** Tamaño del botón */
  size?: 'sm' | 'md' | 'lg';
  /** Texto personalizado del botón */
  buttonText?: string;
  /** Clase CSS adicional */
  className?: string;
  /** Callback cuando se inicia una llamada */
  onCallStart?: () => void;
  /** Callback cuando termina una llamada */
  onCallEnd?: (duration: number) => void;
  /** Mostrar estado de agentes disponibles */
  showAgentStatus?: boolean;
}

export const CallNowButton: React.FC<CallNowButtonProps> = ({
  preferredAgent = 'sales',
  customerData = {},
  variant = 'default',
  size = 'md',
  buttonText,
  className,
  onCallStart,
  onCallEnd,
  showAgentStatus = false
}) => {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'offline'>('available');
  
  const {
    isConnected,
    callStatus,
    currentAgent,
    connectionStatus,
    startCall,
    endCall,
    isLoading
  } = useWebRTC({
    onCallStart,
    onCallEnd,
    onAgentAssigned: (agent) => {
      console.log('🤖 AI Agent assigned:', agent);
    }
  });

  // Determinar el texto del botón basado en el estado
  const getButtonText = () => {
    if (buttonText) return buttonText;
    
    switch (callStatus) {
      case 'connecting':
        return 'Conectando...';
      case 'connected':
        return 'En llamada';
      case 'ended':
        return 'Llamada finalizada';
      default:
        return '📞 Llamar Ahora';
    }
  };

  // Determinar el icono basado en el estado
  const getButtonIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    switch (callStatus) {
      case 'connected':
        return <PhoneCall className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  // Manejar clic del botón
  const handleCallClick = useCallback(async () => {
    if (callStatus === 'connected') {
      // Si ya hay una llamada, abrir modal de control
      setIsCallModalOpen(true);
    } else {
      // Iniciar nueva llamada
      try {
        await startCall({
          agentType: preferredAgent,
          customerData: {
            ...customerData,
            timestamp: new Date().toISOString(),
            source: 'call_now_button'
          }
        });
        setIsCallModalOpen(true);
      } catch (error) {
        console.error('❌ Error starting call:', error);
        // Aquí podrías mostrar un toast de error
      }
    }
  }, [callStatus, startCall, preferredAgent, customerData]);

  // Variantes de estilo
  const buttonVariants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
    floating: 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200'
  };

  const sizeVariants = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Determinar el agente actual o preferido
  const displayAgent = currentAgent || preferredAgent;
  const agentInfo = {
    sales: { name: 'Ventas', color: 'bg-blue-100 text-blue-800' },
    support: { name: 'Soporte', color: 'bg-green-100 text-green-800' },
    booking: { name: 'Reservas', color: 'bg-purple-100 text-purple-800' },
    consultant: { name: 'Consultor', color: 'bg-orange-100 text-orange-800' }
  };

  return (
    <>
      <div className={cn('relative inline-flex flex-col items-center', className)}>
        {/* Botón principal */}
        <Button
          onClick={handleCallClick}
          disabled={isLoading || connectionStatus === 'disconnected'}
          className={cn(
            buttonVariants[variant],
            sizeVariants[size],
            'relative transition-all duration-200',
            {
              'animate-pulse': callStatus === 'connecting',
              'ring-2 ring-green-400 ring-opacity-50': callStatus === 'connected',
              'opacity-50 cursor-not-allowed': isLoading || connectionStatus === 'disconnected'
            }
          )}
        >
          <div className="flex items-center gap-2">
            {getButtonIcon()}
            <span>{getButtonText()}</span>
          </div>
          
          {/* Indicador de llamada activa */}
          {callStatus === 'connected' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
          )}
        </Button>

        {/* Badge de agente (opcional) */}
        {showAgentStatus && displayAgent && (
          <Badge 
            variant="secondary" 
            className={cn(
              'mt-1 text-xs',
              agentInfo[displayAgent]?.color
            )}
          >
            {agentInfo[displayAgent]?.name}
          </Badge>
        )}

        {/* Indicador de estado de conexión */}
        {connectionStatus === 'disconnected' && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <Badge variant="destructive" className="text-xs">
              Sin conexión
            </Badge>
          </div>
        )}
      </div>

      {/* Modal de llamada */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        callStatus={callStatus}
        currentAgent={currentAgent}
        onEndCall={endCall}
        customerData={customerData}
      />
    </>
  );
};

// Componente especializado para botón flotante
export const FloatingCallButton: React.FC<Omit<CallNowButtonProps, 'variant'>> = (props) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <CallNowButton
        {...props}
        variant="floating"
        size="lg"
        className="rounded-full shadow-2xl"
      />
    </div>
  );
};

// Componente inline para páginas de tours
export const InlineCallButton: React.FC<CallNowButtonProps> = (props) => {
  return (
    <CallNowButton
      {...props}
      variant="default"
      size="md"
      showAgentStatus
      className="w-full sm:w-auto"
    />
  );
};

// Componente para header/navbar
export const HeaderCallButton: React.FC<CallNowButtonProps> = (props) => {
  return (
    <CallNowButton
      {...props}
      variant="outline"
      size="sm"
      buttonText="💬 Hablar con Experto"
      className="hidden sm:inline-flex"
    />
  );
};

export default CallNowButton;