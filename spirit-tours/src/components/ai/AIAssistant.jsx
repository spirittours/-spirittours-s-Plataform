import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaRobot, 
  FaTimes, 
  FaPaperPlane, 
  FaSpinner, 
  FaUser,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperclip,
  FaSmile,
  FaExpand,
  FaCompress
} from 'react-icons/fa';

const AI_AGENTS = {
  track1: [
    { id: 'booking_optimizer', name: 'BookingOptimizer', icon: '📊' },
    { id: 'support_bot', name: 'SupportBot', icon: '💬' },
    { id: 'revenue_analyzer', name: 'RevenueAnalyzer', icon: '💰' },
    { id: 'retention_expert', name: 'RetentionExpert', icon: '🎯' },
    { id: 'conversion_specialist', name: 'ConversionSpecialist', icon: '📈' },
    { id: 'personalization_guru', name: 'PersonalizationGuru', icon: '🎨' },
    { id: 'sentiment_analyst', name: 'SentimentAnalyst', icon: '😊' },
    { id: 'cart_optimizer', name: 'CartOptimizer', icon: '🛒' },
    { id: 'loyalty_manager', name: 'LoyaltyManager', icon: '⭐' },
    { id: 'wellness_optimizer', name: 'WellnessOptimizer', icon: '🏥' }
  ],
  track2: [
    { id: 'fraud_detector', name: 'FraudDetector', icon: '🔒' },
    { id: 'quantum_shield', name: 'QuantumShield', icon: '🛡️' },
    { id: 'cyber_security', name: 'CyberSecurity', icon: '🔐' },
    { id: 'trend_predictor', name: 'TrendPredictor', icon: '📊' },
    { id: 'global_expansion', name: 'GlobalExpansion', icon: '🌍' }
  ],
  track3: [
    { id: 'ethics_guardian', name: 'EthicsGuardian', icon: '⚖️' },
    { id: 'sustainability_advisor', name: 'SustainabilityAdvisor', icon: '🌱' },
    { id: 'cultural_consultant', name: 'CulturalConsultant', icon: '🎭' },
    { id: 'accessibility_champion', name: 'AccessibilityChampion', icon: '♿' },
    { id: 'mindful_travel', name: 'MindfulTravel', icon: '🧘' },
    { id: 'wellness_curator', name: 'WellnessCurator', icon: '💆' }
  ]
};

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'assistant', 
      content: '¡Hola! Soy tu asistente de Spirit Tours con 25 agentes IA especializados. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
      agent: null
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgents, setShowAgents] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Llamar al API del orquestador de IA
      const response = await axios.post('/api/ai/orchestrator/query', {
        query: inputMessage,
        user_context: {
          user_id: user?.id,
          user_name: user?.first_name,
          user_role: user?.role,
          preferred_language: 'es'
        },
        selected_agent: selectedAgent,
        session_id: localStorage.getItem('ai_session_id') || null
      });

      const { response: aiResponse, agent_used, session_id, suggestions } = response.data;

      // Guardar session_id para mantener contexto
      if (session_id) {
        localStorage.setItem('ai_session_id', session_id);
      }

      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        agent: agent_used,
        suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      const errorMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        agent: null,
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Aquí implementarías la grabación de voz real
    if (!isRecording) {
      console.log('Iniciando grabación...');
    } else {
      console.log('Deteniendo grabación...');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Archivo seleccionado:', file.name);
      // Aquí implementarías la carga del archivo
    }
  };

  const selectAgent = (agent) => {
    setSelectedAgent(agent.id);
    setShowAgents(false);
    
    const agentMessage = {
      id: messages.length + 1,
      type: 'assistant',
      content: `Has seleccionado el agente ${agent.icon} ${agent.name}. Este agente está especializado en su área. ¿En qué puedo ayudarte?`,
      timestamp: new Date(),
      agent: agent.id
    };
    
    setMessages(prev => [...prev, agentMessage]);
  };

  const quickActions = [
    { text: 'Buscar vuelos', icon: '✈️' },
    { text: 'Reservar hotel', icon: '🏨' },
    { text: 'Tours espirituales', icon: '🧘' },
    { text: 'Soporte', icon: '💬' }
  ];

  return (
    <>
      {/* Botón flotante del chat */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform duration-200 animate-pulse"
        >
          <FaRobot className="h-6 w-6" />
        </button>
      )}

      {/* Ventana del chat */}
      {isOpen && (
        <div className={`fixed z-50 ${
          isFullScreen 
            ? 'inset-0' 
            : 'bottom-6 right-6 w-96 h-[600px] max-h-[80vh]'
        } bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300`}>
          
          {/* Header del chat */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <FaRobot className="h-8 w-8" />
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Spirit Tours AI</h3>
                  <p className="text-xs text-indigo-200">25 agentes IA a tu servicio</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                >
                  {isFullScreen ? <FaCompress /> : <FaExpand />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Selector de agentes */}
            {selectedAgent && (
              <div className="mt-3 flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                <span className="text-sm">
                  Agente activo: {
                    [...AI_AGENTS.track1, ...AI_AGENTS.track2, ...AI_AGENTS.track3]
                      .find(a => a.id === selectedAgent)?.name
                  }
                </span>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-xs text-indigo-200 hover:text-white"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-indigo-600 text-white rounded-l-2xl rounded-tr-2xl' 
                    : message.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-r-2xl rounded-tl-2xl'
                    : 'bg-white text-gray-800 rounded-r-2xl rounded-tl-2xl shadow-md'
                } px-4 py-3`}>
                  {message.type === 'assistant' && message.agent && (
                    <div className="flex items-center space-x-1 mb-2 text-xs text-indigo-600">
                      <span>
                        {[...AI_AGENTS.track1, ...AI_AGENTS.track2, ...AI_AGENTS.track3]
                          .find(a => a.id === message.agent)?.icon}
                      </span>
                      <span className="font-medium">
                        {[...AI_AGENTS.track1, ...AI_AGENTS.track2, ...AI_AGENTS.track3]
                          .find(a => a.id === message.agent)?.name}
                      </span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
                      <div className="space-y-1">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInputMessage(suggestion)}
                            className="block w-full text-left text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg px-2 py-1 transition"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <span className="text-xs opacity-70 mt-2 block">
                    {new Date(message.timestamp).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-r-2xl rounded-tl-2xl px-4 py-3 shadow-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Acciones rápidas */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Acciones rápidas:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMessage(action.text)}
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 text-sm transition"
                  >
                    <span>{action.icon}</span>
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botón de agentes */}
          {!selectedAgent && (
            <div className="px-4 py-2 border-t border-gray-200">
              <button
                onClick={() => setShowAgents(!showAgents)}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg px-3 py-2 text-sm transition flex items-center justify-center space-x-2"
              >
                <FaRobot />
                <span>Seleccionar agente especializado</span>
              </button>
            </div>
          )}

          {/* Lista de agentes */}
          {showAgents && (
            <div className="px-4 py-2 border-t border-gray-200 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Track 1 - Customer & Revenue</p>
                  <div className="grid grid-cols-2 gap-1">
                    {AI_AGENTS.track1.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-1 text-xs transition"
                      >
                        <span>{agent.icon}</span>
                        <span className="truncate">{agent.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Track 2 - Security & Market</p>
                  <div className="grid grid-cols-2 gap-1">
                    {AI_AGENTS.track2.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className="flex items-center space-x-1 bg-green-50 hover:bg-green-100 rounded-lg px-2 py-1 text-xs transition"
                      >
                        <span>{agent.icon}</span>
                        <span className="truncate">{agent.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Track 3 - Ethics & Sustainability</p>
                  <div className="grid grid-cols-2 gap-1">
                    {AI_AGENTS.track3.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => selectAgent(agent)}
                        className="flex items-center space-x-1 bg-purple-50 hover:bg-purple-100 rounded-lg px-2 py-1 text-xs transition"
                      >
                        <span>{agent.icon}</span>
                        <span className="truncate">{agent.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Área de entrada */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-end space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FaPaperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows="1"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>
              
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-lg transition ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isRecording ? <FaMicrophoneSlash className="h-5 w-5" /> : <FaMicrophone className="h-5 w-5" />}
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {isTyping ? (
                  <FaSpinner className="h-5 w-5 animate-spin" />
                ) : (
                  <FaPaperPlane className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;