/**
 * Role-Based Access Control (RBAC) Middleware
 * Permissions system for tour operator management
 */

/**
 * Role hierarchy and definitions
 */
const ROLES = {
  SYSTEM_ADMIN: 'system_admin',       // Full system access
  OPERATOR_ADMIN: 'operator_admin',   // Manage their own operator
  OPERATOR_USER: 'operator_user',     // Read-only access to their operator
  AGENT: 'agent',                     // Travel agent access
  CUSTOMER: 'customer',               // End customer
};

/**
 * Permission definitions
 */
const PERMISSIONS = {
  // Tour Operator Management
  TOUR_OPERATORS_CREATE: 'tour_operators:create',
  TOUR_OPERATORS_READ_ALL: 'tour_operators:read:all',
  TOUR_OPERATORS_READ_OWN: 'tour_operators:read:own',
  TOUR_OPERATORS_UPDATE_ALL: 'tour_operators:update:all',
  TOUR_OPERATORS_UPDATE_OWN: 'tour_operators:update:own',
  TOUR_OPERATORS_DELETE: 'tour_operators:delete',
  TOUR_OPERATORS_ACTIVATE: 'tour_operators:activate',
  TOUR_OPERATORS_CONFIGURE: 'tour_operators:configure',
  
  // Credentials Management
  CREDENTIALS_UPDATE_ALL: 'credentials:update:all',
  CREDENTIALS_UPDATE_OWN: 'credentials:update:own',
  CREDENTIALS_VIEW_ALL: 'credentials:view:all',
  CREDENTIALS_VIEW_OWN: 'credentials:view:own',
  
  // Integration Operations
  INTEGRATION_TEST: 'integration:test',
  INTEGRATION_SEARCH: 'integration:search',
  INTEGRATION_BOOK: 'integration:book',
  
  // B2B Operations
  B2B_BOOKING_CREATE: 'b2b:booking:create',
  B2B_BOOKING_VIEW: 'b2b:booking:view',
  B2B_BOOKING_CANCEL: 'b2b:booking:cancel',
};

/**
 * Role permissions mapping
 */
const ROLE_PERMISSIONS = {
  [ROLES.SYSTEM_ADMIN]: [
    // All permissions
    ...Object.values(PERMISSIONS),
  ],
  
  [ROLES.OPERATOR_ADMIN]: [
    // Own operator management
    PERMISSIONS.TOUR_OPERATORS_READ_OWN,
    PERMISSIONS.TOUR_OPERATORS_UPDATE_OWN,
    PERMISSIONS.TOUR_OPERATORS_CONFIGURE,
    
    // Own credentials management
    PERMISSIONS.CREDENTIALS_UPDATE_OWN,
    PERMISSIONS.CREDENTIALS_VIEW_OWN,
    
    // Integration operations
    PERMISSIONS.INTEGRATION_TEST,
    PERMISSIONS.INTEGRATION_SEARCH,
    PERMISSIONS.INTEGRATION_BOOK,
    
    // B2B operations
    PERMISSIONS.B2B_BOOKING_CREATE,
    PERMISSIONS.B2B_BOOKING_VIEW,
    PERMISSIONS.B2B_BOOKING_CANCEL,
  ],
  
  [ROLES.OPERATOR_USER]: [
    // Read-only access to own operator
    PERMISSIONS.TOUR_OPERATORS_READ_OWN,
    PERMISSIONS.CREDENTIALS_VIEW_OWN,
    
    // Integration search only
    PERMISSIONS.INTEGRATION_SEARCH,
    
    // View bookings only
    PERMISSIONS.B2B_BOOKING_VIEW,
  ],
  
  [ROLES.AGENT]: [
    // Search and book
    PERMISSIONS.INTEGRATION_SEARCH,
    PERMISSIONS.INTEGRATION_BOOK,
    PERMISSIONS.B2B_BOOKING_CREATE,
    PERMISSIONS.B2B_BOOKING_VIEW,
  ],
  
  [ROLES.CUSTOMER]: [
    // No tour operator permissions
  ],
};

/**
 * Check if user has specific permission
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }
  
  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Check custom permissions
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }
  
  return false;
};

/**
 * Check if user has any of the specified permissions
 */
const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 */
const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Middleware: Require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida',
      code: 'AUTH_REQUIRED',
    });
  }
  next();
};

/**
 * Middleware: Require specific role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED',
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos suficientes',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.user.role,
      });
    }
    
    next();
  };
};

/**
 * Middleware: Require specific permission
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED',
      });
    }
    
    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos suficientes',
        code: 'INSUFFICIENT_PERMISSION',
        required: permissions,
      });
    }
    
    next();
  };
};

/**
 * Middleware: Require system admin
 */
const requireSystemAdmin = requireRole(ROLES.SYSTEM_ADMIN);

/**
 * Middleware: Require operator admin or system admin
 */
const requireOperatorAdmin = requireRole(ROLES.SYSTEM_ADMIN, ROLES.OPERATOR_ADMIN);

/**
 * Middleware: Check operator ownership
 * Validates that operator_admin users can only access their own operator
 */
const checkOperatorOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED',
      });
    }
    
    // System admins can access any operator
    if (req.user.role === ROLES.SYSTEM_ADMIN) {
      return next();
    }
    
    // Get operator ID from params or body
    const operatorId = req.params.id || req.body.operatorId || req.body.tourOperator;
    
    if (!operatorId) {
      return res.status(400).json({
        success: false,
        error: 'ID del operador requerido',
        code: 'OPERATOR_ID_REQUIRED',
      });
    }
    
    // Operator admins must own the operator
    if (req.user.role === ROLES.OPERATOR_ADMIN) {
      if (!req.user.organization) {
        return res.status(403).json({
          success: false,
          error: 'Usuario no está asociado a ningún operador',
          code: 'NO_OPERATOR_ASSOCIATION',
        });
      }
      
      // Check if user's organization matches the requested operator
      const userOrgId = req.user.organization.toString();
      const requestedOpId = operatorId.toString();
      
      if (userOrgId !== requestedOpId) {
        return res.status(403).json({
          success: false,
          error: 'No tiene permisos para acceder a este operador',
          code: 'OPERATOR_ACCESS_DENIED',
          userOperator: userOrgId,
          requestedOperator: requestedOpId,
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error verificando permisos de operador',
      code: 'OWNERSHIP_CHECK_ERROR',
      details: error.message,
    });
  }
};

/**
 * Middleware: Check credentials access
 * Determines if user can view/edit credentials based on role and ownership
 */
const checkCredentialsAccess = (action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Autenticación requerida',
          code: 'AUTH_REQUIRED',
        });
      }
      
      const operatorId = req.params.id || req.body.operatorId;
      
      // System admins can access all credentials
      if (req.user.role === ROLES.SYSTEM_ADMIN) {
        return next();
      }
      
      // Check permission based on action
      const permission = action === 'update' 
        ? PERMISSIONS.CREDENTIALS_UPDATE_OWN 
        : PERMISSIONS.CREDENTIALS_VIEW_OWN;
      
      if (!hasPermission(req.user, permission)) {
        return res.status(403).json({
          success: false,
          error: `No tiene permisos para ${action === 'update' ? 'modificar' : 'ver'} credenciales`,
          code: 'CREDENTIALS_ACCESS_DENIED',
        });
      }
      
      // Check ownership
      if (req.user.organization) {
        const userOrgId = req.user.organization.toString();
        const requestedOpId = operatorId.toString();
        
        if (userOrgId !== requestedOpId) {
          return res.status(403).json({
            success: false,
            error: 'Solo puede acceder a las credenciales de su operador',
            code: 'CREDENTIALS_OWNERSHIP_DENIED',
          });
        }
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error verificando acceso a credenciales',
        code: 'CREDENTIALS_CHECK_ERROR',
        details: error.message,
      });
    }
  };
};

/**
 * Utility: Get user's accessible operators
 */
const getAccessibleOperators = (user) => {
  if (user.role === ROLES.SYSTEM_ADMIN) {
    return null; // null means all operators
  }
  
  if (user.organization) {
    return [user.organization];
  }
  
  return [];
};

/**
 * Utility: Build query filter for operator access
 */
const buildOperatorAccessFilter = (user, baseFilter = {}) => {
  const accessibleOperators = getAccessibleOperators(user);
  
  if (accessibleOperators === null) {
    // System admin - no additional filter
    return baseFilter;
  }
  
  if (accessibleOperators.length === 0) {
    // No access - return impossible filter
    return { ...baseFilter, _id: null };
  }
  
  // Filter by accessible operators
  return {
    ...baseFilter,
    _id: { $in: accessibleOperators },
  };
};

module.exports = {
  // Constants
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  
  // Permission checks
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  
  // Middleware
  requireAuth,
  requireRole,
  requirePermission,
  requireSystemAdmin,
  requireOperatorAdmin,
  checkOperatorOwnership,
  checkCredentialsAccess,
  
  // Utilities
  getAccessibleOperators,
  buildOperatorAccessFilter,
};
