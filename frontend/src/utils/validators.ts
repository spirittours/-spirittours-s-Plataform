/**
 * Validation Utilities
 * Common validation functions for forms and data
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (international format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate credit card number (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} => {
  const issues: string[] = [];
  let score = 0;

  if (password.length < 8) {
    issues.push('Password must be at least 8 characters long');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one number');
  } else {
    score++;
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    issues.push('Password must contain at least one special character');
  } else {
    score++;
  }

  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
  const isValid = score >= 4;

  return { isValid, strength, issues };
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate min length
 */
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

/**
 * Validate max length
 */
export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

/**
 * Validate min value (numbers)
 */
export const minValue = (value: number, min: number): boolean => {
  return value >= min;
};

/**
 * Validate max value (numbers)
 */
export const maxValue = (value: number, max: number): boolean => {
  return value <= max;
};

/**
 * Validate value is in range
 */
export const inRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * Validate file type
 */
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0];
      return file.type.startsWith(`${baseType}/`);
    }
    return file.type === type;
  });
};

/**
 * Validate date is in the future
 */
export const isFutureDate = (date: Date | string): boolean => {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return inputDate > new Date();
};

/**
 * Validate date is in the past
 */
export const isPastDate = (date: Date | string): boolean => {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return inputDate < new Date();
};

/**
 * Validate age (must be 18+)
 */
export const isValidAge = (birthDate: Date | string, minAge: number = 18): boolean => {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= minAge;
  }
  
  return age >= minAge;
};
