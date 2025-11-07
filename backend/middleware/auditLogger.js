/**
 * Audit Logger Middleware
 * 
 * Automatically logs all API requests for audit trail
 * Captures request details, user information, and response data
 */

const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Middleware to log API requests
 */
const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody;
    let responseStatus;
    
    // Override res.send
    res.send = function(body) {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalSend.call(this, body);
    };
    
    // Override res.json
    res.json = function(body) {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalJson.call(this, body);
    };
    
    // Continue to next middleware
    next();
    
    // Log after response is sent
    res.on('finish', async () => {
      try {
        // Skip logging for certain routes
        if (shouldSkipLogging(req.path, options.skipRoutes)) {
          return;
        }
        
        const duration = Date.now() - startTime;
        
        // Determine action from method and path
        const action = determineAction(req.method, req.path, req.body);
        
        // Determine resource type
        const resourceType = determineResourceType(req.path);
        
        // Extract workspace ID
        const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
        
        if (!workspaceId) {
          return; // Skip if no workspace context
        }
        
        // Get user information
        let user = null;
        let userEmail = null;
        let userName = null;
        
        if (req.user) {
          user = req.user.id;
          const userData = await User.findById(req.user.id).select('email firstName lastName');
          if (userData) {
            userEmail = userData.email;
            userName = `${userData.firstName} ${userData.lastName}`;
          }
        }
        
        // Determine severity
        const severity = determineSeverity(req.method, responseStatus, action);
        
        // Create audit log
        await AuditLog.log({
          workspace: workspaceId,
          user,
          userEmail,
          userName,
          action,
          resourceType,
          resourceId: req.params.id || req.params.dealId || req.params.contactId,
          request: {
            method: req.method,
            endpoint: req.path,
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
          },
          response: {
            status: responseStatus,
            duration,
            success: responseStatus < 400,
            errorMessage: responseStatus >= 400 ? responseBody?.error || responseBody?.message : null,
          },
          metadata: {
            body: sanitizeBody(req.body),
            query: req.query,
          },
          severity,
          tags: determineTags(action, req.path),
        });
      } catch (error) {
        console.error('Audit logging error:', error);
        // Don't throw to avoid breaking application
      }
    });
  };
};

/**
 * Check if route should be skipped
 */
const shouldSkipLogging = (path, skipRoutes = []) => {
  // Default skip routes
  const defaultSkipRoutes = [
    '/api/crm/health',
    '/api/crm/docs',
    '/favicon.ico',
  ];
  
  const allSkipRoutes = [...defaultSkipRoutes, ...skipRoutes];
  
  return allSkipRoutes.some(route => path.includes(route));
};

/**
 * Determine action from request
 */
const determineAction = (method, path, body) => {
  // Authentication
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/2fa/enable')) return '2fa_enabled';
  if (path.includes('/2fa/disable')) return '2fa_disabled';
  if (path.includes('/sso')) return 'sso_login';
  
  // Member management
  if (path.includes('/members') && method === 'POST') return 'member_added';
  if (path.includes('/members') && method === 'DELETE') return 'member_removed';
  if (path.includes('/members') && method === 'PUT') return 'member_role_changed';
  
  // Role management
  if (path.includes('/roles') && method === 'POST') return 'role_created';
  if (path.includes('/roles') && method === 'PUT') return 'role_updated';
  if (path.includes('/roles') && method === 'DELETE') return 'role_deleted';
  
  // Bulk operations
  if (path.includes('/bulk-create')) return 'bulk_create';
  if (path.includes('/bulk-update')) return 'bulk_update';
  if (path.includes('/bulk-delete')) return 'bulk_delete';
  
  // Data operations
  if (path.includes('/export')) return 'data_exported';
  if (path.includes('/import')) return 'data_imported';
  
  // Settings
  if (path.includes('/settings') || path.includes('/configure')) return 'settings_changed';
  if (path.includes('/integration') && method === 'POST') return 'integration_enabled';
  if (path.includes('/integration') && method === 'DELETE') return 'integration_disabled';
  if (path.includes('/disconnect')) return 'integration_disabled';
  
  // Security
  if (path.includes('/security')) return 'security_setting_changed';
  if (path.includes('/password')) return 'password_changed';
  
  // Standard CRUD
  if (method === 'POST') return 'create';
  if (method === 'GET') return 'read';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  
  return 'unknown';
};

/**
 * Determine resource type from path
 */
const determineResourceType = (path) => {
  if (path.includes('/workspaces')) return 'Workspace';
  if (path.includes('/boards')) return 'Board';
  if (path.includes('/pipelines')) return 'Pipeline';
  if (path.includes('/deals')) return 'Deal';
  if (path.includes('/contacts')) return 'Contact';
  if (path.includes('/items')) return 'Item';
  if (path.includes('/activities')) return 'Activity';
  if (path.includes('/roles')) return 'Role';
  if (path.includes('/users')) return 'User';
  if (path.includes('/members')) return 'Member';
  if (path.includes('/settings')) return 'Settings';
  if (path.includes('/integration')) return 'Integration';
  
  return 'Unknown';
};

/**
 * Determine severity level
 */
const determineSeverity = (method, status, action) => {
  // Critical actions
  if (['delete', 'member_removed', 'role_deleted', 'integration_disabled'].includes(action)) {
    return 'critical';
  }
  
  // Security actions
  if (action.includes('security') || action.includes('2fa') || action.includes('sso')) {
    return 'warning';
  }
  
  // Errors
  if (status >= 500) return 'critical';
  if (status >= 400) return 'error';
  
  // Bulk operations
  if (action.includes('bulk')) return 'warning';
  
  return 'info';
};

/**
 * Determine tags for categorization
 */
const determineTags = (action, path) => {
  const tags = [];
  
  if (action.includes('login') || action.includes('logout') || action.includes('2fa') || action.includes('sso')) {
    tags.push('authentication');
  }
  
  if (action.includes('security') || action.includes('permission') || action.includes('role')) {
    tags.push('security');
  }
  
  if (action.includes('export') || action.includes('import')) {
    tags.push('data-operation');
  }
  
  if (action.includes('bulk')) {
    tags.push('bulk-operation');
  }
  
  if (action.includes('integration')) {
    tags.push('integration');
  }
  
  if (path.includes('/settings') || path.includes('/configure')) {
    tags.push('configuration');
  }
  
  return tags;
};

/**
 * Sanitize request body (remove sensitive data)
 */
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'clientSecret'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

module.exports = {
  auditLogger,
};
