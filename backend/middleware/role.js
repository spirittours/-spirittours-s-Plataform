/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 */

/**
 * Check if user has required role
 * @param {Array<string>} allowedRoles - Array of role names that can access the route
 * @returns {Function} Express middleware function
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (should be set by authMiddleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          userRole: req.user.role,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: error.message,
      });
    }
  };
};

/**
 * Role hierarchy definition
 * Higher number = more permissions
 */
const ROLE_HIERARCHY = {
  cajero: 1,
  contador: 2,
  supervisor: 3,
  gerente: 4,
  director: 5,
  admin: 6,
};

/**
 * Check if user has minimum role level
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} Express middleware function
 */
const minRoleMiddleware = (minimumRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Minimum role required: ${minimumRole}`,
          userRole: req.user.role,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization error',
        error: error.message,
      });
    }
  };
};

/**
 * Check if user can authorize based on amount
 * @param {string} amountField - Field name containing the amount
 * @returns {Function} Express middleware function
 */
const authorizationLimitMiddleware = (amountField = 'monto_total') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const amount = parseFloat(req.body[amountField] || req.query[amountField] || 0);
      const role = req.user.role;

      // Authorization limits by role
      const limits = {
        supervisor: 5000,
        gerente: 20000,
        director: Infinity,
      };

      const userLimit = limits[role] || 0;

      if (amount > userLimit) {
        return res.status(403).json({
          success: false,
          message: `Amount exceeds authorization limit. Your limit: $${userLimit.toLocaleString()}, Required: $${amount.toLocaleString()}`,
          userRole: role,
          userLimit,
          requestedAmount: amount,
        });
      }

      // Attach limit info to request for logging
      req.authorizationInfo = {
        userLimit,
        amount,
        withinLimit: true,
      };

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authorization check error',
        error: error.message,
      });
    }
  };
};

module.exports = roleMiddleware;
module.exports.minRoleMiddleware = minRoleMiddleware;
module.exports.authorizationLimitMiddleware = authorizationLimitMiddleware;
module.exports.ROLE_HIERARCHY = ROLE_HIERARCHY;
