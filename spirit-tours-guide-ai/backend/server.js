/**
 * Spirit Tours Guide AI - Servidor Principal
 * Sistema completo de guía virtual con IA multiperspectiva
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const winston = require('winston');

// Importar managers
const { MultiAIOrchestrator, OPTIMIZATION_STRATEGIES } = require('./multi-ai-orchestrator');
const { PerspectivesManager } = require('./perspectives-manager');
const { RoutesManager } = require('./routes-manager');
const RatingFeedbackSystem = require('./rating-feedback-system');
const WhatsAppBusinessService = require('./whatsapp-business-service');
const initWhatsAppRouter = require('./whatsapp-router');
const GamificationSystem = require('./gamification-system');
const initGamificationRouter = require('./gamification-router');
const AdvancedAnalyticsSystem = require('./advanced-analytics-system');
const initAnalyticsRouter = require('./analytics-router');
const BookingPaymentSystem = require('./booking-payment-system');
const initBookingRouter = require('./booking-router');
const OfflineSyncSystem = require('./offline-sync-system');
const initOfflineRouter = require('./offline-router');
const UnifiedMessagingSystem = require('./unified-messaging-system');
const initUnifiedMessagingRouter = require('./unified-messaging-router');
const MLRecommendationEngine = require('./ml-recommendation-engine');
const initMLRecommendationRouter = require('./ml-recommendation-router');
const { dbManager } = require('./database');

// Configuración
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Inicializar app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Variables para managers (se inicializarán después de conectar DB)
let aiOrchestrator;
let perspectivesManager;
let routesManager;
let ratingSystem;
let whatsappService;
let gamificationSystem;
let analyticsSystem;
let bookingSystem;
let offlineSystem;
let messagingSystem;
let mlRecommendationEngine;

/**
 * Inicializar todos los sistemas después de conectar a la base de datos
 */
async function initializeSystems() {
  try {
    // Conectar a las bases de datos
    logger.info('🔌 Connecting to databases...');
    await dbManager.connectAll();

    // Inicializar managers con conexiones DB
    aiOrchestrator = new MultiAIOrchestrator({
      defaultStrategy: OPTIMIZATION_STRATEGIES.CASCADE,
      fallbackChain: ['grok', 'meta', 'qwen', 'openai'],
      costLimit: 0.05
    });

    perspectivesManager = new PerspectivesManager(aiOrchestrator);
    routesManager = new RoutesManager();
    ratingSystem = new RatingFeedbackSystem(aiOrchestrator, null);
    whatsappService = new WhatsAppBusinessService(null);
    gamificationSystem = new GamificationSystem();
    analyticsSystem = new AdvancedAnalyticsSystem();
    bookingSystem = new BookingPaymentSystem();
    offlineSystem = new OfflineSyncSystem(dbManager.postgres, dbManager.redis.client);
    messagingSystem = new UnifiedMessagingSystem(whatsappService, dbManager.postgres, dbManager.redis.client);
    mlRecommendationEngine = new MLRecommendationEngine(dbManager.postgres, dbManager.redis.client);

    logger.info('✅ All systems initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize systems:', error);
    throw error;
  }
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por IP
});
app.use('/api/', limiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.use('/pwa', express.static(path.join(__dirname, '../mobile-pwa')));

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// Obtener todas las perspectivas disponibles
app.get('/api/perspectives', (req, res) => {
  try {
    const perspectives = perspectivesManager.getAvailablePerspectives();
    res.json({ success: true, perspectives });
  } catch (error) {
    logger.error('Error obteniendo perspectivas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener explicación de un punto de interés según perspectiva
app.get('/api/perspectives/:poiId/:perspectiveId', async (req, res) => {
  try {
    const { poiId, perspectiveId } = req.params;
    const { language = 'es', useAI = false, length = 'medium' } = req.query;

    const explanation = await perspectivesManager.getExplanation(
      poiId,
      perspectiveId,
      {
        language,
        useAI: useAI === 'true',
        length,
        includeReferences: true
      }
    );

    res.json({ success: true, ...explanation });
  } catch (error) {
    logger.error('Error obteniendo explicación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener múltiples perspectivas simultáneamente
app.post('/api/perspectives/multiple', async (req, res) => {
  try {
    const { poiId, perspectiveIds, options = {} } = req.body;

    const result = await perspectivesManager.getMultiplePerspectives(
      poiId,
      perspectiveIds,
      options
    );

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error obteniendo múltiples perspectivas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener puntos de interés cercanos
app.get('/api/poi/nearby', (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requieren coordenadas (lat, lng)' 
      });
    }

    const points = perspectivesManager.findNearbyPoints(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );

    res.json({ success: true, points });
  } catch (error) {
    logger.error('Error buscando puntos cercanos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todas las rutas
app.get('/api/routes', (req, res) => {
  try {
    const routes = routesManager.getAllRoutes();
    res.json({ success: true, routes });
  } catch (error) {
    logger.error('Error obteniendo rutas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener una ruta específica
app.get('/api/routes/:routeId', (req, res) => {
  try {
    const { routeId } = req.params;
    const route = routesManager.getRoute(routeId);

    if (!route) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ruta no encontrada' 
      });
    }

    res.json({ success: true, route });
  } catch (error) {
    logger.error('Error obteniendo ruta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar un tour
app.post('/api/tours/start', (req, res) => {
  try {
    const tour = routesManager.startTour(req.body);
    
    // Notificar a través de WebSocket
    io.to(`tour-${tour.tourId}`).emit('tour-started', tour);
    
    res.json({ success: true, tour });
  } catch (error) {
    logger.error('Error iniciando tour:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Finalizar un tour
app.post('/api/tours/:tourId/end', (req, res) => {
  try {
    const { tourId } = req.params;
    const tour = routesManager.endTour(tourId);
    
    // Notificar a través de WebSocket
    io.to(`tour-${tourId}`).emit('tour-ended', tour);
    
    res.json({ success: true, tour });
  } catch (error) {
    logger.error('Error finalizando tour:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar posición del vehículo
app.post('/api/vehicles/:vehicleId/position', (req, res) => {
  try {
    const { vehicleId } = req.params;
    const position = routesManager.updateVehiclePosition(vehicleId, req.body);
    
    res.json({ success: true, position });
  } catch (error) {
    logger.error('Error actualizando posición:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Suscripción a notificaciones push
app.post('/api/notifications/subscribe', (req, res) => {
  try {
    const { subscription, tourId, userRole } = req.body;
    
    // Aquí guardarías la suscripción en la base de datos
    // Por ahora solo confirmamos
    
    logger.info('Nueva suscripción a notificaciones:', { tourId, userRole });
    
    res.json({ success: true, message: 'Suscrito correctamente' });
  } catch (error) {
    logger.error('Error en suscripción:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar notificación
app.post('/api/notifications/send', (req, res) => {
  try {
    const notification = req.body;
    
    // Emitir notificación a través de WebSocket según target
    if (notification.target === 'global') {
      io.emit('notification', notification);
    } else if (notification.target === 'group' && notification.tourId) {
      io.to(`tour-${notification.tourId}`).emit('notification', notification);
    } else if (notification.target === 'individual' && notification.recipients) {
      notification.recipients.forEach(userId => {
        io.to(`user-${userId}`).emit('notification', notification);
      });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    logger.error('Error enviando notificación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estadísticas del sistema
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      ai: aiOrchestrator.getStats(),
      perspectives: perspectivesManager.getStats(),
      routes: routesManager.getStats(),
      ratings: ratingSystem.getStatistics(),
      whatsapp: whatsappService.getStatistics(),
      gamification: gamificationSystem.getStatistics(),
      analytics: analyticsSystem.getStatistics(),
      bookings: bookingSystem.getStatistics(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: io.engine.clientsCount
      }
    };

    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RATING & FEEDBACK API ROUTES
// ============================================

// Submit rating and feedback
app.post('/api/ratings/submit', async (req, res) => {
  try {
    const result = await ratingSystem.submitRating(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error submitting rating:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get guide dashboard data
app.get('/api/ratings/guide/:guideId/dashboard', async (req, res) => {
  try {
    const { guideId } = req.params;
    const { timeRange = '7d' } = req.query;
    
    const dashboard = await ratingSystem.getGuideDashboard(guideId, timeRange);
    res.json({ success: true, ...dashboard });
  } catch (error) {
    logger.error('Error getting guide dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate insights for guide
app.post('/api/ratings/guide/:guideId/insights', async (req, res) => {
  try {
    const { guideId } = req.params;
    const { waypointId } = req.body;
    
    const insights = await ratingSystem.generateInsights(guideId, waypointId);
    res.json({ success: true, insights });
  } catch (error) {
    logger.error('Error generating insights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WHATSAPP BUSINESS API ROUTES
// ============================================

// Mount WhatsApp router
app.use('/api/whatsapp', initWhatsAppRouter(whatsappService));

// ============================================
// GAMIFICATION API ROUTES
// ============================================

// Mount Gamification router
app.use('/api/gamification', initGamificationRouter(gamificationSystem));

// ============================================
// ADVANCED ANALYTICS API ROUTES
// ============================================

// Mount Analytics router
app.use('/api/analytics', initAnalyticsRouter(analyticsSystem));

// ============================================
// BOOKING & PAYMENT API ROUTES
// ============================================

// Mount Booking router
app.use('/api/bookings', initBookingRouter(bookingSystem));

// Mount Offline Sync router
app.use('/api/offline', initOfflineRouter(offlineSystem));

// Mount Unified Messaging router
app.use('/api/messages', initUnifiedMessagingRouter(messagingSystem));

// Mount ML Recommendation router
app.use('/api/recommendations', initMLRecommendationRouter(mlRecommendationEngine));

// ============================================
// WEBSOCKET EVENTS
// ============================================

io.on('connection', (socket) => {
  logger.info('Cliente conectado:', socket.id);

  // Unirse a un tour
  socket.on('join-tour', (tourId) => {
    socket.join(`tour-${tourId}`);
    logger.info(`Cliente ${socket.id} se unió al tour ${tourId}`);
  });

  // Salir de un tour
  socket.on('leave-tour', (tourId) => {
    socket.leave(`tour-${tourId}`);
    logger.info(`Cliente ${socket.id} salió del tour ${tourId}`);
  });
  
  // Join guide room for real-time alerts
  socket.on('join-guide', (guideId) => {
    socket.join(`guide-${guideId}`);
    logger.info(`Guide ${guideId} joined their alert room`);
  });
  
  // Leave guide room
  socket.on('leave-guide', (guideId) => {
    socket.leave(`guide-${guideId}`);
    logger.info(`Guide ${guideId} left their alert room`);
  });
  
  // Join gamification room for player
  socket.on('join-gamification', (userId) => {
    socket.join(`gamification-${userId}`);
    logger.info(`User ${userId} joined gamification room`);
  });
  
  // Leave gamification room
  socket.on('leave-gamification', (userId) => {
    socket.leave(`gamification-${userId}`);
    logger.info(`User ${userId} left gamification room`);
  });

  // Actualización de posición en tiempo real
  socket.on('update-position', (data) => {
    const { vehicleId, position } = data;
    routesManager.updateVehiclePosition(vehicleId, position);
  });

  // Desconexión
  socket.on('disconnect', () => {
    logger.info('Cliente desconectado:', socket.id);
  });
});

// Event listeners del RoutesManager
routesManager.on('tour-started', (tour) => {
  io.to(`tour-${tour.tourId}`).emit('tour-started', tour);
});

routesManager.on('position-updated', (data) => {
  io.to(`tour-${data.tourId}`).emit('position-updated', data);
});

routesManager.on('waypoint-reached', (data) => {
  io.to(`tour-${data.tourId}`).emit('waypoint-reached', data);
});

routesManager.on('route-deviation', (data) => {
  io.to(`tour-${data.tourId}`).emit('route-deviation', data);
});

routesManager.on('tour-ended', (tour) => {
  io.to(`tour-${tour.tourId}`).emit('tour-ended', tour);
});

routesManager.on('notification', (notification) => {
  if (notification.tourId) {
    io.to(`tour-${notification.tourId}`).emit('notification', notification);
  }
});

// Event listeners del RatingFeedbackSystem
ratingSystem.on('rating:submitted', (data) => {
  io.to(`tour-${data.tourId}`).emit('rating-submitted', data);
  logger.info(`Rating submitted for tour ${data.tourId}, guide ${data.guideId}: ${data.overallRating}⭐`);
});

ratingSystem.on('rating:alert', (alertData) => {
  // Send alert to specific guide
  io.to(`guide-${alertData.guideId || 'unknown'}`).emit('rating-alert', alertData);
  logger.warn(`Rating alert triggered: ${alertData.reason}`);
});

ratingSystem.on('guide:alert', (data) => {
  io.to(`guide-${data.guideId}`).emit('guide-alert', data.alert);
  logger.warn(`Guide alert sent to ${data.guideId}`);
});

// Event listeners del WhatsAppBusinessService
whatsappService.on('message:sent', (data) => {
  io.to(`tour-${data.tourId || 'all'}`).emit('whatsapp-message-sent', data);
  logger.info(`WhatsApp message sent to ${data.to}`);
});

whatsappService.on('message:received', (data) => {
  io.emit('whatsapp-message-received', data);
  logger.info(`WhatsApp message received from ${data.from}: ${data.type}`);
});

whatsappService.on('message:status', (data) => {
  io.emit('whatsapp-message-status', data);
  logger.info(`WhatsApp message ${data.messageId} status: ${data.status}`);
});

whatsappService.on('message:failed', (data) => {
  logger.error(`WhatsApp message failed for ${data.to}: ${data.error}`);
});

// Event listeners del GamificationSystem
gamificationSystem.on('points:awarded', (data) => {
  // Notify user about points earned
  io.to(`gamification-${data.userId}`).emit('points-awarded', data);
  logger.info(`Points awarded to ${data.userId}: +${data.points} for ${data.actionType}`);
});

gamificationSystem.on('level:up', (data) => {
  // Celebrate level up with special notification
  io.to(`gamification-${data.userId}`).emit('level-up', data);
  io.emit('public-level-up', {
    userId: data.userId,
    level: data.newLevel,
    levelName: data.levelName,
  });
  logger.info(`🎉 ${data.userId} leveled up to ${data.newLevel}: ${data.levelName}!`);
});

gamificationSystem.on('badge:unlocked', (data) => {
  // Notify user about new badge
  io.to(`gamification-${data.userId}`).emit('badge-unlocked', data);
  logger.info(`🏆 ${data.userId} unlocked badge: ${data.badge.name} (${data.badge.tier})`);
});

gamificationSystem.on('leaderboard:updated', (data) => {
  // Broadcast leaderboard updates
  io.emit('leaderboard-updated', data);
});

gamificationSystem.on('streak:milestone', (data) => {
  // Celebrate streak milestones
  io.to(`gamification-${data.userId}`).emit('streak-milestone', data);
  logger.info(`🔥 ${data.userId} reached streak milestone: ${data.streak} days!`);
});

// Event listeners del AdvancedAnalyticsSystem
analyticsSystem.on('event:tracked', (data) => {
  // Broadcast event tracking for real-time monitoring
  io.emit('analytics-event-tracked', {
    eventType: data.eventType,
    timestamp: data.timestamp,
  });
});

analyticsSystem.on('tour:recorded', (data) => {
  // Notify analytics dashboard of new tour data
  io.emit('analytics-tour-recorded', {
    tourId: data.tourId,
    revenue: data.revenue,
    rating: data.rating,
  });
  logger.info(`Analytics: Tour ${data.tourId} recorded - Revenue: $${data.revenue}`);
});

analyticsSystem.on('alert:created', (data) => {
  // Broadcast critical alerts to all admins/managers
  io.emit('analytics-alert', data);
  logger.warn(`Analytics Alert [${data.severity}]: ${data.title}`);
});

// Event listeners del BookingPaymentSystem
bookingSystem.on('booking:created', (data) => {
  // Notify user about booking creation
  io.to(`user-${data.userId}`).emit('booking-created', data);
  logger.info(`Booking created: ${data.bookingId} for tour ${data.tourId}`);
});

bookingSystem.on('booking:confirmed', (data) => {
  // Celebrate booking confirmation
  io.to(`user-${data.userId}`).emit('booking-confirmed', data);
  logger.info(`🎉 Booking confirmed: ${data.bookingId}`);
});

bookingSystem.on('payment:completed', (data) => {
  // Notify about successful payment
  io.to(`booking-${data.bookingId}`).emit('payment-completed', data);
  logger.info(`💳 Payment completed: ${data.transactionId} - $${data.amount} ${data.currency}`);
});

bookingSystem.on('booking:cancelled', (data) => {
  // Notify about cancellation
  io.to(`user-${data.userId}`).emit('booking-cancelled', data);
  logger.info(`Booking cancelled: ${data.bookingId}, refund: $${data.refundAmount}`);
});

bookingSystem.on('refund:processed', (data) => {
  // Notify about refund
  io.to(`booking-${data.bookingId}`).emit('refund-processed', data);
  logger.info(`Refund processed: ${data.refundId} - $${data.amount}`);
});

// Event listeners del OfflineSyncSystem
offlineSystem.on('manifest:generated', (data) => {
  logger.info(`📦 Offline manifest generated for user ${data.userId}: ${data.totalEntities} entities`);
});

offlineSystem.on('sync:completed', (data) => {
  // Notify user about sync completion
  io.to(`user-${data.userId}`).emit('sync-completed', data);
  logger.info(`🔄 Sync completed for user ${data.userId}: ${data.processed} processed, ${data.conflicts} conflicts`);
});

offlineSystem.on('sync:conflict', (data) => {
  // Notify user about conflict detected
  io.to(`user-${data.userId}`).emit('sync-conflict', data);
  logger.warn(`⚠️ Sync conflict detected: ${data.entityType} ${data.entityId}`);
});

offlineSystem.on('conflict:resolved', (data) => {
  logger.info(`✅ Conflict resolved: ${data.entityType} ${data.entityId} using ${data.strategy}`);
});

// Event listeners del UnifiedMessagingSystem
messagingSystem.on('message:received', (data) => {
  // Notify assigned agent about new message
  if (data.conversation.assigned_agent_id) {
    io.to(`agent-${data.conversation.assigned_agent_id}`).emit('new-message', data);
  }
  // Notify all supervisors
  io.to('supervisors').emit('new-message', data);
  logger.info(`💬 Message received: ${data.channel} - ${data.conversationId}`);
});

messagingSystem.on('message:sent', (data) => {
  // Notify conversation participants
  io.to(`conversation-${data.conversationId}`).emit('message-sent', data);
  logger.info(`📤 Message sent: ${data.channel} - ${data.messageId}`);
});

messagingSystem.on('conversation:created', (data) => {
  // Notify all agents about new conversation
  io.to('agents').emit('new-conversation', data);
  logger.info(`🆕 New conversation: ${data.channel} - ${data.conversationId}`);
});

messagingSystem.on('conversation:queued', (data) => {
  // Notify available agents about queued conversation
  io.to('agents').emit('conversation-queued', data);
  logger.warn(`⏳ Conversation queued: ${data.conversationId} (priority: ${data.priority})`);
});

messagingSystem.on('agent:assigned', (data) => {
  // Notify agent about new assignment
  io.to(`agent-${data.agentId}`).emit('conversation-assigned', data);
  logger.info(`👤 Agent assigned: ${data.agentId} → ${data.conversationId}`);
});

messagingSystem.on('conversation:closed', (data) => {
  // Notify participants about closed conversation
  io.to(`conversation-${data.conversationId}`).emit('conversation-closed', data);
  logger.info(`✅ Conversation closed: ${data.conversationId}`);
});

// Event listeners del MLRecommendationEngine
mlRecommendationEngine.on('interaction:tracked', (data) => {
  // Track user interaction for analytics
  io.to(`user-${data.userId}`).emit('interaction-tracked', {
    tourId: data.tourId,
    interactionType: data.interactionType,
    weight: data.weight
  });
  logger.info(`🎯 Interaction tracked: ${data.userId} - ${data.interactionType} - ${data.tourId}`);
});

mlRecommendationEngine.on('profile:updated', (data) => {
  // Notify user about profile update
  io.to(`user-${data.userId}`).emit('profile-updated', {
    userId: data.userId,
    hasPreferences: Object.keys(data.featureVector.categoryPreferences || {}).length > 0
  });
  logger.info(`👤 User profile updated: ${data.userId}`);
});

mlRecommendationEngine.on('recommendations:generated', (data) => {
  // Notify user about new recommendations
  io.to(`user-${data.userId}`).emit('recommendations-ready', {
    algorithm: data.algorithm,
    count: data.count,
    timestamp: data.timestamp
  });
  logger.info(`🎲 Recommendations generated: ${data.userId} (${data.algorithm}) - ${data.count} tours`);
});

// ============================================
// CATCH-ALL ROUTE
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Inicializar sistemas primero
    await initializeSystems();

    // Luego iniciar el servidor
    server.listen(PORT, () => {
      logger.info('='.repeat(60));
      logger.info(`🚀 Spirit Tours Guide AI Server - Started`);
      logger.info('='.repeat(60));
      logger.info(`📍 Environment: ${NODE_ENV}`);
      logger.info(`🌐 Port: ${PORT}`);
      logger.info(`🕐 Started at: ${new Date().toISOString()}`);
      logger.info('');
      logger.info('📦 Systems Status:');
      logger.info(`   🤖 Multi-IA Orchestrator: ${aiOrchestrator ? '✅' : '❌'}`);
      logger.info(`   🗺️ Routes Manager: ${routesManager ? '✅' : '❌'}`);
      logger.info(`   🕌 Perspectives Manager: ${perspectivesManager ? '✅' : '❌'}`);
      logger.info(`   ⭐ Rating & Feedback System: ${ratingSystem ? '✅' : '❌'}`);
      logger.info(`   💬 WhatsApp Business Service: ${whatsappService ? '✅' : '❌'}`);
      logger.info(`   🎮 Gamification System: ${gamificationSystem ? '✅' : '❌'}`);
      logger.info(`   📊 Advanced Analytics System: ${analyticsSystem ? '✅' : '❌'}`);
      logger.info(`   💳 Booking & Payment System: ${bookingSystem ? '✅' : '❌'}`);
      logger.info(`   📴 Offline Sync System: ${offlineSystem ? '✅' : '❌'}`);
      logger.info(`   💬 Unified Messaging System: ${messagingSystem ? '✅' : '❌'}`);
      logger.info(`   🎲 ML Recommendation Engine: ${mlRecommendationEngine ? '✅' : '❌'}`);
      logger.info(`   📡 WebSocket Server: ✅`);
      logger.info('');
      logger.info('🗄️ Database Connections:');
      logger.info(`   🐘 PostgreSQL: ${dbManager.postgres.pool ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   🔴 Redis: ${dbManager.redis.isReady ? '✅ Connected' : '⚠️ Not Available'}`);
      logger.info(`   🍃 MongoDB: ${dbManager.mongodb.db ? '✅ Connected' : '⚠️ Not Available'}`);
      logger.info('');
      logger.info('='.repeat(60));
      logger.info('✨ Spirit Tours Guide AI - Sistema completamente operacional');
      logger.info('='.repeat(60));
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(async () => {
    logger.info('Cerrando conexiones de base de datos...');
    await dbManager.closeAll();
    logger.info('Servidor cerrado completamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  server.close(async () => {
    logger.info('Cerrando conexiones de base de datos...');
    await dbManager.closeAll();
    logger.info('Servidor cerrado completamente');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server, io, dbManager };
