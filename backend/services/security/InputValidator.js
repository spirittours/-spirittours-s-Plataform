const validator = require('validator');
const xss = require('xss');

/**
 * InputValidator - Comprehensive input validation and sanitization
 * 
 * Features:
 * - SQL injection prevention
 * - XSS attack prevention
 * - NoSQL injection prevention
 * - Command injection prevention
 * - Path traversal prevention
 * - Email, URL, phone validation
 * - Custom validation rules
 * - Data sanitization
 */
class InputValidator {
  constructor() {
    this.config = {
      maxStringLength: 10000,
      maxArrayLength: 1000,
      maxObjectDepth: 10,
      allowedFileExtensions: [
        '.jpg', '.jpeg', '.png', '.gif', '.pdf', 
        '.doc', '.docx', '.xls', '.xlsx', '.csv'
      ],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };

    this.stats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      sanitizations: 0,
      blockedAttacks: 0
    };

    // Dangerous patterns
    this.dangerousPatterns = {
      sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      nosqlInjection: /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$regex|\$or|\$and)/gi,
      commandInjection: /(;|\||&|`|\$\(|\$\{|<\(|>\()/g,
      pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|%2e%2e%5c)/gi,
      xssPatterns: /(<script|javascript:|onerror=|onload=|<iframe|eval\(|expression\()/gi
    };
  }

  /**
   * Validate and sanitize object with schema
   */
  validate(data, schema, options = {}) {
    this.stats.totalValidations++;

    try {
      const errors = [];
      const sanitized = {};

      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        const fieldErrors = this.validateField(field, value, rules);

        if (fieldErrors.length > 0) {
          errors.push(...fieldErrors);
        } else {
          // Sanitize valid field
          sanitized[field] = this.sanitizeValue(value, rules);
        }
      }

      if (errors.length > 0) {
        this.stats.failedValidations++;
        return {
          valid: false,
          errors,
          data: null
        };
      }

      this.stats.passedValidations++;
      return {
        valid: true,
        errors: [],
        data: sanitized
      };
    } catch (error) {
      this.stats.failedValidations++;
      return {
        valid: false,
        errors: [{ field: 'general', message: error.message }],
        data: null
      };
    }
  }

  /**
   * Validate single field
   */
  validateField(field, value, rules) {
    const errors = [];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required` });
      return errors;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null)) {
      return errors;
    }

    // Type validation
    if (rules.type) {
      const typeError = this.validateType(field, value, rules.type);
      if (typeError) errors.push(typeError);
    }

    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must not exceed ${rules.maxLength} characters` });
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push({ field, message: `${field} format is invalid` });
      }
    }

    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min}` });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({ field, message: `${field} must not exceed ${rules.max}` });
      }
    }

    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push({ field, message: `${field} must contain at least ${rules.minItems} items` });
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({ field, message: `${field} must not contain more than ${rules.maxItems} items` });
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
    }

    // Email validation
    if (rules.format === 'email' && !validator.isEmail(value)) {
      errors.push({ field, message: `${field} must be a valid email address` });
    }

    // URL validation
    if (rules.format === 'url' && !validator.isURL(value)) {
      errors.push({ field, message: `${field} must be a valid URL` });
    }

    // Phone validation
    if (rules.format === 'phone' && !validator.isMobilePhone(value)) {
      errors.push({ field, message: `${field} must be a valid phone number` });
    }

    // Date validation
    if (rules.format === 'date' && !validator.isISO8601(value)) {
      errors.push({ field, message: `${field} must be a valid ISO 8601 date` });
    }

    // Custom validator
    if (rules.custom && typeof rules.custom === 'function') {
      const customError = rules.custom(value);
      if (customError) {
        errors.push({ field, message: customError });
      }
    }

    return errors;
  }

  /**
   * Validate type
   */
  validateType(field, value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'array' && !Array.isArray(value)) {
      return { field, message: `${field} must be an array` };
    }

    if (expectedType === 'object' && (actualType !== 'object' || value === null || Array.isArray(value))) {
      return { field, message: `${field} must be an object` };
    }

    if (expectedType !== 'array' && expectedType !== 'object' && actualType !== expectedType) {
      return { field, message: `${field} must be a ${expectedType}` };
    }

    return null;
  }

  /**
   * Sanitize value
   */
  sanitizeValue(value, rules) {
    if (value === null || value === undefined) {
      return value;
    }

    this.stats.sanitizations++;

    // String sanitization
    if (typeof value === 'string') {
      let sanitized = value;

      // XSS prevention
      if (rules.sanitize !== false) {
        sanitized = this.sanitizeXSS(sanitized);
      }

      // SQL injection prevention
      sanitized = this.sanitizeSQL(sanitized);

      // NoSQL injection prevention
      sanitized = this.sanitizeNoSQL(sanitized);

      // Trim whitespace
      if (rules.trim !== false) {
        sanitized = sanitized.trim();
      }

      // Lowercase
      if (rules.lowercase) {
        sanitized = sanitized.toLowerCase();
      }

      // Uppercase
      if (rules.uppercase) {
        sanitized = sanitized.toUpperCase();
      }

      return sanitized;
    }

    // Array sanitization
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item, rules.items || {}));
    }

    // Object sanitization
    if (typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        const fieldRules = rules.properties?.[key] || {};
        sanitized[key] = this.sanitizeValue(val, fieldRules);
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Sanitize XSS attacks
   */
  sanitizeXSS(input) {
    if (typeof input !== 'string') return input;

    // Use xss library for comprehensive XSS prevention
    return xss(input, {
      whiteList: {}, // No HTML tags allowed by default
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }

  /**
   * Sanitize SQL injection attempts
   */
  sanitizeSQL(input) {
    if (typeof input !== 'string') return input;

    // Escape dangerous SQL keywords
    return input.replace(this.dangerousPatterns.sqlInjection, '');
  }

  /**
   * Sanitize NoSQL injection attempts
   */
  sanitizeNoSQL(input) {
    if (typeof input !== 'string') return input;

    // Remove MongoDB operators
    return input.replace(this.dangerousPatterns.nosqlInjection, '');
  }

  /**
   * Detect injection attacks
   */
  detectInjection(input) {
    if (typeof input !== 'string') return null;

    const attacks = [];

    if (this.dangerousPatterns.sqlInjection.test(input)) {
      attacks.push('SQL Injection');
      this.stats.blockedAttacks++;
    }

    if (this.dangerousPatterns.nosqlInjection.test(input)) {
      attacks.push('NoSQL Injection');
      this.stats.blockedAttacks++;
    }

    if (this.dangerousPatterns.commandInjection.test(input)) {
      attacks.push('Command Injection');
      this.stats.blockedAttacks++;
    }

    if (this.dangerousPatterns.pathTraversal.test(input)) {
      attacks.push('Path Traversal');
      this.stats.blockedAttacks++;
    }

    if (this.dangerousPatterns.xssPatterns.test(input)) {
      attacks.push('XSS Attack');
      this.stats.blockedAttacks++;
    }

    return attacks.length > 0 ? attacks : null;
  }

  /**
   * Validate file upload
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      return { valid: false, errors: [{ message: 'No file provided' }] };
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push({
        message: `File size exceeds maximum allowed (${this.config.maxFileSize / 1024 / 1024}MB)`
      });
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.config.allowedFileExtensions.includes(extension)) {
      errors.push({
        message: `File type not allowed. Allowed types: ${this.config.allowedFileExtensions.join(', ')}`
      });
    }

    // Check for path traversal in filename
    if (this.dangerousPatterns.pathTraversal.test(file.name)) {
      errors.push({ message: 'Invalid filename' });
      this.stats.blockedAttacks++;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    if (typeof filename !== 'string') return 'file';

    // Remove path traversal attempts
    let sanitized = filename.replace(this.dangerousPatterns.pathTraversal, '');

    // Remove special characters
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      sanitized = sanitized.substring(0, 250) + '.' + extension;
    }

    return sanitized;
  }

  /**
   * Validate email
   */
  isValidEmail(email) {
    return validator.isEmail(email);
  }

  /**
   * Validate URL
   */
  isValidURL(url) {
    return validator.isURL(url);
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone, locale = 'any') {
    return validator.isMobilePhone(phone, locale);
  }

  /**
   * Validate ObjectId
   */
  isValidObjectId(id) {
    return validator.isMongoId(id);
  }

  /**
   * Validate JWT token
   */
  isValidJWT(token) {
    return validator.isJWT(token);
  }

  /**
   * Sanitize MongoDB query
   */
  sanitizeMongoQuery(query) {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(query)) {
      // Remove operator keys that start with $
      if (key.startsWith('$')) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMongoQuery(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeNoSQL(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get validation statistics
   */
  getStats() {
    const successRate = this.stats.totalValidations > 0
      ? (this.stats.passedValidations / this.stats.totalValidations) * 100
      : 0;

    return {
      ...this.stats,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      sanitizations: 0,
      blockedAttacks: 0
    };
  }

  /**
   * Common validation schemas
   */
  getCommonSchemas() {
    return {
      email: {
        email: {
          type: 'string',
          required: true,
          format: 'email',
          maxLength: 255
        }
      },
      password: {
        password: {
          type: 'string',
          required: true,
          minLength: 8,
          maxLength: 128,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
        }
      },
      userId: {
        userId: {
          type: 'string',
          required: true,
          custom: (value) => {
            if (!validator.isMongoId(value)) {
              return 'Invalid user ID format';
            }
          }
        }
      },
      pagination: {
        page: {
          type: 'number',
          required: false,
          min: 1,
          max: 10000
        },
        limit: {
          type: 'number',
          required: false,
          min: 1,
          max: 1000
        }
      }
    };
  }
}

module.exports = new InputValidator();
