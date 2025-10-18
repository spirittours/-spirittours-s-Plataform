/**
 * Admin Training Dashboard
 * Panel administrativo para gestión completa del sistema de capacitación
 * 
 * Características:
 * - CRUD completo de módulos y lecciones
 * - Monitoreo de progreso de todos los empleados
 * - Estadísticas y analytics del sistema
 * - Configuración global del sistema
 * - Gestión de usuarios atrasados
 * - Creación de quizzes con preguntas
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Stack,
  Alert,
  Switch,
  FormControlLabel,
  LinearProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Menu,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  School as SchoolIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  Quiz as QuizIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import axios from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

interface Module {
  id: string;
  title: string;
  description: string;
  category: 'obligatory' | 'important' | 'basic';
  estimated_hours: number;
  position: number;
  passing_score: number;
  is_active: boolean;
  icon?: string;
  color?: string;
  tags?: string[];
  prerequisites?: string[];
  created_at: string;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  content_type: 'video' | 'document' | 'article' | 'quiz' | 'simulation' | 'interactive' | 'presentation' | 'external_link';
  content_url?: string;
  content_text?: string;
  estimated_minutes: number;
  position: number;
  is_required: boolean;
}

interface UserProgress {
  user_id: string;
  user_name: string;
  user_email: string;
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  progress_percentage: number;
  overdue_modules: number;
  last_activity?: string;
}

interface SystemStats {
  total_modules: number;
  total_lessons: number;
  total_users_in_training: number;
  completed_category_a: number;
  users_with_overdue: number;
  average_completion_percentage: number;
  total_certifications_issued: number;
}

interface Configuration {
  id: string;
  mandatory_mode_enabled: boolean;
  block_system_until_complete: boolean;
  category_b_deadline_days: number;
  reminders_enabled: boolean;
  reminder_frequency_days: number;
  gamification_enabled: boolean;
  points_per_lesson: number;
  points_per_module: number;
  points_per_quiz: number;
}

interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_ended';
  options: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminTrainingDashboard: React.FC = () => {
  // State Management
  const [currentTab, setCurrentTab] = useState(0);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form States
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    category: 'basic' as 'obligatory' | 'important' | 'basic',
    estimated_hours: 1,
    passing_score: 85,
    position: 0,
    icon: '📚',
    color: '#1976d2',
    tags: [] as string[],
    prerequisites: [] as string[],
  });

  const [lessonForm, setLessonForm] = useState({
    module_id: '',
    title: '',
    description: '',
    content_type: 'article' as Lesson['content_type'],
    content_url: '',
    content_text: '',
    estimated_minutes: 30,
    position: 0,
    is_required: true,
  });

  const [quizForm, setQuizForm] = useState({
    module_id: '',
    title: '',
    description: '',
    passing_score: 80,
    max_attempts: 3,
    time_limit_minutes: 30,
    questions: [] as QuizQuestion[],
  });

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
    explanation: '',
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadModules(),
        loadSystemStats(),
        loadConfiguration(),
        loadUserProgress(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/admin/modules`);
      setModules(response.data);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/admin/stats/overview`);
      setSystemStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadConfiguration = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/admin/configuration`);
      setConfiguration(response.data);
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const loadUserProgress = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/admin/users/progress`);
      setUserProgress(response.data);
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const loadModuleLessons = async (moduleId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/admin/modules/${moduleId}/lessons`);
      setLessons(response.data);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  // ============================================================================
  // MODULE CRUD
  // ============================================================================

  const handleCreateModule = () => {
    setIsEditMode(false);
    setModuleForm({
      title: '',
      description: '',
      category: 'basic',
      estimated_hours: 1,
      passing_score: 85,
      position: modules.length,
      icon: '📚',
      color: '#1976d2',
      tags: [],
      prerequisites: [],
    });
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setIsEditMode(true);
    setSelectedModule(module);
    setModuleForm({
      title: module.title,
      description: module.description,
      category: module.category,
      estimated_hours: module.estimated_hours,
      passing_score: module.passing_score,
      position: module.position,
      icon: module.icon || '📚',
      color: module.color || '#1976d2',
      tags: module.tags || [],
      prerequisites: module.prerequisites || [],
    });
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    try {
      if (isEditMode && selectedModule) {
        await axios.put(`${API_BASE}/api/training/admin/modules/${selectedModule.id}`, moduleForm);
      } else {
        await axios.post(`${API_BASE}/api/training/admin/modules`, moduleForm);
      }
      await loadModules();
      setModuleDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar módulo');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este módulo? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/api/training/admin/modules/${moduleId}`);
      await loadModules();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al eliminar módulo');
    }
  };

  // ============================================================================
  // LESSON CRUD
  // ============================================================================

  const handleCreateLesson = (moduleId: string) => {
    setLessonForm({
      module_id: moduleId,
      title: '',
      description: '',
      content_type: 'article',
      content_url: '',
      content_text: '',
      estimated_minutes: 30,
      position: lessons.length,
      is_required: true,
    });
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    try {
      await axios.post(`${API_BASE}/api/training/admin/lessons`, lessonForm);
      if (lessonForm.module_id) {
        await loadModuleLessons(lessonForm.module_id);
      }
      setLessonDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar lección');
    }
  };

  // ============================================================================
  // QUIZ CREATION
  // ============================================================================

  const handleCreateQuiz = (moduleId: string) => {
    setQuizForm({
      module_id: moduleId,
      title: '',
      description: '',
      passing_score: 80,
      max_attempts: 3,
      time_limit_minutes: 30,
      questions: [],
    });
    setQuizDialogOpen(true);
  };

  const handleAddQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [...quizForm.questions, { ...currentQuestion }],
    });
    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
      explanation: '',
    });
  };

  const handleSaveQuiz = async () => {
    try {
      await axios.post(`${API_BASE}/api/training/admin/quizzes`, quizForm);
      setQuizDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al crear quiz');
    }
  };

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const handleSaveConfiguration = async () => {
    if (!configuration) return;
    try {
      await axios.put(`${API_BASE}/api/training/admin/configuration`, configuration);
      setConfigDialogOpen(false);
      alert('Configuración guardada exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar configuración');
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'obligatory': return '#d32f2f';
      case 'important': return '#f57c00';
      case 'basic': return '#1976d2';
      default: return '#757575';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'obligatory': return 'OBLIGATORIO';
      case 'important': return 'IMPORTANTE';
      case 'basic': return 'BÁSICO';
      default: return category;
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderStatsCards = () => {
    if (!systemStats) return null;

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SchoolIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{systemStats.total_modules}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Módulos Totales
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{systemStats.total_users_in_training}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usuarios en Capacitación
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <WarningIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{systemStats.users_with_overdue}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Usuarios Atrasados
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrophyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{systemStats.total_certifications_issued}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Certificaciones Emitidas
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Progreso Promedio del Sistema
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={systemStats.average_completion_percentage} 
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>
                <Typography variant="h6" color="primary">
                  {systemStats.average_completion_percentage.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderModulesTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Gestión de Módulos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateModule}
        >
          Crear Módulo
        </Button>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Horas Est.</TableCell>
              <TableCell>Posición</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{module.icon || '📚'}</span>
                    <Typography variant="body2">{module.title}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getCategoryLabel(module.category)}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(module.category),
                      color: 'white',
                    }}
                  />
                </TableCell>
                <TableCell>{module.estimated_hours}h</TableCell>
                <TableCell>{module.position}</TableCell>
                <TableCell>
                  <Chip
                    label={module.is_active ? 'Activo' : 'Inactivo'}
                    size="small"
                    color={module.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver Lecciones">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedModule(module);
                        loadModuleLessons(module.id);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => handleEditModule(module)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Crear Quiz">
                    <IconButton size="small" onClick={() => handleCreateQuiz(module.id)}>
                      <QuizIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => handleDeleteModule(module.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Lessons Panel */}
      {selectedModule && lessons.length > 0 && (
        <Paper sx={{ mt: 3, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Lecciones de: {selectedModule.title}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleCreateLesson(selectedModule.id)}
            >
              Agregar Lección
            </Button>
          </Stack>
          <List>
            {lessons.map((lesson, index) => (
              <ListItem key={lesson.id}>
                <ListItemIcon>{index + 1}</ListItemIcon>
                <ListItemText
                  primary={lesson.title}
                  secondary={`${lesson.content_type} • ${lesson.estimated_minutes} min`}
                />
                {lesson.is_required && (
                  <Chip label="Requerido" size="small" color="error" />
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );

  const renderUsersTab = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Progreso de Usuarios
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Completados</TableCell>
              <TableCell>En Progreso</TableCell>
              <TableCell>Progreso %</TableCell>
              <TableCell>Atrasados</TableCell>
              <TableCell>Última Actividad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userProgress
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.user_name}</TableCell>
                  <TableCell>{user.user_email}</TableCell>
                  <TableCell>
                    {user.completed_modules}/{user.total_modules}
                  </TableCell>
                  <TableCell>{user.in_progress_modules}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={user.progress_percentage}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="caption">
                        {user.progress_percentage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {user.overdue_modules > 0 && (
                      <Chip
                        label={user.overdue_modules}
                        size="small"
                        color="error"
                        icon={<WarningIcon />}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_activity
                      ? new Date(user.last_activity).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={userProgress.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Box>
  );

  const renderConfigurationTab = () => {
    if (!configuration) return null;

    return (
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6">Configuración del Sistema</Typography>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Editar Configuración
          </Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Modo Obligatorio
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.mandatory_mode_enabled}
                      disabled
                    />
                  }
                  label="Modo obligatorio activado"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {configuration.mandatory_mode_enabled
                    ? 'Los empleados deben completar la capacitación obligatoria'
                    : 'El sistema no requiere capacitación obligatoria'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bloqueo del Sistema
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.block_system_until_complete}
                      disabled
                    />
                  }
                  label="Bloquear sistema hasta completar"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {configuration.block_system_until_complete
                    ? 'El acceso al sistema está bloqueado hasta completar Categoría A'
                    : 'Los empleados pueden acceder al sistema sin completar capacitación'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recordatorios
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.reminders_enabled}
                      disabled
                    />
                  }
                  label="Recordatorios automáticos activados"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Frecuencia: cada {configuration.reminder_frequency_days} días
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gamificación
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={configuration.gamification_enabled}
                      disabled
                    />
                  }
                  label="Sistema de puntos activado"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  • Lección: {configuration.points_per_lesson} pts<br />
                  • Módulo: {configuration.points_per_module} pts<br />
                  • Quiz: {configuration.points_per_quiz} pts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ============================================================================
  // MODULE DIALOG
  // ============================================================================

  const renderModuleDialog = () => (
    <Dialog open={moduleDialogOpen} onClose={() => setModuleDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Editar Módulo' : 'Crear Nuevo Módulo'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descripción"
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={moduleForm.category}
                onChange={(e) => setModuleForm({ ...moduleForm, category: e.target.value as any })}
              >
                <MenuItem value="obligatory">Obligatorio</MenuItem>
                <MenuItem value="important">Importante</MenuItem>
                <MenuItem value="basic">Básico</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Horas Estimadas"
              value={moduleForm.estimated_hours}
              onChange={(e) => setModuleForm({ ...moduleForm, estimated_hours: parseFloat(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Puntaje Mínimo (%)"
              value={moduleForm.passing_score}
              onChange={(e) => setModuleForm({ ...moduleForm, passing_score: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Posición"
              value={moduleForm.position}
              onChange={(e) => setModuleForm({ ...moduleForm, position: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ícono (emoji)"
              value={moduleForm.icon}
              onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Color (hex)"
              value={moduleForm.color}
              onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setModuleDialogOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleSaveModule}>
          {isEditMode ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // LESSON DIALOG
  // ============================================================================

  const renderLessonDialog = () => (
    <Dialog open={lessonDialogOpen} onClose={() => setLessonDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Crear Nueva Lección</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título"
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Descripción"
              value={lessonForm.description}
              onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Contenido</InputLabel>
              <Select
                value={lessonForm.content_type}
                onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value as any })}
              >
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="document">Documento</MenuItem>
                <MenuItem value="article">Artículo</MenuItem>
                <MenuItem value="quiz">Quiz</MenuItem>
                <MenuItem value="presentation">Presentación</MenuItem>
                <MenuItem value="external_link">Enlace Externo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Duración (minutos)"
              value={lessonForm.estimated_minutes}
              onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="URL del Contenido"
              value={lessonForm.content_url}
              onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })}
              helperText="URL de video, PDF, enlace externo, etc."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Contenido de Texto"
              value={lessonForm.content_text}
              onChange={(e) => setLessonForm({ ...lessonForm, content_text: e.target.value })}
              helperText="Para artículos, usa HTML"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={lessonForm.is_required}
                  onChange={(e) => setLessonForm({ ...lessonForm, is_required: e.target.checked })}
                />
              }
              label="Lección requerida"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLessonDialogOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleSaveLesson}>
          Crear Lección
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // QUIZ DIALOG
  // ============================================================================

  const renderQuizDialog = () => (
    <Dialog open={quizDialogOpen} onClose={() => setQuizDialogOpen(false)} maxWidth="lg" fullWidth>
      <DialogTitle>Crear Quiz</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título del Quiz"
              value={quizForm.title}
              onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Descripción"
              value={quizForm.description}
              onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              type="number"
              label="Puntaje Mínimo (%)"
              value={quizForm.passing_score}
              onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              type="number"
              label="Intentos Máximos"
              value={quizForm.max_attempts}
              onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth
              type="number"
              label="Tiempo Límite (min)"
              value={quizForm.time_limit_minutes}
              onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) })}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Agregar Pregunta
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Texto de la Pregunta"
              value={currentQuestion.question_text}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Pregunta</InputLabel>
              <Select
                value={currentQuestion.question_type}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_type: e.target.value as any })}
              >
                <MenuItem value="multiple_choice">Opción Múltiple</MenuItem>
                <MenuItem value="true_false">Verdadero/Falso</MenuItem>
                <MenuItem value="open_ended">Respuesta Abierta</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Puntos"
              value={currentQuestion.points}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) })}
            />
          </Grid>

          {currentQuestion.question_type === 'multiple_choice' && (
            <>
              {currentQuestion.options.map((option, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <TextField
                    fullWidth
                    label={`Opción ${index + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...currentQuestion.options];
                      newOptions[index] = e.target.value;
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                  />
                </Grid>
              ))}
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Respuesta Correcta"
              value={currentQuestion.correct_answer}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <Button variant="outlined" onClick={handleAddQuestion} fullWidth>
              Agregar Pregunta al Quiz
            </Button>
          </Grid>

          {quizForm.questions.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Preguntas Agregadas: {quizForm.questions.length}
                </Typography>
                <List>
                  {quizForm.questions.map((q, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${index + 1}. ${q.question_text}`}
                        secondary={`Tipo: ${q.question_type} • Puntos: ${q.points}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setQuizDialogOpen(false)}>Cancelar</Button>
        <Button 
          variant="contained" 
          onClick={handleSaveQuiz}
          disabled={quizForm.questions.length === 0}
        >
          Crear Quiz ({quizForm.questions.length} preguntas)
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // CONFIGURATION DIALOG
  // ============================================================================

  const renderConfigurationDialog = () => (
    <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Configuración del Sistema</DialogTitle>
      <DialogContent dividers>
        {configuration && (
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={configuration.mandatory_mode_enabled}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      mandatory_mode_enabled: e.target.checked,
                    })
                  }
                />
              }
              label="Activar Modo Obligatorio"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={configuration.block_system_until_complete}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      block_system_until_complete: e.target.checked,
                    })
                  }
                />
              }
              label="Bloquear Sistema hasta Completar"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={configuration.reminders_enabled}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      reminders_enabled: e.target.checked,
                    })
                  }
                />
              }
              label="Activar Recordatorios Automáticos"
            />

            <TextField
              fullWidth
              type="number"
              label="Frecuencia de Recordatorios (días)"
              value={configuration.reminder_frequency_days}
              onChange={(e) =>
                setConfiguration({
                  ...configuration,
                  reminder_frequency_days: parseInt(e.target.value),
                })
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={configuration.gamification_enabled}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      gamification_enabled: e.target.checked,
                    })
                  }
                />
              }
              label="Activar Gamificación"
            />

            <TextField
              fullWidth
              type="number"
              label="Puntos por Lección"
              value={configuration.points_per_lesson}
              onChange={(e) =>
                setConfiguration({
                  ...configuration,
                  points_per_lesson: parseInt(e.target.value),
                })
              }
            />

            <TextField
              fullWidth
              type="number"
              label="Puntos por Módulo"
              value={configuration.points_per_module}
              onChange={(e) =>
                setConfiguration({
                  ...configuration,
                  points_per_module: parseInt(e.target.value),
                })
              }
            />

            <TextField
              fullWidth
              type="number"
              label="Deadline Categoría B (días)"
              value={configuration.category_b_deadline_days}
              onChange={(e) =>
                setConfiguration({
                  ...configuration,
                  category_b_deadline_days: parseInt(e.target.value),
                })
              }
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={handleSaveConfiguration}>
          Guardar Configuración
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Typography>Cargando...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          🎓 Admin - Sistema de Capacitación
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión completa de módulos, lecciones y progreso de usuarios
        </Typography>
      </Box>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Módulos y Lecciones" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="Progreso de Usuarios" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="Configuración" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && renderModulesTab()}
        {currentTab === 1 && renderUsersTab()}
        {currentTab === 2 && renderConfigurationTab()}
      </Box>

      {/* Dialogs */}
      {renderModuleDialog()}
      {renderLessonDialog()}
      {renderQuizDialog()}
      {renderConfigurationDialog()}
    </Container>
  );
};

export default AdminTrainingDashboard;
