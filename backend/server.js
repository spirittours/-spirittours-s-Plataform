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
const PORT = process.env.NODE_PORT || 5001;

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
    message: 'Spirit Tours API',
    version: '1.0.0',
    endpoints: {
      nodemailer: '/api/nodemailer',
      emailConfig: '/api/admin/email-config',
      emailTemplates: '/api/admin/email-templates',
      systemConfig: '/api/admin/system-config'
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

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Spirit Tours Backend Server running on port ${PORT}`);
      logger.info(`📧 Nodemailer API: http://localhost:${PORT}/api/nodemailer`);
      logger.info(`⚙️ System Config API: http://localhost:${PORT}/api/admin/system-config`);
      logger.info(`📧 Email Config API: http://localhost:${PORT}/api/admin/email-config`);
      logger.info(`📝 Email Templates API: http://localhost:${PORT}/api/admin/email-templates`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
