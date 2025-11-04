/**
 * CRM Routes Index
 * 
 * Master router combining all CRM module routes.
 * Provides a unified API for the complete CRM system.
 */

const express = require('express');
const router = express.Router();

// Import all CRM route modules
const workspaceRoutes = require('./workspace.routes');
const pipelineRoutes = require('./pipeline.routes');
const boardRoutes = require('./board.routes');
const dealRoutes = require('./deal.routes');
const contactRoutes = require('./contact.routes');
const itemRoutes = require('./item.routes');
const activityRoutes = require('./activity.routes');

// Mount routes
router.use('/workspaces', workspaceRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/boards', boardRoutes);
router.use('/deals', dealRoutes);
router.use('/contacts', contactRoutes);
router.use('/items', itemRoutes);
router.use('/activities', activityRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CRM API is running',
    timestamp: new Date().toISOString(),
    modules: [
      'workspaces',
      'pipelines',
      'boards',
      'deals',
      'contacts',
      'items',
      'activities',
    ],
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Spirit Tours CRM API',
    version: '1.0.0',
    endpoints: {
      workspaces: {
        description: 'Multi-tenant workspace management with members and permissions',
        routes: [
          'GET /api/crm/workspaces',
          'GET /api/crm/workspaces/:id',
          'POST /api/crm/workspaces',
          'PUT /api/crm/workspaces/:id',
          'DELETE /api/crm/workspaces/:id',
          'POST /api/crm/workspaces/:id/members',
          'PUT /api/crm/workspaces/:id/members/:memberId',
          'DELETE /api/crm/workspaces/:id/members/:memberId',
        ],
      },
      pipelines: {
        description: 'Sales pipeline management with stages and analytics',
        routes: [
          'GET /api/crm/pipelines',
          'GET /api/crm/pipelines/:id',
          'POST /api/crm/pipelines',
          'PUT /api/crm/pipelines/:id',
          'DELETE /api/crm/pipelines/:id',
          'POST /api/crm/pipelines/:id/stages',
          'PUT /api/crm/pipelines/:id/stages/:stageId',
          'DELETE /api/crm/pipelines/:id/stages/:stageId',
          'GET /api/crm/pipelines/:id/stats',
          'GET /api/crm/pipelines/:id/velocity',
          'GET /api/crm/pipelines/:id/conversion',
        ],
      },
      boards: {
        description: 'Customizable boards with columns, views, and automations',
        routes: [
          'GET /api/crm/boards',
          'GET /api/crm/boards/:id',
          'POST /api/crm/boards',
          'PUT /api/crm/boards/:id',
          'DELETE /api/crm/boards/:id',
          'POST /api/crm/boards/:id/columns',
          'PUT /api/crm/boards/:id/columns/:columnId',
          'DELETE /api/crm/boards/:id/columns/:columnId',
          'POST /api/crm/boards/:id/views',
          'PUT /api/crm/boards/:id/views/:viewId',
          'DELETE /api/crm/boards/:id/views/:viewId',
          'POST /api/crm/boards/:id/automations',
          'PUT /api/crm/boards/:id/automations/:automationId',
          'DELETE /api/crm/boards/:id/automations/:automationId',
        ],
      },
      deals: {
        description: 'Deal management with pipeline stages and products',
        routes: [
          'GET /api/crm/deals',
          'GET /api/crm/deals/:id',
          'POST /api/crm/deals',
          'PUT /api/crm/deals/:id',
          'DELETE /api/crm/deals/:id',
          'PUT /api/crm/deals/:id/stage',
          'POST /api/crm/deals/:id/win',
          'POST /api/crm/deals/:id/lose',
          'POST /api/crm/deals/:id/products',
          'PUT /api/crm/deals/:id/products/:productIndex',
          'DELETE /api/crm/deals/:id/products/:productIndex',
          'POST /api/crm/deals/:id/activity',
          'POST /api/crm/deals/:id/assign',
        ],
      },
      contacts: {
        description: 'Contact and lead management with engagement tracking',
        routes: [
          'GET /api/crm/contacts',
          'GET /api/crm/contacts/:id',
          'POST /api/crm/contacts',
          'PUT /api/crm/contacts/:id',
          'DELETE /api/crm/contacts/:id',
          'POST /api/crm/contacts/:id/activity',
          'PUT /api/crm/contacts/:id/lead-score',
          'POST /api/crm/contacts/:id/convert',
          'POST /api/crm/contacts/bulk-import',
          'POST /api/crm/contacts/bulk-update',
        ],
      },
      items: {
        description: 'Board items with dynamic columns and subitems',
        routes: [
          'GET /api/crm/items',
          'GET /api/crm/items/:id',
          'POST /api/crm/items',
          'PUT /api/crm/items/:id',
          'DELETE /api/crm/items/:id',
          'PUT /api/crm/items/:id/column',
          'POST /api/crm/items/:id/complete',
          'POST /api/crm/items/:id/duplicate',
          'POST /api/crm/items/:id/move',
          'GET /api/crm/items/:id/subitems',
        ],
      },
      activities: {
        description: 'Activity logging and timeline for audit trail',
        routes: [
          'GET /api/crm/activities',
          'POST /api/crm/activities',
          'GET /api/crm/activities/timeline/:entityType/:entityId',
          'GET /api/crm/activities/user/:userId',
          'GET /api/crm/activities/deal/:dealId',
          'GET /api/crm/activities/contact/:contactId',
          'GET /api/crm/activities/stats',
          'GET /api/crm/activities/recent',
        ],
      },
    },
    authentication: {
      description: 'All routes require JWT authentication',
      header: 'Authorization: Bearer <token>',
    },
    features: {
      multiTenancy: 'Workspace-based isolation',
      rbac: 'Role-based access control (owner, admin, member, viewer)',
      dynamicSchema: '20+ column types for boards',
      automation: 'Trigger-based workflow automation',
      analytics: 'Pipeline velocity, conversion funnel, win rates',
      activityTracking: 'Complete audit trail and timeline',
      softDelete: 'Archive functionality for all entities',
      bulkOperations: 'Batch create, update, delete operations',
    },
  });
});

module.exports = router;
