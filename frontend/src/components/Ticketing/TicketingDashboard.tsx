/**
 * Dashboard de Sistema de Ticketing
 * Vista principal para empleados: gestión de tareas, tickets y seguimiento
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tab,
  Tabs,
  Badge,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Alert,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Group as GroupIcon,
  ArrowUpward as ArrowUpwardIcon,
  CheckBox as CheckBoxIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import axios from 'axios';

// ============================================================================
// TIPOS Y ENUMS
// ============================================================================

enum TicketStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  BLOCKED = 'blocked',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

enum TicketPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  BACKLOG = 'backlog'
}

enum TicketType {
  TASK = 'task',
  BUG = 'bug',
  FEATURE = 'feature',
  IMPROVEMENT = 'improvement',
  SUPPORT = 'support',
  MAINTENANCE = 'maintenance',
  DOCUMENTATION = 'documentation',
  RESEARCH = 'research'
}

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  ticket_type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to_id?: string;
  department_id?: string;
  due_date?: string;
  completion_percentage: number;
  ai_priority_score?: number;
  ai_estimated_completion?: string;
  created_at: string;
  updated_at: string;
  created_by_id: string;
}

interface TicketStats {
  total_assigned: number;
  open_tickets: number;
  in_progress_tickets: number;
  completed_tickets: number;
  overdue_tickets: number;
  high_priority_tickets: number;
  completion_rate: number;
}

// ============================================================================
// UTILIDADES
// ============================================================================

const getPriorityColor = (priority: TicketPriority): string => {
  const colors = {
    [TicketPriority.CRITICAL]: '#d32f2f',
    [TicketPriority.HIGH]: '#f57c00',
    [TicketPriority.MEDIUM]: '#fbc02d',
    [TicketPriority.LOW]: '#388e3c',
    [TicketPriority.BACKLOG]: '#757575'
  };
  return colors[priority] || '#757575';
};

const getStatusColor = (status: TicketStatus): string => {
  const colors = {
    [TicketStatus.DRAFT]: '#9e9e9e',
    [TicketStatus.OPEN]: '#2196f3',
    [TicketStatus.ASSIGNED]: '#03a9f4',
    [TicketStatus.IN_PROGRESS]: '#ff9800',
    [TicketStatus.PENDING_REVIEW]: '#9c27b0',
    [TicketStatus.BLOCKED]: '#f44336',
    [TicketStatus.ESCALATED]: '#e91e63',
    [TicketStatus.RESOLVED]: '#4caf50',
    [TicketStatus.CLOSED]: '#00796b',
    [TicketStatus.CANCELLED]: '#616161'
  };
  return colors[status] || '#757575';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const TicketingDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Nuevo ticket
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    ticket_type: TicketType.TASK,
    priority: TicketPriority.MEDIUM,
    due_date: ''
  });

  // ========================================================================
  // EFECTOS
  // ========================================================================

  useEffect(() => {
    loadStats();
    loadTickets();
  }, [currentTab, statusFilter, priorityFilter]);

  // ========================================================================
  // FUNCIONES DE CARGA
  // ========================================================================

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/ticketing/stats/me');
      setStats(response.data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        skip: 0,
        limit: 50
      };

      // Filtro por tab
      if (currentTab === 0) {
        params.assigned_to_me = true;
        params.include_completed = false;
      } else if (currentTab === 1) {
        params.assigned_to_me = true;
        params.overdue_only = true;
      } else if (currentTab === 2) {
        params.assigned_to_me = true;
        params.status = TicketStatus.RESOLVED;
      } else if (currentTab === 3) {
        params.created_by_me = true;
      }

      // Filtros adicionales
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }

      const response = await axios.get('/api/ticketing/tickets', { params });
      setTickets(response.data.tickets || []);
      
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError('Error cargando tickets. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // ACCIONES DE TICKET
  // ========================================================================

  const handleCreateTicket = async () => {
    try {
      const response = await axios.post('/api/ticketing/tickets', newTicket);
      setCreateDialogOpen(false);
      setNewTicket({
        title: '',
        description: '',
        ticket_type: TicketType.TASK,
        priority: TicketPriority.MEDIUM,
        due_date: ''
      });
      loadTickets();
      loadStats();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      alert('Error creando ticket: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleStartTicket = async (ticketId: string) => {
    try {
      await axios.post(`/api/ticketing/tickets/${ticketId}/start`);
      loadTickets();
      loadStats();
    } catch (err: any) {
      console.error('Error starting ticket:', err);
      alert('Error iniciando ticket: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCompleteTicket = async (ticketId: string) => {
    const notes = prompt('Notas de resolución (opcional):');
    try {
      await axios.post(`/api/ticketing/tickets/${ticketId}/complete`, {
        resolution_notes: notes || undefined
      });
      loadTickets();
      loadStats();
    } catch (err: any) {
      console.error('Error completing ticket:', err);
      alert('Error completando ticket: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEscalateTicket = async (ticketId: string) => {
    // TODO: Mostrar dialog para seleccionar a quién escalar
    alert('Función de escalación - Próximamente');
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailDialogOpen(true);
  };

  // ========================================================================
  // RENDERIZADO - CARDS DE ESTADÍSTICAS
  // ========================================================================

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.open_tickets + stats.in_progress_tickets}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activos
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 48, color: '#2196f3' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.overdue_tickets}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vencidos
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: 48, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.high_priority_tickets}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alta Prioridad
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 48, color: '#9c27b0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.completion_rate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasa Completitud
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // ========================================================================
  // RENDERIZADO - LISTA DE TICKETS
  // ========================================================================

  const renderTicketCard = (ticket: Ticket) => {
    const overdue = isOverdue(ticket.due_date);
    
    return (
      <Card 
        key={ticket.id} 
        sx={{ 
          mb: 2,
          borderLeft: `4px solid ${getPriorityColor(ticket.priority)}`,
          '&:hover': {
            boxShadow: 6,
            cursor: 'pointer'
          }
        }}
        onClick={() => handleViewTicket(ticket)}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Chip 
                  label={ticket.ticket_number} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Chip 
                  label={ticket.priority.toUpperCase()} 
                  size="small" 
                  sx={{ 
                    bgcolor: getPriorityColor(ticket.priority),
                    color: 'white'
                  }}
                />
                <Chip 
                  label={ticket.status} 
                  size="small" 
                  sx={{ 
                    bgcolor: getStatusColor(ticket.status),
                    color: 'white'
                  }}
                />
                {overdue && (
                  <Chip 
                    label="VENCIDO" 
                    size="small" 
                    color="error"
                    icon={<WarningIcon />}
                  />
                )}
              </Box>
              
              <Typography variant="h6" gutterBottom>
                {ticket.title}
              </Typography>
              
              {ticket.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.description.substring(0, 150)}
                  {ticket.description.length > 150 ? '...' : ''}
                </Typography>
              )}
              
              <Box display="flex" gap={2} mt={2}>
                <Tooltip title="Tipo">
                  <Chip 
                    label={ticket.ticket_type} 
                    size="small"
                    variant="outlined"
                  />
                </Tooltip>
                
                {ticket.due_date && (
                  <Tooltip title="Fecha límite">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <ScheduleIcon fontSize="small" color={overdue ? 'error' : 'action'} />
                      <Typography variant="caption" color={overdue ? 'error' : 'text.secondary'}>
                        {formatDate(ticket.due_date)}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
                
                {ticket.ai_priority_score && (
                  <Tooltip title="Score de Prioridad IA">
                    <Chip 
                      label={`AI: ${ticket.ai_priority_score.toFixed(1)}`} 
                      size="small"
                      color="secondary"
                    />
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box display="flex" flexDirection="column" gap={1} ml={2}>
              {ticket.status === TicketStatus.ASSIGNED && (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartTicket(ticket.id);
                  }}
                >
                  Iniciar
                </Button>
              )}
              
              {ticket.status === TicketStatus.IN_PROGRESS && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompleteTicket(ticket.id);
                  }}
                >
                  Completar
                </Button>
              )}
              
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowUpwardIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEscalateTicket(ticket.id);
                }}
              >
                Escalar
              </Button>
            </Box>
          </Box>

          {ticket.completion_percentage > 0 && (
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption">Progreso</Typography>
                <Typography variant="caption">{ticket.completion_percentage}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={ticket.completion_percentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // ========================================================================
  // RENDERIZADO - DIALOGS
  // ========================================================================

  const renderCreateDialog = () => (
    <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Crear Nuevo Ticket</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Título"
            fullWidth
            required
            value={newTicket.title}
            onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
          />
          
          <TextField
            label="Descripción"
            fullWidth
            multiline
            rows={4}
            value={newTicket.description}
            onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
          />
          
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={newTicket.ticket_type}
              label="Tipo"
              onChange={(e) => setNewTicket({ ...newTicket, ticket_type: e.target.value as TicketType })}
            >
              {Object.values(TicketType).map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Prioridad</InputLabel>
            <Select
              value={newTicket.priority}
              label="Prioridad"
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as TicketPriority })}
            >
              {Object.values(TicketPriority).map(priority => (
                <MenuItem key={priority} value={priority}>{priority.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Fecha Límite"
            type="datetime-local"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={newTicket.due_date}
            onChange={(e) => setNewTicket({ ...newTicket, due_date: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
        <Button 
          onClick={handleCreateTicket} 
          variant="contained"
          disabled={!newTicket.title}
        >
          Crear Ticket
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDetailDialog = () => {
    if (!selectedTicket) return null;
    
    return (
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">{selectedTicket.ticket_number}</Typography>
            <Chip label={selectedTicket.status} size="small" />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="h6">{selectedTicket.title}</Typography>
            <Typography variant="body1">{selectedTicket.description}</Typography>
            
            <Divider />
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip label={`Tipo: ${selectedTicket.ticket_type}`} />
              <Chip label={`Prioridad: ${selectedTicket.priority}`} color="primary" />
              {selectedTicket.due_date && (
                <Chip label={`Vence: ${formatDate(selectedTicket.due_date)}`} />
              )}
            </Box>
            
            {selectedTicket.ai_priority_score && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>IA Score:</strong> {selectedTicket.ai_priority_score.toFixed(2)} | 
                  {selectedTicket.ai_estimated_completion && (
                    <> <strong>Estimado:</strong> {formatDate(selectedTicket.ai_estimated_completion)}</>
                  )}
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ========================================================================
  // RENDERIZADO PRINCIPAL
  // ========================================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📋 Mis Tickets y Tareas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Nuevo Ticket
        </Button>
      </Box>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label={
            <Badge badgeContent={stats?.open_tickets || 0} color="primary">
              <span style={{ marginRight: 16 }}>Asignados a Mí</span>
            </Badge>
          } />
          <Tab label={
            <Badge badgeContent={stats?.overdue_tickets || 0} color="error">
              <span style={{ marginRight: 16 }}>Vencidos</span>
            </Badge>
          } />
          <Tab label={
            <Badge badgeContent={stats?.completed_tickets || 0} color="success">
              <span style={{ marginRight: 16 }}>Completados</span>
            </Badge>
          } />
          <Tab label="Creados por Mí" />
        </Tabs>
      </Box>

      {/* Filtros */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          placeholder="Buscar tickets..."
          size="small"
          sx={{ flex: 1 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            value={statusFilter}
            label="Estado"
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
          >
            <MenuItem value="all">Todos</MenuItem>
            {Object.values(TicketStatus).map(status => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Prioridad</InputLabel>
          <Select
            value={priorityFilter}
            label="Prioridad"
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
          >
            <MenuItem value="all">Todas</MenuItem>
            {Object.values(TicketPriority).map(priority => (
              <MenuItem key={priority} value={priority}>{priority.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Lista de Tickets */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No hay tickets en esta vista
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ¡Excelente trabajo! 🎉
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        tickets.map(ticket => renderTicketCard(ticket))
      )}

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderDetailDialog()}
    </Box>
  );
};

export default TicketingDashboard;
