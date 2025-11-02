/**
 * Agent Dashboard Component
 * 
 * Comprehensive dashboard for interacting with AI agents system.
 * Features:
 * - Agent discovery and selection
 * - Chat-like interface for agent interaction
 * - Real-time metrics and monitoring
 * - Workflow execution
 * - Request history
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  Paper,
  IconButton,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  SmartToy,
  Send,
  Psychology,
  Speed,
  TrendingUp,
  Campaign,
  Assessment,
  Info,
  Clear,
  Refresh,
  Settings,
  History,
  Api,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

// Types
interface Agent {
  name: string;
  description: string;
  version: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  capabilities: string[];
  metrics: {
    execution_count: number;
    error_count: number;
    success_rate: number;
    avg_execution_time_ms: number;
  };
}

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agent?: string;
  result?: any;
  error?: string;
  execution_time?: number;
}

interface AgentRequest {
  intent: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

interface AgentResponse {
  request_id: string;
  agent_name: string;
  status: string;
  result: any;
  error?: string;
  execution_time_ms: number;
  timestamp: string;
}

// Agent category icons
const categoryIcons: Record<string, React.ReactElement> = {
  tourism: <SmartToy />,
  operations: <Settings />,
  analytics: <TrendingUp />,
  marketing: <Campaign />,
};

const AgentDashboard: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch all agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery<Agent[]>(
    'agents',
    async () => {
      const response = await axios.get('/api/agents');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch system metrics
  const { data: systemMetrics } = useQuery(
    'systemMetrics',
    async () => {
      const response = await axios.get('/api/agents/metrics/summary');
      return response.data;
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  // Execute agent mutation
  const executeAgentMutation = useMutation(
    async (data: { agentName: string; request: AgentRequest }) => {
      const response = await axios.post(
        `/api/agents/${data.agentName}/execute`,
        data.request
      );
      return response.data;
    },
    {
      onSuccess: (data: AgentResponse) => {
        // Add agent response to messages
        const agentMessage: Message = {
          id: data.request_id,
          type: 'agent',
          content: data.error || 'Request completed successfully',
          timestamp: new Date(data.timestamp),
          agent: data.agent_name,
          result: data.result,
          error: data.error,
          execution_time: data.execution_time_ms,
        };
        setMessages((prev) => [...prev, agentMessage]);
        
        // Refresh metrics
        queryClient.invalidateQueries('systemMetrics');
        queryClient.invalidateQueries('agents');
      },
      onError: (error: any) => {
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'system',
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      },
    }
  );

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'system',
      content: 'Welcome to Spirit Tours AI Agents Dashboard! Select an agent to get started.',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Group agents by category
  const agentsByCategory = agents.reduce((acc, agent) => {
    const category = agent.name.split('_').slice(-1)[0]; // Simple categorization
    const categoryName = 
      agent.name.includes('itinerary') || agent.name.includes('weather') || agent.name.includes('cultural') ? 'tourism' :
      agent.name.includes('reservation') || agent.name.includes('driver') || agent.name.includes('guide') ? 'operations' :
      agent.name.includes('revenue') || agent.name.includes('demand') || agent.name.includes('pricing') ? 'analytics' :
      'marketing';
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !selectedAgent) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Parse input as JSON or create simple query
    let request: AgentRequest;
    try {
      request = JSON.parse(inputValue);
    } catch {
      // Default to query intent with text as parameter
      request = {
        intent: 'query',
        parameters: { query: inputValue },
      };
    }

    // Execute agent
    executeAgentMutation.mutate({
      agentName: selectedAgent.name,
      request,
    });

    setInputValue('');
  };

  const handleQuickAction = (intent: string, parameters: Record<string, any>) => {
    if (!selectedAgent) return;

    const quickActionMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `Quick action: ${intent}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, quickActionMessage]);

    executeAgentMutation.mutate({
      agentName: selectedAgent.name,
      request: { intent, parameters },
    });
  };

  const renderAgentList = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 2 }}>
        AI Agents ({agents.length})
      </Typography>
      <Divider />
      {Object.entries(agentsByCategory).map(([category, categoryAgents]) => (
        <Box key={category}>
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.100' }}>
            <Box display="flex" alignItems="center" gap={1}>
              {categoryIcons[category]}
              <Typography variant="subtitle2" textTransform="capitalize">
                {category} ({categoryAgents.length})
              </Typography>
            </Box>
          </Box>
          <List dense>
            {categoryAgents.map((agent) => (
              <ListItem key={agent.name} disablePadding>
                <ListItemButton
                  selected={selectedAgent?.name === agent.name}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <ListItemIcon>
                    <Badge
                      badgeContent={agent.metrics.execution_count}
                      color="primary"
                      max={999}
                    >
                      <Avatar
                        sx={{
                          bgcolor:
                            agent.status === 'processing'
                              ? 'warning.main'
                              : agent.status === 'error'
                              ? 'error.main'
                              : 'success.main',
                          width: 32,
                          height: 32,
                        }}
                      >
                        {categoryIcons[category]}
                      </Avatar>
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" noWrap>
                        {agent.name.replace(/_/g, ' ').replace(/agent/g, '').trim()}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {(agent.metrics.success_rate * 100).toFixed(1)}% success
                      </Typography>
                    }
                  />
                  <Chip
                    label={agent.status}
                    size="small"
                    color={
                      agent.status === 'processing'
                        ? 'warning'
                        : agent.status === 'error'
                        ? 'error'
                        : 'default'
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );

  const renderAgentInfo = () => {
    if (!selectedAgent) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
          gap={2}
        >
          <SmartToy sx={{ fontSize: 80, color: 'grey.300' }} />
          <Typography variant="h6" color="text.secondary">
            Select an agent to start
          </Typography>
        </Box>
      );
    }

    return (
      <Box p={2}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <SmartToy />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6">
              {selectedAgent.name.replace(/_/g, ' ').replace(/agent/g, '').trim()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedAgent.description}
            </Typography>
          </Box>
          <Chip label={`v${selectedAgent.version}`} size="small" />
        </Box>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="h6">{selectedAgent.metrics.execution_count}</Typography>
              <Typography variant="caption" color="text.secondary">
                Executions
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="h6">
                {(selectedAgent.metrics.success_rate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Success Rate
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="h6">
                {selectedAgent.metrics.avg_execution_time_ms.toFixed(0)}ms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg Time
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={3}>
            <Paper sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="h6">{selectedAgent.metrics.error_count}</Typography>
              <Typography variant="caption" color="text.secondary">
                Errors
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Capabilities
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {selectedAgent.capabilities.map((cap) => (
              <Chip key={cap} label={cap} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>

        {selectedAgent.name === 'itinerary_planner' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  handleQuickAction('suggest_stops', {
                    current_location: [35.2137, 31.7683],
                    interests: ['history', 'culture'],
                    max_results: 5,
                  })
                }
              >
                Suggest Stops
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  handleQuickAction('create_itinerary', {
                    start_location: [35.2137, 31.7683],
                    duration_days: 3,
                    interests: ['history', 'culture'],
                    pace: 'moderate',
                  })
                }
              >
                Create 3-Day Itinerary
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isAgent = message.type === 'agent';

    return (
      <Box
        key={message.id}
        display="flex"
        justifyContent={isUser ? 'flex-end' : 'flex-start'}
        mb={2}
      >
        <Box maxWidth="70%">
          {isAgent && (
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                <SmartToy sx={{ fontSize: 16 }} />
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {message.agent}
              </Typography>
              {message.execution_time && (
                <Chip
                  label={`${message.execution_time.toFixed(0)}ms`}
                  size="small"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          )}
          <Paper
            sx={{
              p: 1.5,
              bgcolor: isUser ? 'primary.main' : isAgent ? 'grey.100' : 'info.light',
              color: isUser ? 'primary.contrastText' : 'text.primary',
            }}
          >
            <Typography variant="body2">{message.content}</Typography>
            {message.result && (
              <Box mt={1}>
                <Divider sx={{ my: 1 }} />
                <pre
                  style={{
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(message.result, null, 2)}
                </pre>
              </Box>
            )}
            {message.error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {message.error}
              </Alert>
            )}
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderSystemMetrics = () => {
    if (!systemMetrics) return null;

    return (
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          System Metrics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Assessment color="primary" />
                  <Typography variant="subtitle2">Total Agents</Typography>
                </Box>
                <Typography variant="h4">{systemMetrics.total_agents}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Speed color="success" />
                  <Typography variant="subtitle2">Executions</Typography>
                </Box>
                <Typography variant="h4">{systemMetrics.total_executions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUp color="primary" />
                  <Typography variant="subtitle2">Success Rate</Typography>
                </Box>
                <Typography variant="h4">
                  {(systemMetrics.overall_success_rate * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Psychology color="secondary" />
                  <Typography variant="subtitle2">Capabilities</Typography>
                </Box>
                <Typography variant="h4">{systemMetrics.total_capabilities}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <SmartToy sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5">AI Agents Dashboard</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Spirit Tours Intelligent Agent System
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh">
              <IconButton
                color="inherit"
                onClick={() => {
                  queryClient.invalidateQueries('agents');
                  queryClient.invalidateQueries('systemMetrics');
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="API Documentation">
              <IconButton color="inherit">
                <Api />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box flex={1} display="flex" overflow="hidden">
        {/* Left Sidebar - Agent List */}
        <Paper
          sx={{
            width: 300,
            borderRadius: 0,
            overflow: 'auto',
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          {agentsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            renderAgentList()
          )}
        </Paper>

        {/* Center - Chat Interface */}
        <Box flex={1} display="flex" flexDirection="column">
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Chat" />
            <Tab label="Info" />
          </Tabs>

          <Divider />

          {tabValue === 0 ? (
            <>
              {/* Messages Area */}
              <Box flex={1} p={2} overflow="auto" bgcolor="grey.50">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box p={2} bgcolor="background.paper" borderTop={1} borderColor="divider">
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={
                      selectedAgent
                        ? 'Type your message or JSON request...'
                        : 'Select an agent first'
                    }
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!selectedAgent || executeAgentMutation.isLoading}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!selectedAgent || !inputValue.trim() || executeAgentMutation.isLoading}
                  >
                    {executeAgentMutation.isLoading ? <CircularProgress size={24} /> : <Send />}
                  </IconButton>
                  <IconButton onClick={() => setInputValue('')}>
                    <Clear />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box overflow="auto">{renderAgentInfo()}</Box>
          )}
        </Box>

        {/* Right Sidebar - System Metrics */}
        <Paper
          sx={{
            width: 400,
            borderRadius: 0,
            overflow: 'auto',
            borderLeft: 1,
            borderColor: 'divider',
          }}
        >
          {renderSystemMetrics()}
        </Paper>
      </Box>
    </Box>
  );
};

export default AgentDashboard;
