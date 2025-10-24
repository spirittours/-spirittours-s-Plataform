/**
 * Chat Interface Component
 * 
 * Sistema de mensajería integrada para viajes:
 * - Chat en tiempo real entre cliente, guía y soporte
 * - Envío de mensajes de texto
 * - Compartir ubicación en el chat
 * - Envío de archivos adjuntos
 * - Indicadores de mensaje leído/entregado
 * - Typing indicators (escribiendo...)
 * - Notificaciones de nuevos mensajes
 * - Historial de conversación
 * 
 * Integra con: backend/routes/trips.routes.js
 * 
 * NOTA: En producción, usar WebSocket para actualizaciones en tiempo real:
 * - Socket.io client para conexión persistente
 * - Event listeners para nuevos mensajes
 * - Auto-scroll al nuevo mensaje
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Chip,
  Button,
  Divider,
  Badge,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  InputAdornment,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  MyLocation as LocationIcon,
  Image as ImageIcon,
  MoreVert as MoreIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  SupportAgent as SupportIcon,
  EmojiEmotions as EmojiIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Types
interface ChatMessage {
  message_id: string;
  sender_type: 'customer' | 'guide' | 'support';
  sender_name: string;
  message_text: string;
  message_type: 'text' | 'location' | 'file';
  attachment_url?: string;
  location_lat?: number;
  location_lon?: number;
  is_read: boolean;
  created_at: string;
}

interface ChatParticipant {
  user_id: string;
  name: string;
  role: 'customer' | 'guide' | 'support';
  avatar_url?: string;
  online: boolean;
}

interface TypingIndicator {
  user_id: string;
  name: string;
  typing: boolean;
}

const ChatInterface: React.FC<{ tripId: string; currentUserId: string; currentUserRole: 'customer' | 'guide' | 'support' }> = ({ 
  tripId, 
  currentUserId,
  currentUserRole 
}) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages on mount
  useEffect(() => {
    loadChatData();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [tripId]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadMessages(false); // Silent reload
      }, 5000); // 5 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat data
  const loadChatData = async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadMessages(true),
        loadParticipants()
      ]);

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading chat data:', err);
      setLoading(false);
    }
  };

  // Load messages
  const loadMessages = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}/chat`);
      setMessages(response.data.data);

      // Mark messages as read
      await markMessagesAsRead();
    } catch (err: any) {
      console.error('Error loading messages:', err);
    }
  };

  // Load participants
  const loadParticipants = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}/participants`);
      setParticipants(response.data.data);
    } catch (err: any) {
      console.error('Error loading participants:', err);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/trips/${tripId}/chat/mark-read`, {
        user_id: currentUserId
      });
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);

      await axios.post(`${API_BASE_URL}/trips/${tripId}/chat`, {
        sender_id: currentUserId,
        sender_type: currentUserRole,
        message_text: newMessage,
        message_type: 'text'
      });

      setNewMessage('');
      await loadMessages(false);
      scrollToBottom();
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Send location
  const sendLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          await axios.post(`${API_BASE_URL}/trips/${tripId}/chat`, {
            sender_id: currentUserId,
            sender_type: currentUserRole,
            message_text: '📍 Ubicación compartida',
            message_type: 'location',
            location_lat: position.coords.latitude,
            location_lon: position.coords.longitude
          });

          await loadMessages(false);
        } catch (err: any) {
          alert('Error al enviar ubicación: ' + (err.response?.data?.message || err.message));
        }
      }, (error) => {
        alert('Error al obtener ubicación: ' + error.message);
      });
    } else {
      alert('Geolocalización no disponible en este navegador');
    }
  };

  // Upload file
  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sender_id', currentUserId);
      formData.append('sender_type', currentUserRole);

      await axios.post(`${API_BASE_URL}/trips/${tripId}/chat/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSelectedFile(null);
      setFileDialogOpen(false);
      await loadMessages(false);
    } catch (err: any) {
      alert('Error al subir archivo: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    // In production, emit WebSocket event:
    // socket.emit('typing', { trip_id: tripId, user_id: currentUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      // socket.emit('stop_typing', { trip_id: tripId, user_id: currentUserId });
    }, 3000);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get sender color
  const getSenderColor = (senderType: string): string => {
    switch (senderType) {
      case 'customer':
        return 'primary';
      case 'guide':
        return 'success';
      case 'support':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get sender icon
  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'customer':
        return <PersonIcon />;
      case 'guide':
        return <PersonIcon />;
      case 'support':
        return <SupportIcon />;
      default:
        return <PersonIcon />;
    }
  };

  // Check if message is from current user
  const isOwnMessage = (message: ChatMessage): boolean => {
    return message.sender_type === currentUserRole;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <CardHeader
        avatar={
          <Badge
            badgeContent={participants.filter(p => p.online).length}
            color="success"
            overlap="circular"
          >
            <Avatar>
              <PersonIcon />
            </Avatar>
          </Badge>
        }
        title={
          <Typography variant="h6">
            Chat del Viaje
          </Typography>
        }
        subheader={
          <Box>
            <Typography variant="caption" display="block">
              {participants.length} participantes
            </Typography>
            {typingUsers.filter(t => t.typing).length > 0 && (
              <Typography variant="caption" color="primary">
                {typingUsers.filter(t => t.typing).map(t => t.name).join(', ')} escribiendo...
              </Typography>
            )}
          </Box>
        }
        action={
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        }
      />

      <Divider />

      {/* Participants List */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {participants.map((participant) => (
            <Chip
              key={participant.user_id}
              avatar={
                <Avatar>
                  {getSenderIcon(participant.role)}
                </Avatar>
              }
              label={participant.name}
              size="small"
              color={participant.online ? 'success' : 'default'}
              variant={participant.online ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Box>

      <Divider />

      {/* Messages Container */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'grey.50'
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="textSecondary">
              No hay mensajes aún. ¡Sé el primero en escribir!
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <Box
                key={message.message_id}
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: isOwnMessage(message) ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Message Bubble */}
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: isOwnMessage(message) ? 'primary.main' : 'white',
                    color: isOwnMessage(message) ? 'white' : 'text.primary',
                    borderRadius: 2,
                    borderTopRightRadius: isOwnMessage(message) ? 0 : 16,
                    borderTopLeftRadius: isOwnMessage(message) ? 16 : 0
                  }}
                >
                  {/* Sender Name */}
                  {!isOwnMessage(message) && (
                    <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {message.sender_name}
                      <Chip
                        label={message.sender_type}
                        size="small"
                        sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                      />
                    </Typography>
                  )}

                  {/* Message Content */}
                  {message.message_type === 'text' && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.message_text}
                    </Typography>
                  )}

                  {message.message_type === 'location' && (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <LocationIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        {message.message_text}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        href={`https://www.google.com/maps?q=${message.location_lat},${message.location_lon}`}
                        target="_blank"
                        sx={{ mt: 1 }}
                      >
                        Ver en Mapa
                      </Button>
                    </Box>
                  )}

                  {message.message_type === 'file' && (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <AttachIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Archivo adjunto
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        href={message.attachment_url}
                        target="_blank"
                        sx={{ mt: 1 }}
                      >
                        Descargar
                      </Button>
                    </Box>
                  )}

                  {/* Message Metadata */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {new Date(message.created_at).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                    {isOwnMessage(message) && (
                      <Box>
                        {message.is_read ? (
                          <DoneAllIcon sx={{ fontSize: 14, ml: 0.5 }} />
                        ) : (
                          <CheckIcon sx={{ fontSize: 14, ml: 0.5 }} />
                        )}
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      <Divider />

      {/* Message Input */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Adjuntar archivo">
            <IconButton
              size="small"
              onClick={() => setFileDialogOpen(true)}
            >
              <AttachIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Compartir ubicación">
            <IconButton
              size="small"
              onClick={sendLocation}
            >
              <LocationIcon />
            </IconButton>
          </Tooltip>

          <TextField
            fullWidth
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            disabled={sending}
            multiline
            maxRows={3}
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    color="primary"
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </Typography>
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setAutoRefresh(!autoRefresh);
          setAnchorEl(null);
        }}>
          {autoRefresh ? 'Desactivar' : 'Activar'} actualización automática
        </MenuItem>
        <MenuItem onClick={async () => {
          await loadMessages(true);
          setAnchorEl(null);
        }}>
          Actualizar mensajes
        </MenuItem>
        <MenuItem onClick={() => {
          setMessages([]);
          setAnchorEl(null);
        }}>
          Limpiar chat (local)
        </MenuItem>
      </Menu>

      {/* File Upload Dialog */}
      <Dialog open={fileDialogOpen} onClose={() => setFileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjuntar Archivo</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Puedes adjuntar imágenes, documentos PDF, archivos de texto, etc.
          </Alert>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Archivo seleccionado: {selectedFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileDialogOpen(false)}>Cancelar</Button>
          <Button onClick={uploadFile} disabled={!selectedFile} variant="contained">
            Subir Archivo
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ChatInterface;
