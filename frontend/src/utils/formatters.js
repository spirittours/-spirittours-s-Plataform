/**
 * Data Formatting Utilities
 * Common formatting functions for analytics dashboard display.
 */

/**
 * Format currency values
 * @param {number} value - The currency value to format
 * @param {string} currency - Currency code (default: EUR)
 * @param {string} locale - Locale for formatting (default: es-ES)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'EUR', locale = 'es-ES') => {
  if (value === null || value === undefined) return '€0.00';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency} ${value.toFixed(2)}`;
  }
};

/**
 * Format percentage values
 * @param {number} value - The percentage value to format (0-100 scale)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0.0%';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(decimals)}%`;
};

/**
 * Format large numbers with appropriate suffixes
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (numValue >= 1000000000) {
    return `${(numValue / 1000000000).toFixed(decimals)}B`;
  } else if (numValue >= 1000000) {
    return `${(numValue / 1000000).toFixed(decimals)}M`;
  } else if (numValue >= 1000) {
    return `${(numValue / 1000).toFixed(decimals)}K`;
  } else if (numValue < 1 && numValue > 0) {
    return numValue.toFixed(decimals + 1);
  } else {
    return Math.round(numValue).toString();
  }
};

/**
 * Format date for display
 * @param {string|Date} date - The date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat('es-ES', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateObj.toLocaleDateString();
  }
};

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format metric change with trend indication
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @param {string} format - Format type: 'number', 'currency', 'percentage'
 * @returns {object} Formatted change object
 */
export const formatMetricChange = (current, previous, format = 'number') => {
  if (previous === null || previous === undefined || previous === 0) {
    return {
      value: current,
      change: null,
      changePercent: null,
      trend: 'neutral',
      formattedValue: formatByType(current, format),
      formattedChange: null
    };
  }
  
  const change = current - previous;
  const changePercent = (change / previous) * 100;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  
  return {
    value: current,
    change,
    changePercent,
    trend,
    formattedValue: formatByType(current, format),
    formattedChange: formatByType(Math.abs(change), format),
    formattedChangePercent: formatPercentage(Math.abs(changePercent))
  };
};

/**
 * Format value by type
 * @param {number} value - Value to format
 * @param {string} type - Format type
 * @returns {string} Formatted value
 */
const formatByType = (value, type) => {
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'number':
    default:
      return formatNumber(value);
  }
};

/**
 * Format analytics time period
 * @param {string} timeFrame - Time frame (hour, day, week, month, quarter, year)
 * @returns {string} Human-readable time period
 */
export const formatTimePeriod = (timeFrame) => {
  const periods = {
    hour: 'Última hora',
    day: 'Último día',
    week: 'Última semana',
    month: 'Último mes',
    quarter: 'Último trimestre',
    year: 'Último año'
  };
  
  return periods[timeFrame] || timeFrame;
};

/**
 * Create color palette for charts
 * @param {number} count - Number of colors needed
 * @returns {array} Array of color codes
 */
export const createColorPalette = (count) => {
  const baseColors = [
    '#1976d2', '#dc004e', '#2e7d32', '#ed6c02',
    '#0288d1', '#7b1fa2', '#d32f2f', '#388e3c',
    '#f57c00', '#5d4037', '#455a64', '#e91e63'
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...baseColors];
  while (colors.length < count) {
    const hue = (360 / count) * colors.length;
    colors.push(`hsl(${hue}, 65%, 50%)`);
  }
  
  return colors;
};

/**
 * Format response time
 * @param {number} ms - Response time in milliseconds
 * @returns {string} Formatted response time
 */
export const formatResponseTime = (ms) => {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${(ms / 60000).toFixed(1)}m`;
  }
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 50) => {
  if (!text || text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};