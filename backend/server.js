/**
 * Spirit Tours - Backend Server (Node.js)
 * 
 * Express server for handling:
 * - Email services (Nodemailer)
 * - System configuration management
 * - Admin dashboard APIs
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { configManager } = require('./services/config_manager');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();
const http = require('http');
const server = http.createServer(app);
const PORT = process.env.NODE_PORT || 5001;

// Initialize WebSocket server (Sprint 4.1)
const WebSocketService = require('./services/realtime/WebSocketService');

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Spirit Tours Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Spirit Tours API & ERP Hub AI Accounting Agent',
    version: '1.0.0',
    endpoints: {
      nodemailer: '/api/nodemailer',
      emailConfig: '/api/admin/email-config',
      emailTemplates: '/api/admin/email-templates',
      systemConfig: '/api/admin/system-config',
      systemConfigDashboard: '/api/system-config',
      trips: '/api/trips',
      smartNotifications: '/api/smart-notifications',
      whatsapp: '/api/whatsapp',
      aiAgent: '/api/ai-agent',
      crm: '/api/crm',
      automation: {
        workflows: '/api/automation/workflows',
        leadScoring: '/api/automation/lead-scoring'
      },
      notifications: '/api/notifications',
      analytics: '/api/analytics',
      aiInsights: '/api/ai/insights',
      aiProviders: '/api/ai/providers',
      search: '/api/search',
      fineTuning: '/api/ai/fine-tuning',
      vector: '/api/vector',
      agents: '/api/agents',
      voice: '/api/voice',
      vision: '/api/vision',
      rag: '/api/rag',
      inference: '/api/inference',
      marketplace: '/api/marketplace',
      streaming: '/api/streaming',
      orchestration: '/api/orchestration',
      monitoring: '/api/monitoring'
    },
    aiAgent: {
      description: 'AI Accounting Agent with 9 integrated services',
      totalEndpoints: 92,
      services: {
        core: '/api/ai-agent/core (10 endpoints)',
        fraudDetection: '/api/ai-agent/fraud-detection (9 endpoints)',
        reports: '/api/ai-agent/reports (12 endpoints)',
        predictive: '/api/ai-agent/predictive (10 endpoints)',
        usaCompliance: '/api/ai-agent/compliance/usa (9 endpoints)',
        mexicoCompliance: '/api/ai-agent/compliance/mexico (12 endpoints)',
        dualReview: '/api/ai-agent/dual-review (9 endpoints)',
        checklists: '/api/ai-agent/checklists (10 endpoints)',
        roi: '/api/ai-agent/roi (11 endpoints)'
      },
      documentation: 'GET /api/ai-agent for full details'
    },
    crmSystem: {
      description: 'Complete CRM system with multi-tenancy and Monday.com-like features',
      totalModules: 7,
      modules: {
        workspaces: '/api/crm/workspaces (Multi-tenant workspaces)',
        pipelines: '/api/crm/pipelines (Sales pipeline management)',
        boards: '/api/crm/boards (Customizable boards)',
        deals: '/api/crm/deals (Deal management)',
        contacts: '/api/crm/contacts (Contact & lead management)',
        items: '/api/crm/items (Board items)',
        activities: '/api/crm/activities (Activity logging & timeline)'
      },
      features: {
        multiTenancy: 'Workspace-based isolation',
        rbac: 'Role-based access control',
        dynamicSchema: '20+ column types',
        automation: 'Workflow automation',
        analytics: 'Pipeline velocity & conversion',
        activityTracking: 'Complete audit trail'
      },
      documentation: 'GET /api/crm/docs for full API documentation'
    }
  });
});

// Register route modules
try {
  // Nodemailer routes
  const nodemailerRoutes = require('./routes/nodemailer.routes');
  app.use('/api/nodemailer', nodemailerRoutes);
  logger.info('✅ Nodemailer routes registered');

  // Admin email configuration routes
  const emailConfigRoutes = require('./routes/admin/email-config.routes');
  app.use('/api/admin/email-config', emailConfigRoutes);
  logger.info('✅ Email configuration routes registered');

  // Admin email templates routes
  const emailTemplatesRoutes = require('./routes/admin/email-templates.routes');
  app.use('/api/admin/email-templates', emailTemplatesRoutes);
  logger.info('✅ Email templates routes registered');

  // System configuration routes
  const systemConfigRoutes = require('./routes/admin/system-config.routes');
  app.use('/api/admin/system-config', systemConfigRoutes);
  logger.info('✅ System configuration routes registered');

  // Trips management routes
  const tripsRoutes = require('./routes/trips.routes');
  app.use('/api/trips', tripsRoutes);
  logger.info('✅ Trips management routes registered');

  // Smart notifications routes
  const smartNotificationsRoutes = require('./routes/smart_notifications.routes');
  app.use('/api/smart-notifications', smartNotificationsRoutes);
  logger.info('✅ Smart notifications routes registered');

  // WhatsApp Business API routes
  const whatsappRoutes = require('./routes/whatsapp.routes');
  app.use('/api/whatsapp', whatsappRoutes);
  logger.info('✅ WhatsApp Business API routes registered');

  // AI Accounting Agent routes (main router with 9 sub-routers, 92 endpoints)
  const aiAgentRoutes = require('./routes/ai-agent.routes');
  app.use('/api/ai-agent', aiAgentRoutes);
  logger.info('✅ AI Accounting Agent routes registered (9 services, 92 endpoints)');

  // System Configuration Dashboard routes (API keys, credentials management)
  const systemConfigDashboardRoutes = require('./routes/system-config.routes');
  app.use('/api/system-config', systemConfigDashboardRoutes);
  logger.info('✅ System Configuration Dashboard routes registered');

  // CRM routes (Complete CRM system with 7 modules)
  const crmRoutes = require('./routes/crm/index');
  app.use('/api/crm', crmRoutes);
  logger.info('✅ CRM routes registered (7 modules: workspaces, pipelines, boards, deals, contacts, items, activities)');

  // Integration routes - Sprint 1 (Critical Integrations)
  const aiCRMIntegrationRoutes = require('./routes/integration/ai-crm.routes');
  app.use('/api/integration/ai-to-crm', aiCRMIntegrationRoutes);
  logger.info('✅ AI to CRM Integration routes registered (Sprint 1.1)');

  const emailCRMIntegrationRoutes = require('./routes/integration/email-crm.routes');
  app.use('/api/integration/email-to-crm', emailCRMIntegrationRoutes);
  logger.info('✅ Email to CRM Integration routes registered (Sprint 1.2)');

  const bookingProjectIntegrationRoutes = require('./routes/integration/booking-project.routes');
  app.use('/api/integration/booking-to-project', bookingProjectIntegrationRoutes);
  logger.info('✅ Booking to Project Integration routes registered (Sprint 1.3)');

  // Sprint 3.1: Workflow Automation routes
  const workflowRoutes = require('./routes/automation/workflow.routes');
  app.use('/api/automation/workflows', workflowRoutes);
  logger.info('✅ Workflow Automation routes registered (Sprint 3.1)');

  // Sprint 3.2: AI Lead Scoring routes
  const leadScoringRoutes = require('./routes/automation/lead-scoring.routes');
  app.use('/api/automation/lead-scoring', leadScoringRoutes);
  logger.info('✅ AI Lead Scoring routes registered (Sprint 3.2)');

  // Sprint 4: Real-time Notifications routes
  const notificationRoutes = require('./routes/notifications.routes');
  app.use('/api/notifications', notificationRoutes);
  logger.info('✅ Real-time Notifications routes registered (Sprint 4)');

  // Sprint 5: Unified Analytics Dashboard routes
  const analyticsDashboardRoutes = require('./routes/analytics/dashboard.routes');
  app.use('/api/analytics', analyticsDashboardRoutes);
  logger.info('✅ Unified Analytics Dashboard routes registered (Sprint 5)');

  // Sprint 6: AI Insights Engine routes
  const aiInsightsRoutes = require('./routes/ai/insights.routes');
  app.use('/api/ai/insights', aiInsightsRoutes);
  logger.info('✅ AI Insights Engine routes registered (Sprint 6)');

  // Sprint 7: Advanced Search & Filtering routes
  const advancedSearchRoutes = require('./routes/search/advanced.routes');
  app.use('/api/search', advancedSearchRoutes);
  logger.info('✅ Advanced Search & Filtering routes registered (Sprint 7)');

  // Sprint 8: Multi-AI Provider System routes
  const aiProvidersRoutes = require('./routes/ai/providers.routes');
  app.use('/api/ai/providers', aiProvidersRoutes);
  logger.info('✅ Multi-AI Provider System routes registered (Sprint 8)');

  // Sprint 9: Fine-tuning Pipeline routes (Fase 2.1)
  const fineTuningRoutes = require('./routes/ai/fine-tuning.routes');
  app.use('/api/ai/fine-tuning', fineTuningRoutes);
  logger.info('✅ Fine-tuning Pipeline routes registered (Sprint 9 - Fase 2.1)');

  // Sprint 10: Vector Database routes (Fase 2.2)
  const vectorRoutes = require('./routes/vector/vector.routes');
  app.use('/api/vector', vectorRoutes);
  logger.info('✅ Vector Database routes registered (Sprint 10 - Fase 2.2)');

  // Sprint 12: Multi-Agent Systems routes (Fase 2.4)
  const agentsRoutes = require('./routes/agents/agents.routes');
  app.use('/api/agents', agentsRoutes);
  logger.info('✅ Multi-Agent Systems routes registered (Sprint 12 - Fase 2.4)');

  // Sprint 13: Voice Capabilities routes (Fase 3.1)
  const voiceRoutes = require('./routes/voice/voice.routes');
  app.use('/api/voice', voiceRoutes);
  logger.info('✅ Voice Capabilities routes registered (Sprint 13 - Fase 3.1)');

  // Sprint 14: Vision Enhancement routes (Fase 3.2)
  const visionRoutes = require('./routes/vision/vision.routes');
  app.use('/api/vision', visionRoutes);
  logger.info('✅ Vision Enhancement routes registered (Sprint 14 - Fase 3.2)');

  // Sprint 15: RAG System routes (Fase 3.3)
  const ragRoutes = require('./routes/rag/rag.routes');
  app.use('/api/rag', ragRoutes);
  logger.info('✅ RAG System routes registered (Sprint 15 - Fase 3.3)');

  // Sprint 16: Custom Inference Engine routes (Fase 3.4)
  const inferenceRoutes = require('./routes/inference/inference.routes');
  app.use('/api/inference', inferenceRoutes);
  logger.info('✅ Custom Inference Engine routes registered (Sprint 16 - Fase 3.4)');

  // Sprint 17: Model Marketplace routes (Fase 4.1)
  const marketplaceRoutes = require('./routes/marketplace/marketplace.routes');
  app.use('/api/marketplace', marketplaceRoutes);
  logger.info('✅ Model Marketplace routes registered (Sprint 17 - Fase 4.1)');

  // Sprint 18: Real-time Streaming routes (Fase 4.2)
  const streamingRoutes = require('./routes/streaming/streaming.routes');
  app.use('/api/streaming', streamingRoutes);
  logger.info('✅ Real-time Streaming routes registered (Sprint 18 - Fase 4.2)');

  // Sprint 19: Agent Orchestration Advanced routes (Fase 4.3)
  const orchestrationRoutes = require('./routes/orchestration/orchestration.routes');
  app.use('/api/orchestration', orchestrationRoutes);
  logger.info('✅ Advanced Agent Orchestration routes registered (Sprint 19 - Fase 4.3)');

  // Sprint 20: Observability routes (Fase 4.4)
  const monitoringRoutes = require('./routes/monitoring/monitoring.routes');
  app.use('/api/monitoring', monitoringRoutes);
  logger.info('✅ Observability & Monitoring routes registered (Sprint 20 - Fase 4.4)');

} catch (error) {
  logger.error('Error registering routes:', error);
  console.error('Route registration error:', error);
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Initialize configuration manager and start server
async function startServer() {
  try {
    // Initialize configuration manager
    logger.info('Initializing configuration manager...');
    await configManager.initialize();
    logger.info('✅ Configuration manager initialized');

    // Initialize WebSocket server (Sprint 4.1)
    logger.info('Initializing WebSocket server...');
    WebSocketService.initialize(server);
    logger.info('✅ WebSocket server initialized');

    // Initialize NotificationService with WebSocket (Sprint 4.2)
    const NotificationService = require('./services/NotificationService');
    global.notificationService = new NotificationService(WebSocketService);
    logger.info('✅ NotificationService initialized with WebSocket integration');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Spirit Tours Backend Server running on port ${PORT}`);
      logger.info(`📧 Nodemailer API: http://localhost:${PORT}/api/nodemailer`);
      logger.info(`⚙️ System Config API: http://localhost:${PORT}/api/admin/system-config`);
      logger.info(`📧 Email Config API: http://localhost:${PORT}/api/admin/email-config`);
      logger.info(`📝 Email Templates API: http://localhost:${PORT}/api/admin/email-templates`);
      logger.info(`🚗 Trips API: http://localhost:${PORT}/api/trips`);
      logger.info(`🔔 Notifications API: http://localhost:${PORT}/api/smart-notifications`);
      logger.info(`📱 WhatsApp API: http://localhost:${PORT}/api/whatsapp`);
      logger.info(`🤖 AI Agent API: http://localhost:${PORT}/api/ai-agent (9 services, 92 endpoints)`);
      logger.info(`⚙️ System Config Dashboard: http://localhost:${PORT}/api/system-config`);
      logger.info(`🔔 Notifications API: http://localhost:${PORT}/api/notifications`);
      logger.info(`🤖 Workflow Automation: http://localhost:${PORT}/api/automation/workflows`);
      logger.info(`🎯 AI Lead Scoring: http://localhost:${PORT}/api/automation/lead-scoring`);
      logger.info(`📊 Analytics Dashboard: http://localhost:${PORT}/api/analytics`);
      logger.info(`🤖 AI Insights Engine: http://localhost:${PORT}/api/ai/insights`);
      logger.info(`🔍 Advanced Search: http://localhost:${PORT}/api/search`);
      logger.info(`🤖 AI Providers (10+): http://localhost:${PORT}/api/ai/providers`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Log WebSocket stats
      const stats = WebSocketService.getStats();
      logger.info(`WebSocket Status: ${stats.connected_users} users, ${stats.active_trip_rooms} trips, ${stats.active_workspace_rooms} workspaces`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown() {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  // Close server and cleanup resources
  process.exit(0);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
