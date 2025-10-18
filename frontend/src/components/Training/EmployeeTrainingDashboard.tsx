/**
 * Employee Training Dashboard
 * Sistema de capacitación para empleados - Vista completa
 * 
 * Características:
 * - Vista de módulos por categoría (Obligatorio/Importante/Básico)
 * - Tracking de progreso con visualización
 * - Interface para tomar lecciones (video, documentos, quiz)
 * - Sistema de certificaciones
 * - Gamificación (puntos, achievements, leaderboard)
 * - Control de acceso al sistema
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Avatar,
  Badge,
  Stack,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  School as SchoolIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  Timer as TimerIcon,
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  VideoLibrary as VideoIcon,
  Description as DocIcon,
  Quiz as QuizIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Leaderboard as LeaderboardIcon,
  CardGiftcard as AchievementIcon,
  TrendingUp as ProgressIcon,
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
  icon: string;
  color: string;
  tags: string[];
  progress?: ModuleProgress;
}

interface ModuleProgress {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  score?: number;
  deadline?: string;
  is_overdue: boolean;
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
  is_completed?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes?: number;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_ended';
  options: string[];
  correct_answer: string;
  points: number;
}

interface Certification {
  id: string;
  level: 'bronze' | 'silver' | 'gold' | 'diamond';
  issued_at: string;
  certificate_number: string;
  expires_at?: string;
}

interface UserStats {
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  total_points: number;
  current_streak: number;
  certifications_earned: number;
  time_spent_hours: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  earned_at: string;
}

interface LeaderboardEntry {
  rank: number;
  user_name: string;
  total_points: number;
  completed_modules: number;
  certifications: number;
}

interface AccessInfo {
  has_access: boolean;
  blocked: boolean;
  reason?: string;
  pending_modules?: string[];
  progress_percentage?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EmployeeTrainingDashboard: React.FC = () => {
  // State Management
  const [currentTab, setCurrentTab] = useState(0);
  const [modules, setModules] = useState<Module[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

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
        loadUserStats(),
        loadCertifications(),
        loadAchievements(),
        loadLeaderboard(),
        checkAccess(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/check-access`);
      setAccessInfo(response.data);
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const loadModules = async (category?: string) => {
    try {
      const params = category ? { category } : {};
      const response = await axios.get(`${API_BASE}/api/training/modules`, { params });
      setModules(response.data);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/my-progress`);
      setUserStats(response.data);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadCertifications = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/my-certifications`);
      setCertifications(response.data);
    } catch (error) {
      console.error('Error loading certifications:', error);
    }
  };

  const loadAchievements = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/my-achievements`);
      setAchievements(response.data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/training/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // ============================================================================
  // MODULE ACTIONS
  // ============================================================================

  const handleStartModule = async (moduleId: string) => {
    try {
      await axios.post(`${API_BASE}/api/training/modules/${moduleId}/start`);
      await loadModules();
      await loadUserStats();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al iniciar módulo');
    }
  };

  const handleOpenModule = async (module: Module) => {
    setSelectedModule(module);
    try {
      const response = await axios.get(`${API_BASE}/api/training/modules/${module.id}`);
      setLessons(response.data.lessons || []);
      setModuleDialogOpen(true);
    } catch (error) {
      console.error('Error loading module details:', error);
    }
  };

  const handleOpenLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    
    if (lesson.content_type === 'quiz') {
      loadQuizForLesson(lesson.id);
    } else {
      setLessonDialogOpen(true);
    }
  };

  const loadQuizForLesson = async (lessonId: string) => {
    try {
      // Assuming quiz is linked to lesson - adjust endpoint as needed
      const response = await axios.get(`${API_BASE}/api/training/lessons/${lessonId}/quiz`);
      setCurrentQuiz(response.data);
      setQuizAnswers({});
      setQuizDialogOpen(true);
    } catch (error) {
      console.error('Error loading quiz:', error);
    }
  };

  const handleCompleteLesson = async (lessonId: string, timeSpent: number = 0) => {
    try {
      await axios.post(`${API_BASE}/api/training/lessons/${lessonId}/complete`, {
        time_spent: timeSpent,
      });
      
      // Reload data
      await loadModules();
      await loadUserStats();
      
      // Update lessons list
      if (selectedModule) {
        const response = await axios.get(`${API_BASE}/api/training/modules/${selectedModule.id}`);
        setLessons(response.data.lessons || []);
      }
      
      setLessonDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al completar lección');
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/training/quizzes/${currentQuiz.id}/submit`,
        { answers: quizAnswers }
      );
      
      const result = response.data;
      
      alert(`Quiz completado!\nPuntaje: ${result.score}%\n${result.passed ? '¡Aprobado!' : 'No aprobado. Intenta de nuevo.'}`);
      
      if (result.passed) {
        await loadModules();
        await loadUserStats();
      }
      
      setQuizDialogOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al enviar quiz');
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

  const getCertificationColor = (level: string): string => {
    switch (level) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'diamond': return '#b9f2ff';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'in_progress': return <TimerIcon color="warning" />;
      case 'not_started': return <LockIcon color="disabled" />;
      default: return <LockIcon color="disabled" />;
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <VideoIcon />;
      case 'document': return <DocIcon />;
      case 'quiz': return <QuizIcon />;
      default: return <SchoolIcon />;
    }
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} hrs`;
  };

  const getDaysUntilDeadline = (deadline?: string): number => {
    if (!deadline) return 999;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderAccessAlert = () => {
    if (!accessInfo || accessInfo.has_access) return null;

    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Acceso Bloqueado</AlertTitle>
        {accessInfo.reason}
        <LinearProgress 
          variant="determinate" 
          value={accessInfo.progress_percentage || 0} 
          sx={{ mt: 2 }}
        />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Progreso: {accessInfo.progress_percentage?.toFixed(0)}%
        </Typography>
      </Alert>
    );
  };

  const renderStatsCards = () => {
    if (!userStats) return null;

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
                  <Typography variant="h4">{userStats.completed_modules}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Módulos Completados
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
                  <StarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{userStats.total_points}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Puntos Totales
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
                <Badge badgeContent={userStats.current_streak} color="error">
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <FireIcon />
                  </Avatar>
                </Badge>
                <Box>
                  <Typography variant="h4">{userStats.current_streak}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Racha Actual (días)
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
                  <TrophyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">{userStats.certifications_earned}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Certificaciones
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderModuleCard = (module: Module) => {
    const progress = module.progress;
    const isLocked = progress?.status === 'not_started' || !progress;
    const isOverdue = progress?.is_overdue || false;
    const daysLeft = progress?.deadline ? getDaysUntilDeadline(progress.deadline) : null;

    return (
      <Grid item xs={12} md={6} lg={4} key={module.id}>
        <Card 
          sx={{ 
            height: '100%',
            borderLeft: 4,
            borderColor: getCategoryColor(module.category),
            position: 'relative',
            '&:hover': { boxShadow: 6 }
          }}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: module.color || 'primary.main' }}>
                {module.icon || '📚'}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {module.title}
                </Typography>
                <Chip 
                  label={getCategoryLabel(module.category)}
                  size="small"
                  sx={{ 
                    bgcolor: getCategoryColor(module.category),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
              {getStatusIcon(progress?.status)}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {module.description}
            </Typography>

            {progress && (
              <>
                <Box sx={{ mb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption">Progreso</Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {progress.progress_percentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress.progress_percentage} 
                    color={isOverdue ? 'error' : 'primary'}
                  />
                </Box>

                {progress.deadline && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    {isOverdue ? (
                      <WarningIcon color="error" fontSize="small" />
                    ) : (
                      <TimerIcon color="action" fontSize="small" />
                    )}
                    <Typography variant="caption" color={isOverdue ? 'error' : 'text.secondary'}>
                      {isOverdue 
                        ? '¡Vencido!' 
                        : daysLeft !== null && daysLeft < 7
                          ? `${daysLeft} días restantes`
                          : `Plazo: ${new Date(progress.deadline).toLocaleDateString()}`
                      }
                    </Typography>
                  </Stack>
                )}
              </>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip 
                icon={<TimerIcon />}
                label={formatTime(module.estimated_hours)}
                size="small"
                variant="outlined"
              />
              {progress?.score && (
                <Chip 
                  icon={<StarIcon />}
                  label={`${progress.score}%`}
                  size="small"
                  variant="outlined"
                  color={progress.score >= module.passing_score ? 'success' : 'default'}
                />
              )}
            </Stack>
          </CardContent>

          <CardActions>
            {!progress || progress.status === 'not_started' ? (
              <Button 
                fullWidth 
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() => handleStartModule(module.id)}
              >
                Iniciar Módulo
              </Button>
            ) : (
              <Button 
                fullWidth 
                variant="outlined"
                onClick={() => handleOpenModule(module)}
              >
                {progress.status === 'completed' ? 'Ver Contenido' : 'Continuar'}
              </Button>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  };

  const renderModulesTab = () => {
    const filteredModules = modules.filter(m => {
      if (currentTab === 0) return m.category === 'obligatory';
      if (currentTab === 1) return m.category === 'important';
      if (currentTab === 2) return m.category === 'basic';
      return true;
    });

    return (
      <Grid container spacing={3}>
        {filteredModules.map(module => renderModuleCard(module))}
        {filteredModules.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No hay módulos en esta categoría
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderCertificationsTab = () => (
    <Grid container spacing={3}>
      {certifications.map(cert => (
        <Grid item xs={12} sm={6} md={4} key={cert.id}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <TrophyIcon 
              sx={{ 
                fontSize: 80, 
                color: getCertificationColor(cert.level),
                mb: 2 
              }} 
            />
            <Typography variant="h5" gutterBottom sx={{ textTransform: 'uppercase' }}>
              {cert.level}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {cert.certificate_number}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Emitido: {new Date(cert.issued_at).toLocaleDateString()}
            </Typography>
            {cert.expires_at && (
              <Typography variant="caption" display="block" color="warning.main">
                Expira: {new Date(cert.expires_at).toLocaleDateString()}
              </Typography>
            )}
          </Card>
        </Grid>
      ))}
      {certifications.length === 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <TrophyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Aún no tienes certificaciones
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Completa los módulos obligatorios para obtener tu primera certificación
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  const renderLeaderboardTab = () => (
    <Paper>
      <List>
        {leaderboard.map((entry, index) => (
          <React.Fragment key={index}>
            <ListItem>
              <ListItemIcon>
                <Avatar sx={{ 
                  bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'primary.main' 
                }}>
                  {entry.rank}
                </Avatar>
              </ListItemIcon>
              <ListItemText 
                primary={entry.user_name}
                secondary={`${entry.completed_modules} módulos • ${entry.certifications} certificaciones`}
              />
              <Stack alignItems="flex-end" spacing={0.5}>
                <Chip 
                  icon={<StarIcon />}
                  label={`${entry.total_points} pts`}
                  color="primary"
                  size="small"
                />
              </Stack>
            </ListItem>
            {index < leaderboard.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
      {leaderboard.length === 0 && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <LeaderboardIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            El leaderboard estará disponible pronto
          </Typography>
        </Box>
      )}
    </Paper>
  );

  const renderAchievementsTab = () => (
    <Grid container spacing={2}>
      {achievements.map(achievement => (
        <Grid item xs={12} sm={6} md={4} key={achievement.id}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  {achievement.icon || <AchievementIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6">{achievement.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {achievement.description}
                  </Typography>
                  <Chip 
                    label={`+${achievement.points} pts`}
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
      {achievements.length === 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AchievementIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Aún no has desbloqueado logros
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Completa lecciones y módulos para ganar achievements
            </Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  // ============================================================================
  // MODULE DETAIL DIALOG
  // ============================================================================

  const renderModuleDialog = () => (
    <Dialog 
      open={moduleDialogOpen} 
      onClose={() => setModuleDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: selectedModule?.color || 'primary.main' }}>
            {selectedModule?.icon || '📚'}
          </Avatar>
          <Box>
            <Typography variant="h6">{selectedModule?.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {lessons.length} lecciones
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {selectedModule?.description}
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Contenido del Módulo
        </Typography>

        <List>
          {lessons.map((lesson, index) => (
            <React.Fragment key={lesson.id}>
              <ListItem
                button
                onClick={() => handleOpenLesson(lesson)}
                disabled={lesson.is_completed}
              >
                <ListItemIcon>
                  {lesson.is_completed ? (
                    <CheckIcon color="success" />
                  ) : (
                    getContentIcon(lesson.content_type)
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={`${index + 1}. ${lesson.title}`}
                  secondary={`${lesson.estimated_minutes} min • ${lesson.content_type}`}
                />
                {lesson.is_required && (
                  <Chip label="Requerido" size="small" color="error" />
                )}
              </ListItem>
              {index < lessons.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setModuleDialogOpen(false)}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // LESSON CONTENT DIALOG
  // ============================================================================

  const renderLessonDialog = () => (
    <Dialog 
      open={lessonDialogOpen} 
      onClose={() => setLessonDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          {getContentIcon(selectedLesson?.content_type || 'article')}
          <Typography variant="h6">{selectedLesson?.title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {selectedLesson?.content_type === 'video' && selectedLesson.content_url && (
          <Box sx={{ position: 'relative', paddingTop: '56.25%', mb: 3 }}>
            <video
              controls
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <source src={selectedLesson.content_url} type="video/mp4" />
              Tu navegador no soporta video HTML5.
            </video>
          </Box>
        )}

        {selectedLesson?.content_type === 'document' && selectedLesson.content_url && (
          <Box sx={{ height: 600, border: '1px solid #ddd' }}>
            <iframe
              src={selectedLesson.content_url}
              width="100%"
              height="100%"
              title={selectedLesson.title}
            />
          </Box>
        )}

        {selectedLesson?.content_type === 'article' && (
          <Box 
            sx={{ p: 2 }}
            dangerouslySetInnerHTML={{ __html: selectedLesson.content_text || '' }}
          />
        )}

        {selectedLesson?.content_type === 'external_link' && selectedLesson.content_url && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant="body1" paragraph>
              Este contenido está disponible en un enlace externo:
            </Typography>
            <Button
              variant="contained"
              href={selectedLesson.content_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Enlace
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLessonDialogOpen(false)}>
          Cancelar
        </Button>
        <Button 
          variant="contained"
          onClick={() => selectedLesson && handleCompleteLesson(selectedLesson.id, selectedLesson.estimated_minutes)}
          disabled={selectedLesson?.is_completed}
        >
          {selectedLesson?.is_completed ? 'Completado' : 'Marcar como Completado'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================================
  // QUIZ DIALOG
  // ============================================================================

  const renderQuizDialog = () => (
    <Dialog 
      open={quizDialogOpen} 
      onClose={() => setQuizDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <QuizIcon />
          <Box>
            <Typography variant="h6">{currentQuiz?.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {currentQuiz?.questions.length} preguntas • Puntaje mínimo: {currentQuiz?.passing_score}%
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {currentQuiz?.description}
        </Typography>

        {currentQuiz?.time_limit_minutes && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Tiempo límite: {currentQuiz.time_limit_minutes} minutos
          </Alert>
        )}

        {currentQuiz?.questions.map((question, qIndex) => (
          <Accordion key={question.id} defaultExpanded={qIndex === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                Pregunta {qIndex + 1} ({question.points} pts)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" paragraph>
                {question.question_text}
              </Typography>

              {question.question_type === 'multiple_choice' && (
                <FormControl component="fieldset">
                  <RadioGroup
                    value={quizAnswers[question.id] || ''}
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers,
                      [question.id]: e.target.value
                    })}
                  >
                    {question.options.map((option, oIndex) => (
                      <FormControlLabel
                        key={oIndex}
                        value={option}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )}

              {question.question_type === 'true_false' && (
                <FormControl component="fieldset">
                  <RadioGroup
                    value={quizAnswers[question.id] || ''}
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers,
                      [question.id]: e.target.value
                    })}
                  >
                    <FormControlLabel value="Verdadero" control={<Radio />} label="Verdadero" />
                    <FormControlLabel value="Falso" control={<Radio />} label="Falso" />
                  </RadioGroup>
                </FormControl>
              )}

              {question.question_type === 'open_ended' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={quizAnswers[question.id] || ''}
                  onChange={(e) => setQuizAnswers({
                    ...quizAnswers,
                    [question.id]: e.target.value
                  })}
                  placeholder="Escribe tu respuesta aquí..."
                />
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setQuizDialogOpen(false)}>
          Cancelar
        </Button>
        <Button 
          variant="contained"
          onClick={handleSubmitQuiz}
          disabled={Object.keys(quizAnswers).length < (currentQuiz?.questions.length || 0)}
        >
          Enviar Quiz
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
          🎓 Mi Capacitación
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sistema de aprendizaje y desarrollo profesional
        </Typography>
      </Box>

      {/* Access Alert */}
      {renderAccessAlert()}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Obligatorio" icon={<WarningIcon />} iconPosition="start" />
          <Tab label="Importante" icon={<ProgressIcon />} iconPosition="start" />
          <Tab label="Básico" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="Certificaciones" icon={<TrophyIcon />} iconPosition="start" />
          <Tab label="Leaderboard" icon={<LeaderboardIcon />} iconPosition="start" />
          <Tab label="Logros" icon={<AchievementIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {currentTab <= 2 && renderModulesTab()}
        {currentTab === 3 && renderCertificationsTab()}
        {currentTab === 4 && renderLeaderboardTab()}
        {currentTab === 5 && renderAchievementsTab()}
      </Box>

      {/* Dialogs */}
      {renderModuleDialog()}
      {renderLessonDialog()}
      {renderQuizDialog()}
    </Container>
  );
};

export default EmployeeTrainingDashboard;
