/**
 * PHASE 3: Mobile Analytics App - Utility Formatters
 * Comprehensive formatting utilities for numbers, currency, dates, and more
 */

import { format as formatDate, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format numbers with appropriate suffixes (K, M, B)
 */
export const formatNumber = (
  value: number,
  options?: {
    precision?: number;
    compact?: boolean;
    showSign?: boolean;
  }
): string => {
  const { precision = 1, compact = true, showSign = false } = options || {};

  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }

  const sign = showSign && value > 0 ? '+' : '';
  const absValue = Math.abs(value);

  if (!compact) {
    return `${sign}${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    })}`;
  }

  if (absValue >= 1e9) {
    return `${sign}${(value / 1e9).toFixed(precision)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${(value / 1e6).toFixed(precision)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${(value / 1e3).toFixed(precision)}K`;
  }

  return `${sign}${value.toFixed(precision)}`;
};

/**
 * Format currency values
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  options?: {
    precision?: number;
    compact?: boolean;
    showSymbol?: boolean;
  }
): string => {
  const { precision = 0, compact = true, showSymbol = true } = options || {};

  if (isNaN(value) || !isFinite(value)) {
    return showSymbol ? '$0' : '0';
  }

  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
  };

  const symbol = showSymbol ? (currencySymbols[currency] || '$') : '';

  if (compact) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e9) {
      return `${sign}${symbol}${(Math.abs(value) / 1e9).toFixed(precision)}B`;
    }
    if (absValue >= 1e6) {
      return `${sign}${symbol}${(Math.abs(value) / 1e6).toFixed(precision)}M`;
    }
    if (absValue >= 1e3) {
      return `${sign}${symbol}${(Math.abs(value) / 1e3).toFixed(precision)}K`;
    }
  }

  return `${symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
};

/**
 * Format percentage values
 */
export const formatPercentage = (
  value: number,
  options?: {
    precision?: number;
    showSign?: boolean;
  }
): string => {
  const { precision = 1, showSign = false } = options || {};

  if (isNaN(value) || !isFinite(value)) {
    return '0%';
  }

  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
};

/**
 * Format duration in various units
 */
export const formatDuration = (
  seconds: number,
  options?: {
    format?: 'short' | 'long' | 'compact';
    maxUnits?: number;
  }
): string => {
  const { format = 'short', maxUnits = 2 } = options || {};

  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0s';
  }

  const units = [
    { label: 'year', short: 'y', value: 31536000 },
    { label: 'month', short: 'mo', value: 2592000 },
    { label: 'day', short: 'd', value: 86400 },
    { label: 'hour', short: 'h', value: 3600 },
    { label: 'minute', short: 'm', value: 60 },
    { label: 'second', short: 's', value: 1 },
  ];

  const parts: string[] = [];
  let remaining = Math.floor(seconds);

  for (const unit of units) {
    if (remaining >= unit.value && parts.length < maxUnits) {
      const count = Math.floor(remaining / unit.value);
      remaining %= unit.value;

      if (format === 'compact') {
        parts.push(`${count}${unit.short}`);
      } else if (format === 'short') {
        parts.push(`${count}${unit.short}`);
      } else {
        const plural = count !== 1 ? 's' : '';
        parts.push(`${count} ${unit.label}${plural}`);
      }
    }
  }

  if (parts.length === 0) {
    return format === 'compact' ? '0s' : '0 seconds';
  }

  return parts.join(format === 'long' ? ', ' : ' ');
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (
  bytes: number,
  options?: {
    precision?: number;
    binary?: boolean;
  }
): string => {
  const { precision = 1, binary = false } = options || {};

  if (isNaN(bytes) || !isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const threshold = binary ? 1024 : 1000;
  const units = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  if (bytes < threshold) {
    return `${bytes} B`;
  }

  let unitIndex = 0;
  let value = bytes;

  while (value >= threshold && unitIndex < units.length - 1) {
    value /= threshold;
    unitIndex++;
  }

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

/**
 * Format date to various formats
 */
export const formatDateTime = (
  date: Date | string | number,
  formatType?: 'full' | 'date' | 'time' | 'short' | 'relative' | 'iso'
): string => {
  try {
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    switch (formatType) {
      case 'full':
        return formatDate(dateObj, 'PPPPp'); // Monday, April 1st, 2024 at 2:30 PM
      case 'date':
        return formatDate(dateObj, 'PPP'); // April 1st, 2024
      case 'time':
        return formatDate(dateObj, 'p'); // 2:30 PM
      case 'short':
        return formatDate(dateObj, 'MM/dd/yyyy HH:mm'); // 04/01/2024 14:30
      case 'relative':
        return formatDistanceToNow(dateObj, { addSuffix: true }); // 2 hours ago
      case 'iso':
        return dateObj.toISOString(); // 2024-04-01T14:30:00.000Z
      default:
        return formatDate(dateObj, 'PPp'); // Apr 1, 2024, 2:30 PM
    }
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format phone numbers
 */
export const formatPhoneNumber = (
  phoneNumber: string,
  format?: 'us' | 'international'
): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (format === 'international') {
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return `+${cleaned}`;
  }

  // US format
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phoneNumber; // Return original if can't format
};

/**
 * Format text to title case
 */
export const toTitleCase = (text: string): string => {
  return text.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Format text to sentence case
 */
export const toSentenceCase = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (
  text: string,
  maxLength: number,
  options?: {
    wordBoundary?: boolean;
    suffix?: string;
  }
): string => {
  const { wordBoundary = true, suffix = '...' } = options || {};

  if (text.length <= maxLength) {
    return text;
  }

  let truncated = text.slice(0, maxLength - suffix.length);

  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }
  }

  return truncated + suffix;
};

/**
 * Format metric change with appropriate formatting
 */
export const formatChange = (
  current: number,
  previous: number,
  options?: {
    format?: 'number' | 'currency' | 'percentage';
    currency?: string;
    showPercentage?: boolean;
    showSign?: boolean;
  }
): {
  value: string;
  percentage: string;
  isPositive: boolean;
  isNeutral: boolean;
} => {
  const {
    format = 'number',
    currency = 'USD',
    showPercentage = true,
    showSign = true,
  } = options || {};

  if (previous === 0) {
    return {
      value: '0',
      percentage: '0%',
      isPositive: false,
      isNeutral: true,
    };
  }

  const change = current - previous;
  const percentChange = (change / Math.abs(previous)) * 100;

  let formattedValue: string;
  switch (format) {
    case 'currency':
      formattedValue = formatCurrency(Math.abs(change), currency, {
        compact: true,
        showSymbol: true,
      });
      break;
    case 'percentage':
      formattedValue = formatPercentage(Math.abs(change), { precision: 1 });
      break;
    default:
      formattedValue = formatNumber(Math.abs(change), { compact: true });
  }

  const sign = showSign ? (change >= 0 ? '+' : '-') : '';
  const formattedPercentage = formatPercentage(Math.abs(percentChange), {
    precision: 1,
    showSign: showSign && change !== 0,
  });

  return {
    value: `${sign}${formattedValue}`,
    percentage: showPercentage ? `(${change >= 0 ? '+' : '-'}${formattedPercentage})` : '',
    isPositive: change > 0,
    isNeutral: change === 0,
  };
};

/**
 * Format API response time
 */
export const formatResponseTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }
  return `${(milliseconds / 1000).toFixed(2)}s`;
};

/**
 * Format error rate
 */
export const formatErrorRate = (
  errors: number,
  total: number,
  options?: { precision?: number }
): string => {
  const { precision = 2 } = options || {};

  if (total === 0) {
    return '0%';
  }

  const rate = (errors / total) * 100;
  return `${rate.toFixed(precision)}%`;
};

/**
 * Format uptime
 */
export const formatUptime = (uptimeSeconds: number): string => {
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format bandwidth
 */
export const formatBandwidth = (bytesPerSecond: number): string => {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let value = bytesPerSecond;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Utility function to get appropriate color for metrics
 */
export const getMetricColor = (
  trend: 'up' | 'down' | 'stable',
  isGoodWhenUp: boolean = true,
  colors: any
): string => {
  if (trend === 'stable') {
    return colors.warning;
  }

  if (isGoodWhenUp) {
    return trend === 'up' ? colors.success : colors.error;
  } else {
    return trend === 'up' ? colors.error : colors.success;
  }
};

/**
 * Format social media numbers (followers, likes, etc.)
 */
export const formatSocialCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

/**
 * Format latitude/longitude coordinates
 */
export const formatCoordinates = (
  lat: number,
  lng: number,
  precision: number = 4
): string => {
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lngDirection = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(precision)}°${latDirection}, ${Math.abs(lng).toFixed(precision)}°${lngDirection}`;
};

/**
 * Format version numbers
 */
export const formatVersion = (version: string): string => {
  // Ensure semantic versioning format
  const parts = version.split('.');
  while (parts.length < 3) {
    parts.push('0');
  }
  return parts.slice(0, 3).join('.');
};