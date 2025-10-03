/**
 * useWebRTC - Hook personalizado para gestión de llamadas WebRTC
 * Maneja la conexión completa con AI Voice Agents
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'on_hold' | 'ended' | 'failed';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type AgentType = 'sales' | 'support' | 'booking' | 'consultant';

interface Agent {
  type: AgentType;
  id?: string;
  name?: string;
  avatar?: string;
}

interface CallOptions {
  agentType: AgentType;
  customerData?: Record<string, any>;
}

interface UseWebRTCOptions {
  /** Callback cuando inicia una llamada */
  onCallStart?: () => void;
  /** Callback cuando termina una llamada */
  onCallEnd?: (duration: number) => void;
  /** Callback cuando se asigna un agente */
  onAgentAssigned?: (agent: Agent) => void;
  /** Callback para errores */
  onError?: (error: string) => void;
  /** URL del servidor WebSocket (opcional) */
  websocketUrl?: string;
}

interface WebRTCMessage {
  type: string;
  session_id?: string;
  client_id?: string;
  payload?: Record<string, any>;
  timestamp?: string;
}

export const useWebRTC = (options: UseWebRTCOptions = {}) => {
  // Estados principales
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Referencias
  const websocketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Configuración WebSocket
  const websocketUrl = options.websocketUrl || 'ws://localhost:8765';

  // Configuración WebRTC
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // ============== WEBSOCKET CONNECTION ==============

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const ws = new WebSocket(websocketUrl);
      
      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setConnectionStatus('connected');
        toast.success('Conectado al servicio de llamadas');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebRTCMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        if (!event.wasClean) {
          toast.error('Conexión perdida. Reintentando...');
          // Reconectar automáticamente
          setTimeout(connectWebSocket, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('disconnected');
        options.onError?.('Error de conexión WebSocket');
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('❌ Error connecting WebSocket:', error);
      setConnectionStatus('disconnected');
      options.onError?.('No se pudo conectar al servicio de llamadas');
    }
  }, [websocketUrl, options]);

  // ============== MESSAGE HANDLERS ==============

  const handleWebSocketMessage = useCallback((message: WebRTCMessage) => {
    console.log('📨 WebSocket message received:', message.type);

    switch (message.type) {
      case 'agent_assigned':
        handleAgentAssigned(message);
        break;
      
      case 'answer':
        handleWebRTCAnswer(message);
        break;
      
      case 'ice_candidate':
        handleICECandidate(message);
        break;
      
      case 'call_accepted':
        setCallStatus('connected');
        break;
      
      case 'call_rejected':
        setCallStatus('failed');
        toast.error('Llamada rechazada');
        break;
      
      case 'call_ended':
        handleCallEnded();
        break;
      
      case 'audio_data':
        handleAudioData(message);
        break;
      
      case 'status_update':
        console.log('📊 Status update:', message.payload);
        break;
      
      case 'error':
        console.error('❌ Server error:', message.payload?.error);
        options.onError?.(message.payload?.error || 'Error del servidor');
        break;
      
      default:
        console.log('⚠️ Unknown message type:', message.type);
    }
  }, [options]);

  const handleAgentAssigned = useCallback((message: WebRTCMessage) => {
    const agentData = message.payload;
    const agent: Agent = {
      type: agentData?.agent_type || 'sales',
      id: agentData?.agent_id,
      name: agentData?.agent_info?.name
    };
    
    setCurrentAgent(agent);
    setSessionId(message.session_id || null);
    options.onAgentAssigned?.(agent);
    
    toast.success(`Conectado con ${agent.name || 'Agente IA'}`);
  }, [options]);

  // ============== WEBRTC HANDLERS ==============

  const setupPeerConnection = useCallback(async () => {
    try {
      // Crear peer connection
      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      
      // Event handlers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && websocketRef.current) {
          const message: WebRTCMessage = {
            type: 'ice_candidate',
            session_id: sessionId || undefined,
            payload: {
              candidate: event.candidate.toJSON()
            }
          };
          websocketRef.current.send(JSON.stringify(message));
        }
      };

      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote track received');
        remoteStreamRef.current = event.streams[0];
        // Aquí reproducirías el audio remoto
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
          callStartTimeRef.current = Date.now();
          options.onCallStart?.();
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
          handleCallEnded();
        }
      };

      // Obtener media local
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      localStreamRef.current = stream;
      
      // Agregar tracks al peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnectionRef.current = peerConnection;
      return peerConnection;
      
    } catch (error) {
      console.error('❌ Error setting up peer connection:', error);
      throw new Error('No se pudo acceder al micrófono');
    }
  }, [sessionId, options]);

  const handleWebRTCAnswer = useCallback(async (message: WebRTCMessage) => {
    try {
      if (!peerConnectionRef.current) return;
      
      const answerSDP = message.payload?.sdp;
      if (answerSDP) {
        await peerConnectionRef.current.setRemoteDescription({
          type: 'answer',
          sdp: answerSDP
        });
      }
    } catch (error) {
      console.error('❌ Error handling WebRTC answer:', error);
    }
  }, []);

  const handleICECandidate = useCallback(async (message: WebRTCMessage) => {
    try {
      if (!peerConnectionRef.current) return;
      
      const candidate = message.payload?.candidate;
      if (candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }, []);

  const handleAudioData = useCallback((message: WebRTCMessage) => {
    // Procesar datos de audio del agente IA
    const audioResponse = message.payload?.audio_response;
    const textResponse = message.payload?.text_response;
    
    if (textResponse) {
      console.log('🤖 Agent response:', textResponse);
      // Aquí podrías mostrar la transcripción
    }
    
    if (audioResponse) {
      // Reproducir respuesta de audio del agente
      // En una implementación real, esto se manejaría a través del WebRTC stream
    }
  }, []);

  // ============== CALL CONTROL ==============

  const startCall = useCallback(async (options: CallOptions) => {
    if (connectionStatus !== 'connected') {
      toast.error('No hay conexión al servicio de llamadas');
      return;
    }

    setIsLoading(true);
    setCallStatus('connecting');

    try {
      // Solicitar llamada al servidor
      const message: WebRTCMessage = {
        type: 'call_request',
        payload: {
          preferences: {
            agent_type: options.agentType,
            customer_data: options.customerData || {}
          }
        }
      };

      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify(message));
      }

      // Configurar WebRTC
      const peerConnection = await setupPeerConnection();
      
      // Crear oferta
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerConnection.setLocalDescription(offer);

      // Enviar oferta al servidor
      const offerMessage: WebRTCMessage = {
        type: 'offer',
        session_id: sessionId || undefined,
        payload: {
          sdp: offer.sdp
        }
      };

      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify(offerMessage));
      }

    } catch (error) {
      console.error('❌ Error starting call:', error);
      setCallStatus('failed');
      options.onError?.(error instanceof Error ? error.message : 'Error iniciando llamada');
      toast.error('No se pudo iniciar la llamada');
    } finally {
      setIsLoading(false);
    }
  }, [connectionStatus, sessionId, setupPeerConnection, options]);

  const endCall = useCallback(() => {
    setCallStatus('ended');
    
    // Calcular duración
    let duration = 0;
    if (callStartTimeRef.current) {
      duration = Math.round((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
    }

    // Limpiar WebRTC
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Limpiar streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Notificar al servidor
    if (websocketRef.current && sessionId) {
      const message: WebRTCMessage = {
        type: 'call_ended',
        session_id: sessionId
      };
      websocketRef.current.send(JSON.stringify(message));
    }

    // Callbacks
    options.onCallEnd?.(duration);
    toast.info(`Llamada finalizada. Duración: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);

    // Reset estados
    setTimeout(() => {
      setCallStatus('idle');
      setCurrentAgent(null);
      setSessionId(null);
      callStartTimeRef.current = null;
    }, 2000);
  }, [sessionId, options]);

  const handleCallEnded = useCallback(() => {
    endCall();
  }, [endCall]);

  // ============== EFFECTS ==============

  // Conectar WebSocket al montar
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  // ============== PUBLIC API ==============

  return {
    // Estados
    callStatus,
    connectionStatus,
    currentAgent,
    isLoading,
    sessionId,
    callDuration,
    isConnected: connectionStatus === 'connected',
    
    // Métodos
    startCall,
    endCall,
    connectWebSocket,
    
    // Streams (para uso avanzado)
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current
  };
};

export default useWebRTC;