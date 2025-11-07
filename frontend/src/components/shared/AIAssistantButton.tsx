/**
 * AI Assistant Button - SPRINT 2.3
 * 
 * Universal AI assistant button that appears in all modules with contextual intelligence.
 * Provides smart prompts and AI-powered assistance based on the current module and context.
 * 
 * Features:
 * - Context-aware prompts (CRM, Bookings, Campaigns, Analytics, Projects)
 * - Floating action button with customizable position
 * - Modal dialog with AI chat interface
 * - Quick action suggestions based on module
 * - Integration with MultiModelAI backend
 * - Real-time AI responses
 * - Conversation history
 * - Copy/paste AI suggestions
 * 
 * Usage:
 * <AIAssistantButton 
 *   module="crm" 
 *   entityType="contact"
 *   entityId="123"
 *   contextData={{ name: "John Doe", email: "john@example.com" }}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Stack,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Tooltip,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Fade,
  Zoom,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Close as CloseIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  People as PeopleIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Module-specific smart prompts
const MODULE_PROMPTS = {
  crm: {
    contact: [
      { icon: <EmailIcon />, text: 'Draft a follow-up email', prompt: 'Help me draft a professional follow-up email for this contact' },
      { icon: <TrendingUpIcon />, text: 'Analyze engagement', prompt: 'Analyze the engagement level and suggest next steps for this contact' },
      { icon: <PeopleIcon />, text: 'Similar contacts', prompt: 'Find similar contacts based on this profile and suggest potential connections' },
      { icon: <LightbulbIcon />, text: 'Upsell opportunities', prompt: 'Identify potential upselling or cross-selling opportunities for this contact' },
    ],
    deal: [
      { icon: <TrendingUpIcon />, text: 'Win probability', prompt: 'Analyze the deal and calculate the probability of closing successfully' },
      { icon: <DescriptionIcon />, text: 'Proposal draft', prompt: 'Help me create a compelling proposal for this deal' },
      { icon: <LightbulbIcon />, text: 'Objection handling', prompt: 'What are potential objections and how should I handle them?' },
      { icon: <EventIcon />, text: 'Next steps', prompt: 'Suggest the next best actions to move this deal forward' },
    ],
    lead: [
      { icon: <TrendingUpIcon />, text: 'Lead scoring', prompt: 'Evaluate this lead and provide a quality score with reasoning' },
      { icon: <EmailIcon />, text: 'Qualification email', prompt: 'Draft a lead qualification email to determine fit and interest' },
      { icon: <PsychologyIcon />, text: 'Conversion strategy', prompt: 'Create a strategy to convert this lead into a customer' },
    ],
  },
  booking: [
    { icon: <EmailIcon />, text: 'Booking confirmation', prompt: 'Draft a professional booking confirmation email' },
    { icon: <LightbulbIcon />, text: 'Upsell suggestions', prompt: 'Suggest relevant upsells or add-ons for this booking' },
    { icon: <PsychologyIcon />, text: 'Customer preferences', prompt: 'Analyze booking patterns and suggest personalized recommendations' },
    { icon: <EventIcon />, text: 'Itinerary optimization', prompt: 'Review the itinerary and suggest improvements or alternatives' },
  ],
  campaign: [
    { icon: <EmailIcon />, text: 'Subject line ideas', prompt: 'Generate 5 compelling subject line variations for this campaign' },
    { icon: <TrendingUpIcon />, text: 'Performance analysis', prompt: 'Analyze campaign performance and suggest optimization strategies' },
    { icon: <PsychologyIcon />, text: 'Audience segmentation', prompt: 'Recommend audience segments for better targeting' },
    { icon: <DescriptionIcon />, text: 'A/B test ideas', prompt: 'Suggest A/B testing strategies to improve campaign results' },
  ],
  project: [
    { icon: <EventIcon />, text: 'Timeline optimization', prompt: 'Review the project timeline and suggest optimizations' },
    { icon: <LightbulbIcon />, text: 'Risk assessment', prompt: 'Identify potential risks and mitigation strategies for this project' },
    { icon: <DescriptionIcon />, text: 'Status report', prompt: 'Generate a professional status report for stakeholders' },
    { icon: <TrendingUpIcon />, text: 'Resource allocation', prompt: 'Analyze resource allocation and suggest improvements' },
  ],
  analytics: [
    { icon: <TrendingUpIcon />, text: 'Trend analysis', prompt: 'Analyze the trends and provide actionable insights' },
    { icon: <LightbulbIcon />, text: 'Recommendations', prompt: 'Based on the data, what are the top 3 recommendations?' },
    { icon: <PsychologyIcon />, text: 'Anomaly detection', prompt: 'Are there any unusual patterns or anomalies in the data?' },
    { icon: <DescriptionIcon />, text: 'Executive summary', prompt: 'Create an executive summary of key findings' },
  ],
  general: [
    { icon: <LightbulbIcon />, text: 'Get suggestions', prompt: 'What can you help me with?' },
    { icon: <PsychologyIcon />, text: 'Analyze data', prompt: 'Help me analyze the current data and provide insights' },
    { icon: <DescriptionIcon />, text: 'Generate content', prompt: 'Help me generate content based on the context' },
  ],
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantButtonProps {
  module?: 'crm' | 'booking' | 'campaign' | 'project' | 'analytics' | 'general';
  entityType?: string;
  entityId?: string;
  contextData?: Record<string, any>;
  position?: {
    bottom?: number;
    right?: number;
    left?: number;
    top?: number;
  };
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  module = 'general',
  entityType,
  entityId,
  contextData = {},
  position = { bottom: 24, right: 24 },
  color = 'primary',
}) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get module-specific prompts
  const getSmartPrompts = () => {
    if (module === 'crm' && entityType) {
      return MODULE_PROMPTS.crm[entityType as keyof typeof MODULE_PROMPTS.crm] || MODULE_PROMPTS.general;
    }
    return MODULE_PROMPTS[module] || MODULE_PROMPTS.general;
  };

  const smartPrompts = getSmartPrompts();

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build context string for AI
  const buildContext = () => {
    let context = `Module: ${module}`;
    if (entityType) context += `, Entity Type: ${entityType}`;
    if (entityId) context += `, Entity ID: ${entityId}`;
    
    if (Object.keys(contextData).length > 0) {
      context += '\n\nContext Data:\n' + JSON.stringify(contextData, null, 2);
    }
    
    return context;
  };

  // Handle sending message to AI
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setShowPrompts(false);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: textToSend,
        context: buildContext(),
        conversationHistory: messages.slice(-5), // Last 5 messages for context
        model: 'gpt-4', // Use best model for assistant
        temperature: 0.7,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  // Handle quick prompt click
  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    handleSendMessage(prompt);
  };

  // Copy message to clipboard
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  // Handle dialog open
  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your AI assistant for ${module === 'general' ? 'the system' : `the ${module} module`}. How can I help you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setOpen(false);
  };

  // Clear conversation
  const handleClearConversation = () => {
    setMessages([]);
    setShowPrompts(true);
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI assistant for ${module === 'general' ? 'the system' : `the ${module} module`}. How can I help you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Zoom in={!open}>
        <Tooltip title="AI Assistant" placement="left">
          <Fab
            color={color}
            aria-label="ai-assistant"
            onClick={handleOpen}
            sx={{
              position: 'fixed',
              ...position,
              boxShadow: 6,
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: 12,
              },
              transition: 'all 0.3s ease',
            }}
          >
            <AIIcon sx={{ fontSize: 32 }} />
          </Fab>
        </Tooltip>
      </Zoom>

      {/* AI Assistant Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <Avatar sx={{ bgcolor: `${color}.main` }}>
            <AutoAwesomeIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">AI Assistant</Typography>
            <Typography variant="caption" color="text.secondary">
              {module === 'general' ? 'General Assistant' : `${module.toUpperCase()} Module`}
              {entityType && ` • ${entityType}`}
            </Typography>
          </Box>
          <IconButton onClick={handleClearConversation} size="small" title="Clear conversation">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
          {/* Smart Prompts - Collapsible */}
          {showPrompts && messages.length <= 1 && (
            <Fade in={showPrompts}>
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowPrompts(!showPrompts)}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    💡 Smart Suggestions
                  </Typography>
                  <IconButton size="small">
                    {showPrompts ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                <Collapse in={showPrompts}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {smartPrompts.map((prompt, index) => (
                      <Chip
                        key={index}
                        icon={prompt.icon}
                        label={prompt.text}
                        onClick={() => handleQuickPrompt(prompt.prompt)}
                        clickable
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            </Fade>
          )}

          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Stack spacing={2}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxWidth: '75%',
                      bgcolor: message.role === 'user' ? `${color}.light` : 'background.paper',
                      border: message.role === 'assistant' ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    {message.role === 'assistant' && (
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: `${color}.main` }}>
                          <AIIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="caption" fontWeight="bold">
                          AI Assistant
                        </Typography>
                      </Stack>
                    )}
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                      {message.role === 'assistant' && (
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMessage(message.content)}
                          title="Copy"
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                </Box>
              ))}
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper elevation={1} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        AI is thinking...
                      </Typography>
                    </Stack>
                  </Paper>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>
        </DialogContent>

        <Divider />

        {/* Input Area */}
        <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            variant="outlined"
            size="small"
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="caption" color="text.secondary">
              Press Enter to send, Shift+Enter for new line
            </Typography>
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={() => handleSendMessage()}
              disabled={loading || !inputValue.trim()}
            >
              Send
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIAssistantButton;
