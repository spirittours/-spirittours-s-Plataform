import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  MessageSquare, Send, Phone, Mail, User, Clock, Tag, 
  AlertCircle, CheckCircle, Loader, X, MoreVertical,
  Search, Filter, Archive, UserPlus, LogOut, Circle,
  Image, FileText, MapPin, Mic, Video, ExternalLink,
  ChevronDown, ChevronUp, RefreshCw, Star, Zap
} from 'lucide-react';
import io from 'socket.io-client';

// ==================== TYPES ====================

interface UnifiedConversation {
  id: number;
  conversation_id: string;
  channel: 'whatsapp' | 'google_messages' | 'sms' | 'telegram';
  channel_conversation_id: string;
  user_id?: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  status: 'active' | 'queued' | 'assigned' | 'resolved' | 'closed';
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  priority: number;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  closed_at?: string;
  unread_count?: number;
  last_message?: string;
}

interface UnifiedMessage {
  id: number;
  message_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_id: string;
  sender_name?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'rich_card' | 'interactive' | 'suggested_reply';
  content: string;
  media_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'available' | 'busy' | 'offline' | 'away';
  current_conversations: number;
  max_conversations: number;
  total_handled: number;
  avg_response_time?: number;
  last_activity?: string;
}

interface MessageTemplate {
  id: number;
  name: string;
  category: string;
  content: string;
  channel?: string;
  variables?: string[];
  is_active: boolean;
}

interface QueuedConversation {
  conversation_id: string;
  priority: number;
  channel: string;
  user_name?: string;
  wait_time_seconds: number;
  metadata?: Record<string, any>;
}

interface MessagingStats {
  totalConversations: number;
  activeConversations: number;
  queuedConversations: number;
  closedToday: number;
  avgResponseTime: number;
  messagesByChannel: Record<string, number>;
}

interface Props {
  agentId: string;
  agentName: string;
  agentRole: 'agent' | 'supervisor' | 'admin';
  onLogout?: () => void;
}

// ==================== MAIN COMPONENT ====================

const UnifiedInbox: React.FC<Props> = ({ agentId, agentName, agentRole, onLogout }) => {
  // State management
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Agent and queue management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [queuedConversations, setQueuedConversations] = useState<QueuedConversation[]>([]);
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away'>('available');
  
  // Templates and UI
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  
  // WebSocket and refs
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // ==================== EFFECTS ====================
  
  // Initialize WebSocket connection
  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    socketRef.current = io(apiUrl, {
      auth: { agentId, agentName, agentRole }
    });
    
    // Join agent room
    socketRef.current.emit('join-agent-room', agentId);
    
    // WebSocket event listeners
    socketRef.current.on('new-message', (data: any) => {
      if (selectedConversation && data.conversationId === selectedConversation.conversation_id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
      
      // Update conversation list
      setConversations(prev => 
        prev.map(conv => 
          conv.conversation_id === data.conversationId 
            ? { ...conv, last_message: data.message.content, last_message_at: data.message.created_at, unread_count: (conv.unread_count || 0) + 1 }
            : conv
        )
      );
    });
    
    socketRef.current.on('message-sent', (data: any) => {
      if (selectedConversation && data.conversationId === selectedConversation.conversation_id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    });
    
    socketRef.current.on('new-conversation', (data: any) => {
      setConversations(prev => [data.conversation, ...prev]);
      loadStats();
    });
    
    socketRef.current.on('conversation-queued', (data: any) => {
      setQueuedConversations(prev => [...prev, data.queueItem]);
      loadStats();
    });
    
    socketRef.current.on('conversation-assigned', (data: any) => {
      if (data.agentId === agentId) {
        loadConversations();
        loadStats();
      }
    });
    
    socketRef.current.on('conversation-closed', (data: any) => {
      setConversations(prev => 
        prev.map(conv => 
          conv.conversation_id === data.conversationId 
            ? { ...conv, status: 'closed', closed_at: new Date().toISOString() }
            : conv
        )
      );
      loadStats();
    });
    
    socketRef.current.on('agent-status-changed', (data: any) => {
      setAgents(prev => 
        prev.map(agent => 
          agent.id === data.agentId 
            ? { ...agent, status: data.status, last_activity: new Date().toISOString() }
            : agent
        )
      );
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [agentId, agentName, agentRole, selectedConversation]);
  
  // Load initial data
  useEffect(() => {
    loadConversations();
    loadAgents();
    loadTemplates();
    loadStats();
    loadQueuedConversations();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadStats();
      if (agentRole === 'supervisor' || agentRole === 'admin') {
        loadQueuedConversations();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // ==================== API CALLS ====================
  
  const loadConversations = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (agentRole === 'agent') {
        params.assigned_agent_id = agentId;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (channelFilter !== 'all') {
        params.channel = channelFilter;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await axios.get('/api/messages/conversations', { params });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMessages = async (conversationId: string) => {
    try {
      const response = await axios.get(`/api/messages/conversations/${conversationId}/messages`);
      setMessages(response.data.messages || []);
      
      // Mark as read
      await axios.post(`/api/messages/conversations/${conversationId}/read`, {
        agent_id: agentId
      });
      
      // Update unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.conversation_id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  const loadAgents = async () => {
    try {
      const response = await axios.get('/api/messages/agents');
      setAgents(response.data.agents || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };
  
  const loadTemplates = async () => {
    try {
      const response = await axios.get('/api/messages/templates', {
        params: { is_active: true }
      });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };
  
  const loadStats = async () => {
    try {
      const response = await axios.get('/api/messages/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  const loadQueuedConversations = async () => {
    try {
      const response = await axios.get('/api/messages/queue');
      setQueuedConversations(response.data.queue || []);
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };
  
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sending) return;
    
    try {
      setSending(true);
      
      await axios.post('/api/messages/send', {
        conversation_id: selectedConversation.conversation_id,
        message_type: 'text',
        content: messageInput.trim(),
        sender_id: agentId,
        sender_name: agentName
      });
      
      setMessageInput('');
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar mensaje. Por favor intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };
  
  const assignConversation = async (conversationId: string, targetAgentId: string) => {
    try {
      await axios.post(`/api/messages/conversations/${conversationId}/assign`, {
        agent_id: targetAgentId,
        assigned_by: agentId
      });
      
      loadConversations();
      loadQueuedConversations();
    } catch (error) {
      console.error('Error assigning conversation:', error);
      alert('Error al asignar conversación.');
    }
  };
  
  const closeConversation = async (conversationId: string) => {
    try {
      await axios.post(`/api/messages/conversations/${conversationId}/close`, {
        closed_by: agentId,
        resolution_notes: 'Conversación cerrada por el agente'
      });
      
      setSelectedConversation(null);
      loadConversations();
      loadStats();
    } catch (error) {
      console.error('Error closing conversation:', error);
      alert('Error al cerrar conversación.');
    }
  };
  
  const updateAgentStatus = async (newStatus: 'available' | 'busy' | 'away') => {
    try {
      await axios.put(`/api/messages/agents/${agentId}/status`, {
        status: newStatus
      });
      
      setAgentStatus(newStatus);
      loadAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };
  
  const useTemplate = (template: MessageTemplate) => {
    setMessageInput(template.content);
    setShowTemplates(false);
    messageInputRef.current?.focus();
  };
  
  const acceptQueuedConversation = async (conversationId: string) => {
    await assignConversation(conversationId, agentId);
  };
  
  // ==================== HELPERS ====================
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '💬';
      case 'google_messages': return '📱';
      case 'sms': return '📨';
      case 'telegram': return '✈️';
      default: return '💬';
    }
  };
  
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'google_messages': return 'bg-blue-100 text-blue-800';
      case 'sms': return 'bg-purple-100 text-purple-800';
      case 'telegram': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'busy': return 'text-red-500';
      case 'away': return 'text-yellow-500';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };
  
  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };
  
  const filterConversations = useCallback(() => {
    return conversations.filter(conv => {
      if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
      if (channelFilter !== 'all' && conv.channel !== channelFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.user_name?.toLowerCase().includes(query) ||
          conv.user_phone?.includes(query) ||
          conv.user_email?.toLowerCase().includes(query) ||
          conv.last_message?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [conversations, statusFilter, channelFilter, searchQuery]);
  
  // ==================== RENDER ====================
  
  const filteredConversations = filterConversations();
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversation List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Inbox Unificado</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Filtros"
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="queued">En cola</option>
                <option value="assigned">Asignadas</option>
                <option value="resolved">Resueltas</option>
                <option value="closed">Cerradas</option>
              </select>
              
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los canales</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="google_messages">Google Messages</option>
                <option value="sms">SMS</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Stats Summary */}
        {stats && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.activeConversations}</div>
                <div className="text-xs text-gray-600">Activas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.queuedConversations}</div>
                <div className="text-xs text-gray-600">En Cola</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.closedToday}</div>
                <div className="text-xs text-gray-600">Cerradas Hoy</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No hay conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => {
                  setSelectedConversation(conv);
                  loadMessages(conv.conversation_id);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.conversation_id === conv.conversation_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-xl">{getChannelIcon(conv.channel)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conv.user_name || conv.user_phone || 'Usuario Desconocido'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {conv.user_phone || conv.user_email}
                      </p>
                    </div>
                  </div>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-2">
                  {conv.last_message || 'Sin mensajes'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                    {conv.priority > 0 && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(conv.last_message_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Agent Status Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Circle className={`w-3 h-3 fill-current ${getAgentStatusColor(agentStatus)}`} />
              <span className="text-sm font-medium text-gray-900">{agentName}</span>
            </div>
            <button
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className="text-gray-600 hover:text-gray-900"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          
          <select
            value={agentStatus}
            onChange={(e) => updateAgentStatus(e.target.value as any)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="away">Ausente</option>
          </select>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getChannelIcon(selectedConversation.channel)}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedConversation.user_name || 'Usuario Desconocido'}
                    </h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getChannelColor(selectedConversation.channel)}`}>
                        {selectedConversation.channel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedConversation.status)}`}>
                        {selectedConversation.status}
                      </span>
                      {selectedConversation.user_phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {selectedConversation.user_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {(agentRole === 'supervisor' || agentRole === 'admin') && (
                    <select
                      onChange={(e) => assignConversation(selectedConversation.conversation_id, e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Asignar agente...</option>
                      {agents
                        .filter(a => a.status === 'available' && a.current_conversations < a.max_conversations)
                        .map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.current_conversations}/{agent.max_conversations})
                          </option>
                        ))}
                    </select>
                  )}
                  
                  <button
                    onClick={() => closeConversation(selectedConversation.conversation_id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.message_id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-lg ${message.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.sender_name && message.direction === 'outbound' && (
                        <div className="text-xs opacity-75 mb-1">{message.sender_name}</div>
                      )}
                      
                      {/* Media */}
                      {message.media_url && (
                        <div className="mb-2">
                          {message.message_type === 'image' && (
                            <img src={message.media_url} alt="Imagen" className="rounded max-w-sm" />
                          )}
                          {message.message_type === 'video' && (
                            <video src={message.media_url} controls className="rounded max-w-sm" />
                          )}
                          {message.message_type === 'audio' && (
                            <audio src={message.media_url} controls className="w-full" />
                          )}
                          {message.message_type === 'document' && (
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-blue-600 hover:underline"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Ver documento</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Text Content */}
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-1 ${message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(message.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        {message.direction === 'outbound' && (
                          <>
                            {message.delivered_at && ' ✓'}
                            {message.read_at && '✓'}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              {/* Templates Bar */}
              {showTemplates && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Plantillas rápidas</span>
                    <button onClick={() => setShowTemplates(false)}>
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {templates.slice(0, 5).map(template => (
                      <button
                        key={template.id}
                        onClick={() => useTemplate(template)}
                        className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-600 truncate">{template.content}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Plantillas"
                >
                  <Zap className="w-5 h-5" />
                </button>
                
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  rows={3}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Inbox Unificado</h2>
            <p className="text-sm">Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>
      
      {/* Right Sidebar - Queue & Agents (for supervisors/admins) */}
      {(agentRole === 'supervisor' || agentRole === 'admin') && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setShowStatsPanel(false)}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                !showStatsPanel ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cola ({queuedConversations.length})
            </button>
            <button
              onClick={() => setShowStatsPanel(true)}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                showStatsPanel ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Agentes ({agents.length})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {!showStatsPanel ? (
              /* Queue Panel */
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Conversaciones en Cola</h3>
                  <button
                    onClick={loadQueuedConversations}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                
                {queuedConversations.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay conversaciones en cola</p>
                  </div>
                ) : (
                  queuedConversations.map((item) => (
                    <div
                      key={item.conversation_id}
                      className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getChannelIcon(item.channel)}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.user_name || 'Usuario Desconocido'}
                            </div>
                            <div className="text-xs text-gray-600">
                              Esperando: {formatWaitTime(item.wait_time_seconds)}
                            </div>
                          </div>
                        </div>
                        {item.priority > 0 && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      
                      <button
                        onClick={() => acceptQueuedConversation(item.conversation_id)}
                        className="w-full mt-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                      >
                        Aceptar conversación
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Agents Panel */
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Agentes Activos</h3>
                
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Circle className={`w-3 h-3 fill-current ${getAgentStatusColor(agent.status)}`} />
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-600">{agent.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Conversaciones:</span>
                        <span className="font-medium">
                          {agent.current_conversations}/{agent.max_conversations}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total atendidas:</span>
                        <span className="font-medium">{agent.total_handled}</span>
                      </div>
                      {agent.avg_response_time && (
                        <div className="flex justify-between">
                          <span>Tiempo resp. promedio:</span>
                          <span className="font-medium">{Math.round(agent.avg_response_time)}s</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(agent.current_conversations / agent.max_conversations) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInbox;
