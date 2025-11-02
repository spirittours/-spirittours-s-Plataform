/**
 * Localization Utilities
 * 
 * Helper functions for formatting dates, times, numbers, and currencies
 * according to different locales in the Spirit Tours application.
 */

import { supportedLanguages } from '../i18n/i18n.config';

/**
 * Format a date according to locale
 * @param date - Date to format
 * @param locale - Locale code (e.g., 'en', 'es', 'he')
 * @param style - Format style
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  locale: string = 'en',
  style: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };

  return new Intl.DateTimeFormat(locale, options[style]).format(date);
}

/**
 * Format time according to locale
 * @param date - Date to format
 * @param locale - Locale code
 * @param includeSeconds - Include seconds in output
 * @returns Formatted time string
 */
export function formatTime(
  date: Date,
  locale: string = 'en',
  includeSeconds: boolean = false
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    ...(includeSeconds && { second: 'numeric' }),
  };

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format date and time together
 * @param date - Date to format
 * @param locale - Locale code
 * @param style - Format style
 * @returns Formatted date-time string
 */
export function formatDateTime(
  date: Date,
  locale: string = 'en',
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  return `${formatDate(date, locale, style)} ${formatTime(date, locale)}`;
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Target date
 * @param baseDate - Base date to compare against (default: now)
 * @param locale - Locale code
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date,
  baseDate: Date = new Date(),
  locale: string = 'en'
): string {
  const diffInSeconds = Math.floor((baseDate.getTime() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

/**
 * Format currency according to locale
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'ILS')
 * @param locale - Locale code
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a number according to locale
 * @param num - Number to format
 * @param locale - Locale code
 * @param decimals - Number of decimal places (optional)
 * @returns Formatted number string
 */
export function formatNumber(
  num: number,
  locale: string = 'en',
  decimals?: number
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a percentage according to locale
 * @param value - Value to format (0.75 = 75%)
 * @param locale - Locale code
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: string = 'en',
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get currency symbol for a currency code
 * @param currency - Currency code
 * @param locale - Locale code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string = 'USD', locale: string = 'en'): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(0);

  return formatted.replace(/\d/g, '').trim();
}

/**
 * Get localized month names
 * @param locale - Locale code
 * @param style - Format style ('long', 'short', 'narrow')
 * @returns Array of month names
 */
export function getMonthNames(
  locale: string = 'en',
  style: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: style });
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1);
    return formatter.format(date);
  });
}

/**
 * Get localized weekday names
 * @param locale - Locale code
 * @param style - Format style ('long', 'short', 'narrow')
 * @returns Array of weekday names
 */
export function getWeekdayNames(
  locale: string = 'en',
  style: 'long' | 'short' | 'narrow' = 'long'
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: style });
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2000, 0, 2 + i); // January 2, 2000 was a Sunday
    return formatter.format(date);
  });
}

/**
 * Check if a locale uses 12-hour time format
 * @param locale - Locale code
 * @returns True if 12-hour format is used
 */
export function uses12HourFormat(locale: string = 'en'): boolean {
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
  }).format(new Date(2000, 0, 1, 13));

  return formatted.includes('PM') || formatted.includes('pm');
}

/**
 * Get direction (LTR/RTL) for a locale
 * @param locale - Locale code
 * @returns 'ltr' or 'rtl'
 */
export function getTextDirection(locale: string): 'ltr' | 'rtl' {
  const language = supportedLanguages[locale as keyof typeof supportedLanguages];
  return language?.dir || 'ltr';
}

/**
 * Check if a locale is RTL
 * @param locale - Locale code
 * @returns True if locale is RTL
 */
export function isRTL(locale: string): boolean {
  return getTextDirection(locale) === 'rtl';
}

/**
 * Format a duration in milliseconds to human-readable string
 * @param milliseconds - Duration in milliseconds
 * @param locale - Locale code
 * @returns Formatted duration string
 */
export function formatDuration(milliseconds: number, locale: string = 'en'): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

  if (days > 0) {
    return rtf.format(days, 'day').replace(/^in\s+|ago$/g, '').trim();
  } else if (hours > 0) {
    return rtf.format(hours, 'hour').replace(/^in\s+|ago$/g, '').trim();
  } else if (minutes > 0) {
    return rtf.format(minutes, 'minute').replace(/^in\s+|ago$/g, '').trim();
  } else {
    return rtf.format(seconds, 'second').replace(/^in\s+|ago$/g, '').trim();
  }
}

/**
 * Parse a localized date string to Date object
 * @param dateString - Date string to parse
 * @param locale - Locale code
 * @returns Date object or null if parsing fails
 */
export function parseLocalizedDate(dateString: string, locale: string = 'en'): Date | null {
  try {
    // Try to parse using the locale
    const parts = Intl.DateTimeFormat(locale)
      .formatToParts(new Date())
      .filter(part => part.type !== 'literal');
    
    // This is a simplified parser - for production, use a library like date-fns
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get locale-specific date format pattern
 * @param locale - Locale code
 * @returns Format pattern string (e.g., "MM/DD/YYYY" for en-US)
 */
export function getDateFormatPattern(locale: string = 'en'): string {
  const formatter = new Intl.DateTimeFormat(locale);
  const parts = formatter.formatToParts(new Date(2000, 11, 31));
  
  return parts
    .map(part => {
      switch (part.type) {
        case 'day':
          return 'DD';
        case 'month':
          return 'MM';
        case 'year':
          return 'YYYY';
        default:
          return part.value;
      }
    })
    .join('');
}

/**
 * Export all localization utilities
 */
export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getCurrencySymbol,
  getMonthNames,
  getWeekdayNames,
  uses12HourFormat,
  getTextDirection,
  isRTL,
  formatDuration,
  parseLocalizedDate,
  getDateFormatPattern,
};
