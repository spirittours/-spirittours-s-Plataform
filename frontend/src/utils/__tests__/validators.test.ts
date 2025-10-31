/**
 * Tests for Validator Utilities
 */

import {
  isValidEmail,
  isValidPhone,
  isValidURL,
  isValidCreditCard,
  validatePasswordStrength,
  isValidDate,
  isValidFileType,
  isValidFileSize,
} from '../validators';

describe('Validator Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('1234567890')).toBe(true);
      expect(isValidPhone('+1 (234) 567-8900')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abcdefghij')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('https://sub.domain.com/path')).toBe(true);
      expect(isValidURL('https://example.com?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('example.com')).toBe(false);
      expect(isValidURL('ftp://example.com')).toBe(false);
      expect(isValidURL('')).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('should validate correct credit card numbers using Luhn algorithm', () => {
      // Valid test card numbers
      expect(isValidCreditCard('4532015112830366')).toBe(true); // Visa
      expect(isValidCreditCard('5425233430109903')).toBe(true); // Mastercard
      expect(isValidCreditCard('374245455400126')).toBe(true); // Amex
    });

    it('should reject invalid credit card numbers', () => {
      expect(isValidCreditCard('1234567812345678')).toBe(false);
      expect(isValidCreditCard('4532015112830367')).toBe(false); // Invalid checksum
      expect(isValidCreditCard('123')).toBe(false);
      expect(isValidCreditCard('abcd1234abcd1234')).toBe(false);
      expect(isValidCreditCard('')).toBe(false);
    });

    it('should handle credit cards with spaces and dashes', () => {
      expect(isValidCreditCard('4532-0151-1283-0366')).toBe(true);
      expect(isValidCreditCard('4532 0151 1283 0366')).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('StrongP@ss123');

      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.issues).toHaveLength(0);
    });

    it('should identify weak passwords', () => {
      const result = validatePasswordStrength('weak');

      expect(result.isValid).toBe(false);
      expect(result.strength).toBe('weak');
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should require minimum length', () => {
      const result = validatePasswordStrength('Short1!');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letter', () => {
      const result = validatePasswordStrength('password123!');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letter', () => {
      const result = validatePasswordStrength('PASSWORD123!');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one lowercase letter');
    });

    it('should require number', () => {
      const result = validatePasswordStrength('Password!');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one number');
    });

    it('should require special character', () => {
      const result = validatePasswordStrength('Password123');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Password must contain at least one special character');
    });

    it('should rate medium strength passwords', () => {
      const result = validatePasswordStrength('GoodPass123!');

      expect(result.isValid).toBe(true);
      expect(['medium', 'strong']).toContain(result.strength);
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date formats', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024/01/15')).toBe(true);
      expect(isValidDate('01-15-2024')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
      expect(isValidDate('2024-01-32')).toBe(false); // Invalid day
      expect(isValidDate('not a date')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });

    it('should validate dates with min/max constraints', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(isValidDate(tomorrow.toISOString().split('T')[0], today)).toBe(true);
      expect(isValidDate(yesterday.toISOString().split('T')[0], today)).toBe(false);
    });
  });

  describe('isValidFileType', () => {
    const mockFile = (name: string, type: string) =>
      new File([''], name, { type });

    it('should validate allowed file types', () => {
      const imageFile = mockFile('photo.jpg', 'image/jpeg');
      expect(isValidFileType(imageFile, ['image/jpeg', 'image/png'])).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const textFile = mockFile('doc.txt', 'text/plain');
      expect(isValidFileType(textFile, ['image/jpeg', 'image/png'])).toBe(false);
    });

    it('should handle wildcard types', () => {
      const imageFile = mockFile('photo.png', 'image/png');
      expect(isValidFileType(imageFile, ['image/*'])).toBe(true);

      const videoFile = mockFile('video.mp4', 'video/mp4');
      expect(isValidFileType(videoFile, ['image/*'])).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    const mockFile = (size: number) =>
      new File(['x'.repeat(size)], 'test.txt', { type: 'text/plain' });

    it('should validate files within size limit', () => {
      const smallFile = mockFile(1024); // 1KB
      expect(isValidFileSize(smallFile, 5 * 1024 * 1024)).toBe(true); // 5MB limit
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = mockFile(10 * 1024 * 1024); // 10MB
      expect(isValidFileSize(largeFile, 5 * 1024 * 1024)).toBe(false); // 5MB limit
    });

    it('should use default size limit', () => {
      const file = mockFile(20 * 1024 * 1024); // 20MB
      expect(isValidFileSize(file)).toBe(false); // Default is usually 10MB
    });
  });
});
