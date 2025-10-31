/**
 * Validation Middleware
 * Additional validation helpers and error formatting
 */

const { validationResult } = require('express-validator');

/**
 * Handle validation errors and format them consistently
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date format (ISO 8601)
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate currency amount (positive number with max 2 decimals)
 */
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return false;
  
  // Check max 2 decimal places
  const decimals = (amount.toString().split('.')[1] || '').length;
  return decimals <= 2;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate RFC (Mexican Tax ID)
 */
const isValidRFC = (rfc) => {
  // RFC can be 12 characters (moral) or 13 characters (física)
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
  return rfcRegex.test(rfc);
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be greater than 0',
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100',
    });
  }
  
  req.pagination = { page, limit };
  next();
};

/**
 * Validate date range
 */
const validateDateRange = (req, res, next) => {
  const { fecha_desde, fecha_hasta } = req.query;
  
  if (fecha_desde && !isValidDate(fecha_desde)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start date format',
    });
  }
  
  if (fecha_hasta && !isValidDate(fecha_hasta)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end date format',
    });
  }
  
  if (fecha_desde && fecha_hasta) {
    const start = new Date(fecha_desde);
    const end = new Date(fecha_hasta);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }
  }
  
  next();
};

/**
 * Validate request has required user context
 */
const validateUserContext = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'User context required',
    });
  }
  
  next();
};

/**
 * Validate sucursal (branch) access
 */
const validateSucursalAccess = async (req, res, next) => {
  try {
    const requestedSucursalId = req.body.sucursal_id || req.query.sucursal_id || req.params.sucursal_id;
    const userSucursalId = req.user.sucursal_id;
    const userRole = req.user.role;
    
    // Directors and admins can access all branches
    if (['director', 'admin'].includes(userRole)) {
      return next();
    }
    
    // Other users can only access their assigned branch
    if (requestedSucursalId && requestedSucursalId !== userSucursalId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this branch',
        userBranch: userSucursalId,
        requestedBranch: requestedSucursalId,
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Branch access validation error',
      error: error.message,
    });
  }
};

/**
 * Validate business hours (optional constraint)
 */
const validateBusinessHours = (req, res, next) => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Check if it's a weekend (Saturday=6, Sunday=0)
  const isWeekend = day === 0 || day === 6;
  
  // Check if it's business hours (8 AM - 8 PM)
  const isBusinessHours = hour >= 8 && hour < 20;
  
  // Allow certain roles to operate outside business hours
  const allowedRoles = ['gerente', 'director', 'admin'];
  
  if (!isBusinessHours || isWeekend) {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Operations outside business hours require manager approval',
        currentTime: now.toISOString(),
      });
    }
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  isValidUUID,
  isValidDate,
  isValidAmount,
  isValidEmail,
  isValidRFC,
  sanitizeInput,
  validatePagination,
  validateDateRange,
  validateUserContext,
  validateSucursalAccess,
  validateBusinessHours,
};
