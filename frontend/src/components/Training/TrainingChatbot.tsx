/**
 * Training Chatbot Component
 * Interface interactiva para práctica de conversación con AI
 * 
 * Características:
 * - Selección de personaje y escenario
 * - Chat en tiempo real con análisis instantáneo
 * - Feedback visual de calidad de respuestas
 * - Historial de conversación
 * - Evaluación final con recomendaciones
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Paper,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Star as StarIcon,
  TipsAndUpdates as TipsIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import axios from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

interface Persona {
  key: string;
  name: string;
  role: string;
  description: string;
  personality: string[];
  common_questions?: string[];
}

interface Scenario {
  key: string;
  title: string;
  description: string;
  objectives: string[];
  difficulty: string;
  duration_minutes: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  analysis?: MessageAnalysis;
}

interface MessageAnalysis {
  score: number;
  feedback: string[];
  good_points: string[];
  improvement_points: string[];
}

interface ConversationFeedback {
  overall_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  next_steps: string[];
  objectives_completed: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TrainingChatbot: React.FC = () => {
  // State Management
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  
  // Conversation State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Feedback State
  const [conversationFeedback, setConversationFeedback] = useState<ConversationFeedback | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [tipsDialogOpen, setTipsDialogOpen] = useState(false);
  const [scenarioTips, setScenarioTips] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadPersonas();
    loadScenarios();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadPersonas = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/chatbot/personas`);
      setPersonas(response.data);
    } catch (error) {
      console.error('Error loading personas:', error);
    }
  };

  const loadScenarios = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/chatbot/scenarios`);
      setScenarios(response.data);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const loadScenarioTips = async (scenarioKey: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/chatbot/tips/${scenarioKey}`);
      setScenarioTips(response.data);
      setTipsDialogOpen(true);
    } catch (error) {
      console.error('Error loading tips:', error);
    }
  };

  // ============================================================================
  // CONVERSATION ACTIONS
  // ============================================================================

  const handleStartConversation = async () => {
    if (!selectedPersona || !selectedScenario) {
      alert('Por favor selecciona un personaje y un escenario');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/training/chatbot/conversations/start`, {
        persona_key: selectedPersona.key,
        scenario_key: selectedScenario.key,
        language: 'es'
      });

      const { conversation_id, initial_message } = response.data;
      
      setConversationId(conversation_id);
      setMessages([{
        role: 'assistant',
        content: initial_message,
        timestamp: new Date().toISOString()
      }]);
      setIsConversationActive(true);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al iniciar conversación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !conversationId) return;

    const userMessage: Message = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}/api/training/chatbot/conversations/${conversationId}/message`,
        { message: currentMessage }
      );

      const { ai_message, analysis } = response.data;

      const aiMessage: Message = {
        role: 'assistant',
        content: ai_message,
        timestamp: new Date().toISOString()
      };

      // Add analysis to user message
      userMessage.analysis = analysis;

      setMessages(prev => [...prev.slice(0, -1), userMessage, aiMessage]);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al enviar mensaje');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndConversation = async () => {
    if (!conversationId) return;

    if (!window.confirm('¿Estás seguro de finalizar la conversación? Recibirás tu evaluación completa.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/api/training/chatbot/conversations/${conversationId}/end`
      );

      setConversationFeedback(response.data.feedback);
      setFeedbackDialogOpen(true);
      setIsConversationActive(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al finalizar conversación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    setConversationId(null);
    setMessages([]);
    setIsConversationActive(false);
    setConversationFeedback(null);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'secondary';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderPersonaSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        1. Selecciona un Personaje
      </Typography>
      <Grid container spacing={2}>
        {personas.map(persona => (
          <Grid item xs={12} sm={6} md={4} key={persona.key}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: selectedPersona?.key === persona.key ? '2px solid #1976d2' : '1px solid #ddd',
                '&:hover': { boxShadow: 4 }
              }}
              onClick={() => setSelectedPersona(persona)}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{persona.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {persona.role}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {persona.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {persona.personality.slice(0, 2).map((trait, idx) => (
                    <Chip 
                      key={idx}
                      label={trait}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderScenarioSelection = () => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        2. Selecciona un Escenario
      </Typography>
      <Grid container spacing={2}>
        {scenarios.map(scenario => (
          <Grid item xs={12} sm={6} md={4} key={scenario.key}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: selectedScenario?.key === scenario.key ? '2px solid #1976d2' : '1px solid #ddd',
                '&:hover': { boxShadow: 4 }
              }}
              onClick={() => setSelectedScenario(scenario)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">{scenario.title}</Typography>
                  <Chip 
                    label={scenario.difficulty}
                    color={getDifficultyColor(scenario.difficulty) as any}
                    size="small"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {scenario.description}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                  ⏱️ Duración: ~{scenario.duration_minutes} min
                </Typography>
                <Typography variant="caption" display="block" fontWeight="bold" sx={{ mt: 1 }}>
                  Objetivos:
                </Typography>
                <List dense>
                  {scenario.objectives.slice(0, 2).map((obj, idx) => (
                    <ListItem key={idx} dense disableGutters>
                      <ListItemText 
                        primary={`• ${obj}`}
                        primaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<TipsIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    loadScenarioTips(scenario.key);
                  }}
                >
                  Ver Tips
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedPersona && selectedScenario && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartConversation}
            disabled={isLoading}
          >
            Iniciar Conversación de Práctica
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderChatInterface = () => (
    <Paper sx={{ p: 3, height: '70vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">{selectedPersona?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedScenario?.title}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined"
          color="error"
          onClick={handleEndConversation}
          disabled={isLoading}
        >
          Finalizar Conversación
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {/* Messages Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
        {messages.map((message, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Stack 
              direction="row" 
              spacing={2} 
              justifyContent={message.role === 'user' ? 'flex-end' : 'flex-start'}
            >
              {message.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <BotIcon />
                </Avatar>
              )}
              
              <Box sx={{ maxWidth: '70%' }}>
                <Paper 
                  sx={{ 
                    p: 2,
                    bgcolor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                </Paper>
                
                {/* Analysis Badge */}
                {message.analysis && (
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress 
                        variant="determinate" 
                        value={message.analysis.score} 
                        sx={{ 
                          flexGrow: 1, 
                          height: 8, 
                          borderRadius: 1,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getScoreColor(message.analysis.score)
                          }
                        }}
                      />
                      <Chip 
                        label={`${message.analysis.score}%`}
                        size="small"
                        sx={{ 
                          bgcolor: getScoreColor(message.analysis.score),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </Stack>
                    
                    {message.analysis.good_points.length > 0 && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          ✓ {message.analysis.good_points[0]}
                        </Typography>
                      </Alert>
                    )}
                    
                    {message.analysis.improvement_points.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          ⚠ {message.analysis.improvement_points[0]}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>

              {message.role === 'user' && (
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Stack>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Stack direction="row" spacing={2}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="Escribe tu respuesta..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={!currentMessage.trim() || isLoading}
          endIcon={<SendIcon />}
        >
          Enviar
        </Button>
      </Stack>
    </Paper>
  );

  const renderFeedbackDialog = () => (
    <Dialog 
      open={feedbackDialogOpen} 
      onClose={() => setFeedbackDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Evaluación de tu Conversación</Typography>
          <IconButton onClick={() => setFeedbackDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {conversationFeedback && (
          <>
            {/* Score */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  margin: '0 auto',
                  bgcolor: getScoreColor(conversationFeedback.overall_score),
                  fontSize: 32
                }}
              >
                {conversationFeedback.overall_score}
              </Avatar>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Puntaje General
              </Typography>
            </Box>

            {/* Strengths */}
            <Typography variant="h6" gutterBottom color="success.main">
              ✓ Fortalezas
            </Typography>
            <List>
              {conversationFeedback.strengths.map((strength, idx) => (
                <ListItem key={idx}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <CheckIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={strength} />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 3 }} />

            {/* Areas for Improvement */}
            <Typography variant="h6" gutterBottom color="warning.main">
              ⚠️ Áreas de Mejora
            </Typography>
            <List>
              {conversationFeedback.areas_for_improvement.map((area, idx) => (
                <ListItem key={idx}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <WarningIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={area} />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 3 }} />

            {/* Next Steps */}
            <Typography variant="h6" gutterBottom color="info.main">
              📚 Próximos Pasos Recomendados
            </Typography>
            <List>
              {conversationFeedback.next_steps.map((step, idx) => (
                <ListItem key={idx}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <SchoolIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={step} />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleResetConversation}>
          Nueva Conversación
        </Button>
        <Button variant="contained" onClick={() => setFeedbackDialogOpen(false)}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderTipsDialog = () => (
    <Dialog 
      open={tipsDialogOpen} 
      onClose={() => setTipsDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Tips y Mejores Prácticas
      </DialogTitle>
      <DialogContent dividers>
        {scenarioTips && (
          <>
            {scenarioTips.tips && scenarioTips.tips.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  💡 Tips Generales
                </Typography>
                <List>
                  {scenarioTips.tips.map((tip: string, idx: number) => (
                    <ListItem key={idx}>
                      <ListItemText primary={`• ${tip}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {scenarioTips.techniques && scenarioTips.techniques.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  🎯 Técnicas Recomendadas
                </Typography>
                <List>
                  {scenarioTips.techniques.map((technique: string, idx: number) => (
                    <ListItem key={idx}>
                      <ListItemText primary={`• ${technique}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {scenarioTips.examples && scenarioTips.examples.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  💬 Ejemplos de Frases
                </Typography>
                {scenarioTips.examples.map((example: string, idx: number) => (
                  <Paper key={idx} sx={{ p: 2, mb: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">{example}</Typography>
                  </Paper>
                ))}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTipsDialogOpen(false)}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          🤖 Práctica de Conversación con AI
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Mejora tus habilidades practicando con diferentes tipos de clientes
        </Typography>
      </Box>

      {/* Main Content */}
      {!isConversationActive ? (
        <>
          {renderPersonaSelection()}
          {renderScenarioSelection()}
        </>
      ) : (
        renderChatInterface()
      )}

      {/* Dialogs */}
      {renderFeedbackDialog()}
      {renderTipsDialog()}
    </Container>
  );
};

export default TrainingChatbot;
