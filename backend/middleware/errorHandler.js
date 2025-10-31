/**
 * Centralized Error Handling Middleware
 * Catches and formats errors consistently across the application
 */

const logger = require('../utils/logger');

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database Error Handler
 */
const handleDatabaseError = (error) => {
  // PostgreSQL error codes
  const errorCodes = {
    '23505': { status: 409, message: 'Duplicate entry found' }, // Unique violation
    '23503': { status: 400, message: 'Referenced record not found' }, // Foreign key violation
    '23502': { status: 400, message: 'Required field missing' }, // Not null violation
    '23514': { status: 400, message: 'Check constraint violation' },
    '22001': { status: 400, message: 'String data too long' },
    '22P02': { status: 400, message: 'Invalid input syntax' },
  };

  const errorInfo = errorCodes[error.code];
  
  if (errorInfo) {
    return new AppError(
      `${errorInfo.message}: ${error.detail || error.message}`,
      errorInfo.status
    );
  }

  // Generic database error
  return new AppError('Database operation failed', 500);
};

/**
 * Validation Error Handler
 */
const handleValidationError = (error) => {
  const messages = error.errors?.map(err => err.message).join(', ') || error.message;
  return new AppError(`Validation failed: ${messages}`, 400);
};

/**
 * JWT Error Handler
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid authentication token', 401);
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('Authentication token expired', 401);
  }
  return new AppError('Authentication error', 401);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404
  );
  next(error);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
  });

  // Handle specific error types
  if (err.code && err.code.startsWith('23')) {
    // PostgreSQL errors
    error = handleDatabaseError(err);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400);
  }

  // Ensure error has statusCode
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: error.timestamp || new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    errorResponse.error.details = {
      originalError: err.message,
      code: err.code,
      name: err.name,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Handler Wrapper
 * Eliminates need for try-catch in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Rate Limit Error Handler
 */
const handleRateLimitError = (req, res) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.originalUrl,
  });

  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      statusCode: 429,
      retryAfter: 60, // seconds
    },
  });
};

/**
 * Business Logic Error Handler
 */
class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 400, true);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Authorization Error Handler
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, true);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error Handler
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, true);
    this.name = 'NotFoundError';
  }
}

/**
 * Duplicate Entry Error Handler
 */
class DuplicateEntryError extends AppError {
  constructor(field) {
    super(`Duplicate entry for ${field}`, 409, true);
    this.name = 'DuplicateEntryError';
  }
}

module.exports = {
  AppError,
  BusinessLogicError,
  AuthorizationError,
  NotFoundError,
  DuplicateEntryError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleRateLimitError,
};
