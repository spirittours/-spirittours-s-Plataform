/**
 * Raffles Page - Sistema avanzado de sorteos para Spirit Tours
 * Incluye sorteos de viajes, eventos con QR, y múltiples tipos de premios
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Badge,
  Tooltip,
  LinearProgress,
  Alert,
  Snackbar,
  Fab,
  Zoom,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  AvatarGroup,
  Skeleton,
  Switch,
  FormControlLabel,
  Countdown
} from '@mui/material';

import {
  CardGiftcard,
  Flight,
  BeachAccess,
  Event,
  QrCode2,
  Share,
  ThumbUp,
  PersonAdd,
  Timer,
  EmojiEvents,
  Celebration,
  Christmas,
  NewReleases,
  LocalActivity,
  ConfirmationNumber,
  Casino,
  Facebook,
  Instagram,
  Twitter,
  WhatsApp,
  LinkedIn,
  YouTube,
  TrendingUp,
  Groups,
  Visibility,
  Add,
  Remove,
  CheckCircle,
  Info,
  Warning,
  PhotoCamera,
  VideoCameraFront,
  Download,
  Upload,
  ContentCopy,
  QrCodeScanner,
  Stars,
  AutoAwesome,
  Redeem,
  CardTravel,
  Public,
  LocationOn,
  Schedule,
  MonetizationOn,
  Verified,
  WorkspacePremium,
  Diamond
} from '@mui/icons-material';

import { styled, alpha } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';

// Styled Components
const RaffleCard = styled(Card)(({ theme, featured }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  transition: 'all 0.3s ease',
  border: featured ? `2px solid ${theme.palette.primary.main}` : 'none',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.shadows[12],
    '& .MuiCardMedia-root': {
      transform: 'scale(1.05)'
    }
  }
}));

const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  paddingTop: '56.25%', // 16:9
  position: 'relative',
  overflow: 'hidden',
  transition: 'transform 0.3s ease',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%)'
  }
}));

const PrizeChip = styled(Chip)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 1,
  fontWeight: 'bold',
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText
}));

const CountdownBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'center',
  margin: theme.spacing(2, 0),
  '& .countdown-item': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(1),
    background: alpha(theme.palette.primary.main, 0.1),
    borderRadius: theme.shape.borderRadius,
    minWidth: 60
  }
}));

const EntryMethodChip = styled(Chip)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  '& .MuiChip-icon': {
    color: color || theme.palette.primary.main
  }
}));

const QRContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(3),
  background: 'white',
  borderRadius: theme.shape.borderRadius,
  '& .qr-code': {
    padding: theme.spacing(2),
    border: `2px solid ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius
  }
}));

const WinnerCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`,
  color: theme.palette.common.white,
  position: 'relative',
  overflow: 'visible',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 40,
    height: 40,
    background: theme.palette.warning.main,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}));

// Componente principal
export default function RafflesPage() {
  // Estados
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedRaffle, setSelectedRaffle] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openQRScanner, setOpenQRScanner] = useState(false);
  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [myEntries, setMyEntries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [eventRegistration, setEventRegistration] = useState({
    name: '',
    email: '',
    phone: '',
    socialProfiles: {
      facebook: '',
      instagram: '',
      twitter: ''
    },
    acceptTerms: false,
    newsletter: false
  });
  const [pointsToSpend, setPointsToSpend] = useState(10);
  const [userPoints, setUserPoints] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Categorías de sorteos
  const categories = [
    { label: 'Todos', value: 'all', icon: <CardGiftcard /> },
    { label: 'Viajes', value: 'travel', icon: <Flight /> },
    { label: 'Eventos', value: 'event', icon: <Event /> },
    { label: 'Navideños', value: 'christmas', icon: <Christmas /> },
    { label: 'Souvenirs', value: 'souvenir', icon: <Redeem /> },
    { label: 'VIP', value: 'vip', icon: <WorkspacePremium /> },
    { label: 'Flash', value: 'flash', icon: <NewReleases /> }
  ];

  // Métodos de entrada
  const entryMethods = {
    social_share: { icon: <Share />, label: 'Compartir', color: '#1877F2' },
    social_follow: { icon: <PersonAdd />, label: 'Seguir', color: '#E4405F' },
    qr_scan: { icon: <QrCode2 />, label: 'QR Evento', color: '#4CAF50' },
    points: { icon: <Stars />, label: 'Puntos', color: '#FFC107' },
    purchase: { icon: <MonetizationOn />, label: 'Compra', color: '#9C27B0' },
    game: { icon: <Casino />, label: 'Juegos', color: '#FF5722' }
  };

  // Efectos
  useEffect(() => {
    loadRaffles();
    loadUserData();
    setupNotifications();
  }, []);

  // Cargar sorteos
  const loadRaffles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/raffles', {
        params: {
          status: 'active',
          limit: 50
        }
      });
      
      if (response.data.success) {
        setRaffles(response.data.raffles);
      }
    } catch (error) {
      console.error('Error loading raffles:', error);
      showSnackbar('Error al cargar los sorteos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos del usuario
  const loadUserData = async () => {
    try {
      const [pointsRes, entriesRes] = await Promise.all([
        axios.get('/api/user/points'),
        axios.get('/api/raffles/my/entries')
      ]);
      
      setUserPoints(pointsRes.data.points || 0);
      setMyEntries(entriesRes.data.entries || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Configurar notificaciones
  const setupNotifications = () => {
    // WebSocket o SSE para notificaciones en tiempo real
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      if (notification.type === 'raffle') {
        setNotifications(prev => [notification, ...prev]);
        showSnackbar(notification.message, 'info');
      }
    };
    
    return () => eventSource.close();
  };

  // Participar en sorteo
  const enterRaffle = async (raffleId, method) => {
    try {
      let response;
      
      switch (method) {
        case 'social_share':
          // Compartir en redes sociales
          await shareOnSocialMedia(raffleId);
          response = await axios.post(`/api/raffles/${raffleId}/enter/social`, {
            platform: 'facebook',
            action: 'share',
            url: window.location.href
          });
          break;
          
        case 'points':
          // Usar puntos
          response = await axios.post(`/api/raffles/${raffleId}/enter/points`, {
            points_to_spend: pointsToSpend
          });
          break;
          
        case 'social_follow':
          // Seguir en redes
          window.open('https://facebook.com/spirittours', '_blank');
          response = await axios.post(`/api/raffles/${raffleId}/enter/social`, {
            platform: 'facebook',
            action: 'follow'
          });
          break;
          
        default:
          showSnackbar('Método de entrada no disponible', 'warning');
          return;
      }
      
      if (response?.data?.success) {
        showSnackbar('¡Participación registrada con éxito!', 'success');
        loadUserData();
        loadRaffles();
      }
    } catch (error) {
      console.error('Error entering raffle:', error);
      showSnackbar('Error al participar en el sorteo', 'error');
    }
  };

  // Compartir en redes sociales
  const shareOnSocialMedia = async (raffleId) => {
    const raffle = raffles.find(r => r.id === raffleId);
    const shareUrl = `https://spirittours.com/raffles/${raffleId}`;
    const shareText = `¡Participa en el sorteo de ${raffle.title}! 🎁`;
    
    // Abrir diálogo de compartir nativo si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: raffle.title,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback a compartir en Facebook
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        '_blank'
      );
    }
  };

  // Registrar en evento con QR
  const registerEventParticipant = async (eventCode) => {
    try {
      const response = await axios.post(`/api/raffles/event/${eventCode}/register`, {
        ...eventRegistration,
        qr_scan_location: 'Web'
      });
      
      if (response.data.success) {
        showSnackbar(
          `¡Registrado! Tu número de ticket es: ${response.data.ticket_number}`,
          'success'
        );
        setOpenEventDialog(false);
        
        // Mostrar ticket digital
        downloadTicket(response.data.digital_ticket);
      }
    } catch (error) {
      console.error('Error registering:', error);
      showSnackbar('Error al registrarse en el evento', 'error');
    }
  };

  // Descargar ticket
  const downloadTicket = (ticketUrl) => {
    const link = document.createElement('a');
    link.href = ticketUrl;
    link.download = 'ticket.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calcular tiempo restante
  const calculateTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  };

  // Mostrar snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Renderizar tarjeta de sorteo
  const renderRaffleCard = (raffle) => {
    const timeRemaining = calculateTimeRemaining(raffle.end_date);
    const isEndingSoon = timeRemaining.days < 3;
    const isFeatured = raffle.prizes[0]?.value > 1000;
    
    return (
      <Grid item xs={12} sm={6} md={4} key={raffle.id}>
        <RaffleCard featured={isFeatured}>
          {/* Imagen y premio principal */}
          <Box position="relative">
            <StyledCardMedia
              image={raffle.image || '/images/raffle-default.jpg'}
              title={raffle.title}
            />
            <PrizeChip
              icon={<EmojiEvents />}
              label={raffle.prizes[0]?.name || 'Premio Sorpresa'}
              color="primary"
            />
            {isFeatured && (
              <Chip
                icon={<Diamond />}
                label="DESTACADO"
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  background: 'gold',
                  color: 'black',
                  fontWeight: 'bold'
                }}
              />
            )}
            {isEndingSoon && (
              <Chip
                icon={<Warning />}
                label="TERMINA PRONTO"
                color="error"
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16
                }}
              />
            )}
          </Box>

          <CardContent sx={{ flexGrow: 1 }}>
            {/* Título y descripción */}
            <Typography variant="h6" gutterBottom>
              {raffle.title}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              {raffle.description}
            </Typography>

            {/* Cuenta regresiva */}
            {timeRemaining.days > 0 && (
              <CountdownBox>
                <div className="countdown-item">
                  <Typography variant="h5">{timeRemaining.days}</Typography>
                  <Typography variant="caption">Días</Typography>
                </div>
                <div className="countdown-item">
                  <Typography variant="h5">{timeRemaining.hours}</Typography>
                  <Typography variant="caption">Horas</Typography>
                </div>
                <div className="countdown-item">
                  <Typography variant="h5">{timeRemaining.minutes}</Typography>
                  <Typography variant="caption">Min</Typography>
                </div>
              </CountdownBox>
            )}

            {/* Estadísticas */}
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <Groups fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">
                  {raffle.current_participants} participantes
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <LocalActivity fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">
                  {raffle.total_entries} entradas
                </Typography>
              </Box>
            </Box>

            {/* Métodos de entrada */}
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Formas de participar:
              </Typography>
              <Box display="flex" flexWrap="wrap">
                {raffle.entry_methods.map(method => (
                  <EntryMethodChip
                    key={method}
                    icon={entryMethods[method]?.icon}
                    label={entryMethods[method]?.label}
                    size="small"
                    color={entryMethods[method]?.color}
                    onClick={() => enterRaffle(raffle.id, method)}
                  />
                ))}
              </Box>
            </Box>

            {/* Premios adicionales */}
            {raffle.prizes.length > 1 && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  +{raffle.prizes.length - 1} premios más
                </Typography>
              </Box>
            )}

            {/* Botones de acción */}
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<Casino />}
                onClick={() => {
                  setSelectedRaffle(raffle);
                  setOpenDialog(true);
                }}
              >
                Participar
              </Button>
              <IconButton
                color="primary"
                onClick={() => shareOnSocialMedia(raffle.id)}
              >
                <Share />
              </IconButton>
            </Box>
          </CardContent>
        </RaffleCard>
      </Grid>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom align="center">
          🎁 Sorteos y Premios Spirit Tours
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph>
          Participa en nuestros sorteos de viajes gratis, souvenirs y experiencias únicas
        </Typography>
        
        {/* Botón principal para eventos */}
        <Box display="flex" justifyContent="center" gap={2} mt={3}>
          <Button
            variant="contained"
            size="large"
            color="primary"
            startIcon={<QrCodeScanner />}
            onClick={() => setOpenEventDialog(true)}
          >
            Escanear QR de Evento
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<EmojiEvents />}
            onClick={() => window.location.href = '/raffles/winners'}
          >
            Ver Ganadores
          </Button>
        </Box>
      </Box>

      {/* Estadísticas generales */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Stars color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4">{userPoints}</Typography>
            <Typography variant="body2" color="text.secondary">
              Tus Puntos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <LocalActivity color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h4">{myEntries.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Sorteos Activos
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Groups color="info" sx={{ fontSize: 40 }} />
            <Typography variant="h4">
              {raffles.reduce((acc, r) => acc + r.current_participants, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Participantes
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <CardGiftcard color="warning" sx={{ fontSize: 40 }} />
            <Typography variant="h4">
              ${raffles.reduce((acc, r) => acc + (r.prizes[0]?.value || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valor Total Premios
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs de categorías */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, val) => setSelectedTab(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((cat, index) => (
            <Tab
              key={cat.value}
              label={cat.label}
              icon={cat.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Lista de sorteos */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <Grid item xs={12} sm={6} md={4} key={n}>
              <Skeleton variant="rectangular" height={400} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {raffles
            .filter(r => selectedTab === 0 || r.type === categories[selectedTab].value)
            .map(renderRaffleCard)}
        </Grid>
      )}

      {/* Diálogo de participación */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRaffle && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={2}>
                <EmojiEvents color="primary" />
                {selectedRaffle.title}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box py={2}>
                <Typography variant="h6" gutterBottom>
                  Formas de Participar:
                </Typography>
                
                <List>
                  {/* Compartir en redes */}
                  <ListItem>
                    <ListItemIcon>
                      <Share color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Compartir en Redes Sociales"
                      secondary="Gana 1 entrada por cada red social donde compartas"
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" gap={1}>
                        <IconButton
                          color="primary"
                          onClick={() => {
                            window.open('https://facebook.com/sharer/sharer.php', '_blank');
                            enterRaffle(selectedRaffle.id, 'social_share');
                          }}
                        >
                          <Facebook />
                        </IconButton>
                        <IconButton
                          sx={{ color: '#E4405F' }}
                          onClick={() => {
                            window.open('https://instagram.com', '_blank');
                            enterRaffle(selectedRaffle.id, 'social_share');
                          }}
                        >
                          <Instagram />
                        </IconButton>
                        <IconButton
                          sx={{ color: '#1DA1F2' }}
                          onClick={() => {
                            window.open('https://twitter.com/intent/tweet', '_blank');
                            enterRaffle(selectedRaffle.id, 'social_share');
                          }}
                        >
                          <Twitter />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {/* Seguir en redes */}
                  <ListItem>
                    <ListItemIcon>
                      <PersonAdd color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Seguirnos en Redes Sociales"
                      secondary="1 punto por cada like en Facebook, 2 entradas por seguir"
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        startIcon={<ThumbUp />}
                        onClick={() => enterRaffle(selectedRaffle.id, 'social_follow')}
                      >
                        Seguir y Ganar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {/* Usar puntos */}
                  <ListItem>
                    <ListItemIcon>
                      <Stars color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Usar Puntos Acumulados"
                      secondary={`Tienes ${userPoints} puntos disponibles`}
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => setPointsToSpend(Math.max(10, pointsToSpend - 10))}
                        >
                          <Remove />
                        </IconButton>
                        <TextField
                          value={pointsToSpend}
                          onChange={(e) => setPointsToSpend(Number(e.target.value))}
                          type="number"
                          size="small"
                          sx={{ width: 80 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => setPointsToSpend(Math.min(userPoints, pointsToSpend + 10))}
                        >
                          <Add />
                        </IconButton>
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={() => enterRaffle(selectedRaffle.id, 'points')}
                          disabled={pointsToSpend > userPoints}
                        >
                          Canjear
                        </Button>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {/* Referir amigos */}
                  <ListItem>
                    <ListItemIcon>
                      <Groups color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Invitar Amigos"
                      secondary="0.5 puntos por invitación, 1 punto cuando den like a nuestra página"
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<PersonAdd />}
                        onClick={() => {
                          // Copiar enlace de referido
                          navigator.clipboard.writeText(
                            `https://spirittours.com/raffles/${selectedRaffle.id}?ref=${userPoints}`
                          );
                          showSnackbar('Enlace de referido copiado!', 'success');
                        }}
                      >
                        Invitar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Premios */}
                <Typography variant="h6" gutterBottom>
                  Premios:
                </Typography>
                <Grid container spacing={2}>
                  {selectedRaffle.prizes.map((prize, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1}>
                            <EmojiEvents
                              color={index === 0 ? 'warning' : 'action'}
                            />
                            <Typography variant="subtitle1">
                              {index === 0 ? '1er Premio' : `${index + 1}° Premio`}
                            </Typography>
                          </Box>
                          <Typography variant="h6" color="primary">
                            {prize.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Valor: ${prize.value}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Diálogo de registro en evento */}
      <Dialog
        open={openEventDialog}
        onClose={() => setOpenEventDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <QrCode2 color="primary" />
            Registro en Evento
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Typography variant="body1" paragraph>
              Ingresa el código del evento o escanea el QR en el stand
            </Typography>
            
            <TextField
              fullWidth
              label="Código del Evento (ej: FITUR26)"
              placeholder="FITUR26"
              margin="normal"
              InputProps={{
                startAdornment: <Event />
              }}
            />
            
            <Divider sx={{ my: 2 }}>O</Divider>
            
            <Box textAlign="center" mb={2}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<QrCodeScanner />}
                onClick={() => setOpenQRScanner(true)}
              >
                Escanear Código QR
              </Button>
            </Box>
            
            <TextField
              fullWidth
              label="Nombre Completo"
              margin="normal"
              value={eventRegistration.name}
              onChange={(e) => setEventRegistration({
                ...eventRegistration,
                name: e.target.value
              })}
              required
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={eventRegistration.email}
              onChange={(e) => setEventRegistration({
                ...eventRegistration,
                email: e.target.value
              })}
              required
            />
            
            <TextField
              fullWidth
              label="Teléfono"
              margin="normal"
              value={eventRegistration.phone}
              onChange={(e) => setEventRegistration({
                ...eventRegistration,
                phone: e.target.value
              })}
              required
            />
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Redes Sociales (para entradas extra):
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Facebook"
                  size="small"
                  value={eventRegistration.socialProfiles.facebook}
                  onChange={(e) => setEventRegistration({
                    ...eventRegistration,
                    socialProfiles: {
                      ...eventRegistration.socialProfiles,
                      facebook: e.target.value
                    }
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Instagram"
                  size="small"
                  value={eventRegistration.socialProfiles.instagram}
                  onChange={(e) => setEventRegistration({
                    ...eventRegistration,
                    socialProfiles: {
                      ...eventRegistration.socialProfiles,
                      instagram: e.target.value
                    }
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Twitter"
                  size="small"
                  value={eventRegistration.socialProfiles.twitter}
                  onChange={(e) => setEventRegistration({
                    ...eventRegistration,
                    socialProfiles: {
                      ...eventRegistration.socialProfiles,
                      twitter: e.target.value
                    }
                  })}
                />
              </Grid>
            </Grid>
            
            <FormControlLabel
              control={
                <Switch
                  checked={eventRegistration.acceptTerms}
                  onChange={(e) => setEventRegistration({
                    ...eventRegistration,
                    acceptTerms: e.target.checked
                  })}
                />
              }
              label="Acepto los términos y condiciones"
              sx={{ mt: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={eventRegistration.newsletter}
                  onChange={(e) => setEventRegistration({
                    ...eventRegistration,
                    newsletter: e.target.checked
                  })}
                />
              }
              label="Quiero recibir ofertas y novedades"
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Gana entradas extra:</strong>
                <br />
                • +1 entrada por seguirnos en Facebook
                <br />
                • +1 entrada por seguirnos en Instagram
                <br />
                • +2 entradas por compartir el evento
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventDialog(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => registerEventParticipant('FITUR26')}
            disabled={!eventRegistration.acceptTerms || !eventRegistration.name || !eventRegistration.email}
          >
            Registrarse
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* FAB para crear sorteo (admin) */}
      {userPoints > 1000 && (
        <Zoom in={true}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16
            }}
            onClick={() => window.location.href = '/admin/raffles/create'}
          >
            <Add />
          </Fab>
        </Zoom>
      )}
    </Container>
  );
}