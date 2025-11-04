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
const gmailRoutes = require('./gmail.routes');
const outlookRoutes = require('./outlook.routes');
const googleCalendarRoutes = require('./google-calendar.routes');
const outlookCalendarRoutes = require('./outlook-calendar.routes');
const docusignRoutes = require('./docusign.routes');
const zoomRoutes = require('./zoom.routes');
const twoFactorAuthRoutes = require('./two-factor-auth.routes');
const ssoRoutes = require('./sso.routes');
const rolesRoutes = require('./roles.routes');
const statisticsRoutes = require('./statistics.routes');

// Mount routes
router.use('/workspaces', workspaceRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/boards', boardRoutes);
router.use('/deals', dealRoutes);
router.use('/contacts', contactRoutes);
router.use('/items', itemRoutes);
router.use('/activities', activityRoutes);
router.use('/integrations/gmail', gmailRoutes);
router.use('/integrations/outlook', outlookRoutes);
router.use('/google-calendar', googleCalendarRoutes);
router.use('/outlook-calendar', outlookCalendarRoutes);
router.use('/docusign', docusignRoutes);
router.use('/zoom', zoomRoutes);
router.use('/2fa', twoFactorAuthRoutes);
router.use('/sso', ssoRoutes);
router.use('/roles', rolesRoutes);
router.use('/statistics', statisticsRoutes);

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
      'integrations/gmail',
      'integrations/outlook',
      'google-calendar',
      'outlook-calendar',
      'docusign',
      'zoom',
      '2fa',
      'sso',
      'statistics',
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
      integrations: {
        gmail: {
          description: 'Gmail API integration with OAuth 2.0 and two-way sync',
          routes: [
            'GET /api/crm/integrations/gmail/auth',
            'GET /api/crm/integrations/gmail/callback',
            'POST /api/crm/integrations/gmail/send',
            'GET /api/crm/integrations/gmail/emails',
            'GET /api/crm/integrations/gmail/emails/:id',
            'POST /api/crm/integrations/gmail/sync-contacts',
            'POST /api/crm/integrations/gmail/disconnect',
          ],
        },
        outlook: {
          description: 'Outlook/Exchange integration with Microsoft Graph API',
          routes: [
            'GET /api/crm/integrations/outlook/auth',
            'GET /api/crm/integrations/outlook/callback',
            'POST /api/crm/integrations/outlook/send',
            'GET /api/crm/integrations/outlook/emails',
            'POST /api/crm/integrations/outlook/disconnect',
          ],
        },
        googleCalendar: {
          description: 'Google Calendar integration for event management',
          routes: [
            'GET /api/crm/google-calendar/auth/:workspaceId',
            'GET /api/crm/google-calendar/callback',
            'POST /api/crm/google-calendar/create-event',
            'GET /api/crm/google-calendar/events/:workspaceId',
            'GET /api/crm/google-calendar/free-busy/:workspaceId',
            'PUT /api/crm/google-calendar/sync-settings/:workspaceId',
            'DELETE /api/crm/google-calendar/disconnect/:workspaceId',
          ],
        },
        outlookCalendar: {
          description: 'Outlook Calendar integration with Microsoft Graph',
          routes: [
            'GET /api/crm/outlook-calendar/auth/:workspaceId',
            'GET /api/crm/outlook-calendar/callback',
            'POST /api/crm/outlook-calendar/create-event',
            'GET /api/crm/outlook-calendar/events/:workspaceId',
            'GET /api/crm/outlook-calendar/free-busy/:workspaceId',
            'PUT /api/crm/outlook-calendar/sync-settings/:workspaceId',
            'DELETE /api/crm/outlook-calendar/disconnect/:workspaceId',
          ],
        },
        docusign: {
          description: 'DocuSign e-signature integration for contracts',
          routes: [
            'GET /api/crm/docusign/auth/:workspaceId',
            'GET /api/crm/docusign/callback',
            'POST /api/crm/docusign/send-envelope',
            'GET /api/crm/docusign/envelope-status/:workspaceId/:envelopeId',
            'GET /api/crm/docusign/list-envelopes/:workspaceId',
            'GET /api/crm/docusign/download-document/:workspaceId/:envelopeId/:documentId',
            'POST /api/crm/docusign/webhook',
            'DELETE /api/crm/docusign/disconnect/:workspaceId',
          ],
        },
        zoom: {
          description: 'Zoom video conferencing integration',
          routes: [
            'GET /api/crm/zoom/auth/:workspaceId',
            'GET /api/crm/zoom/callback',
            'POST /api/crm/zoom/create-meeting',
            'GET /api/crm/zoom/meeting/:workspaceId/:meetingId',
            'GET /api/crm/zoom/meetings/:workspaceId',
            'GET /api/crm/zoom/recordings/:workspaceId/:meetingId',
            'POST /api/crm/zoom/webhook',
            'DELETE /api/crm/zoom/meeting/:workspaceId/:meetingId',
            'DELETE /api/crm/zoom/disconnect/:workspaceId',
          ],
        },
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
